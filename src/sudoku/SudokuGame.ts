import { generatePuzzle, type Grid } from './generator';
import {
  BOX_CELLS, COL_CELLS, DIFFICULTIES, type Difficulty, HINTS_PER_GAME, PEERS, ROW_CELLS, boxOf, colOf, rowOf,
} from './rules';

export type Status = 'playing' | 'won' | 'lost';

export interface CompletedUnits {
  row?: number;
  col?: number;
  box?: number;
}

export type MoveResult =
  | { kind: 'noop' }
  | { kind: 'note' }
  | { kind: 'erase' }
  | { kind: 'wrong'; lost: boolean }
  | { kind: 'correct'; points: number; completed: CompletedUnits; won: boolean };

interface HistoryEntry {
  cell: number;
  value: number;
  notes: number;
  /** Peer notes cleared as a side-effect of a correct entry. */
  peerNotes: [number, number][];
}

export interface SavedGame {
  difficulty: Difficulty;
  puzzle: Grid;
  solution: Grid;
  values: Grid;
  notes: number[];
  mistakes: number;
  score: number;
  elapsed: number;
  lastScoredAt: number;
  hintsLeft: number;
  scored: number[];
  history: HistoryEntry[];
  usedSecondChance?: boolean;
}

/** Pure Sudoku game state — no Phaser here so it can be unit-tested. */
export class SudokuGame {
  status: Status = 'playing';

  private constructor(private s: SavedGame) {
    this.status = this.computeStatus();
  }

  static create(difficulty: Difficulty, rng?: () => number): SudokuGame {
    const { puzzle, solution } = generatePuzzle(difficulty, rng);
    return new SudokuGame({
      difficulty, puzzle, solution, values: puzzle.slice(), notes: new Array(81).fill(0),
      mistakes: 0, score: 0, elapsed: 0, lastScoredAt: 0, hintsLeft: HINTS_PER_GAME, scored: [], history: [],
    });
  }

  static restore(saved: SavedGame): SudokuGame {
    return new SudokuGame(structuredClone(saved));
  }

  serialize(): SavedGame {
    return structuredClone(this.s);
  }

  get difficulty() { return this.s.difficulty; }
  get rule() { return DIFFICULTIES[this.s.difficulty]; }
  get mistakes() { return this.s.mistakes; }
  get score() { return this.s.score; }
  get elapsed() { return this.s.elapsed; }
  get hintsLeft() { return this.s.hintsLeft; }
  get canUndo() { return this.s.history.length > 0; }

  value(i: number) { return this.s.values[i]; }
  notes(i: number) { return this.s.notes[i]; }
  isGiven(i: number) { return this.s.puzzle[i] !== 0; }
  isWrong(i: number) { return this.s.values[i] !== 0 && this.s.values[i] !== this.s.solution[i]; }
  /** Given or correctly filled — locked against edits. */
  isLocked(i: number) { return this.s.values[i] !== 0 && this.s.values[i] === this.s.solution[i]; }

  /** How many cells correctly hold digit d (for dimming finished numpad keys). */
  placedCount(d: number) {
    let n = 0;
    for (let i = 0; i < 81; i++) if (this.s.values[i] === d && this.s.solution[i] === d) n++;
    return n;
  }

  tick(dt: number) {
    if (this.status === 'playing') this.s.elapsed += dt;
  }

  enter(i: number, d: number, notesMode: boolean): MoveResult {
    if (this.status !== 'playing' || this.isLocked(i)) return { kind: 'noop' };

    if (notesMode) {
      if (this.s.values[i] !== 0) return { kind: 'noop' };
      this.push(i);
      this.s.notes[i] ^= 1 << d;
      return { kind: 'note' };
    }

    if (this.s.values[i] === d) return { kind: 'noop' };
    const entry = this.push(i);
    this.s.values[i] = d;
    this.s.notes[i] = 0;

    if (d !== this.s.solution[i]) {
      this.s.mistakes++;
      const lost = this.s.mistakes >= this.rule.maxMistakes;
      if (lost) this.status = 'lost';
      return { kind: 'wrong', lost };
    }
    return this.placeCorrect(i, entry, true);
  }

  erase(i: number): MoveResult {
    if (this.status !== 'playing' || this.isLocked(i)) return { kind: 'noop' };
    if (this.s.values[i] === 0 && this.s.notes[i] === 0) return { kind: 'noop' };
    this.push(i);
    this.s.values[i] = 0;
    this.s.notes[i] = 0;
    return { kind: 'erase' };
  }

  /** Reveals the selected cell, or a random unsolved one. Returns the cell revealed. */
  hint(selected: number, rng: () => number = Math.random): { cell: number; result: MoveResult } | undefined {
    if (this.status !== 'playing' || this.s.hintsLeft <= 0) return undefined;
    let cell = selected;
    if (cell < 0 || this.isLocked(cell)) {
      const open = [...Array(81).keys()].filter((k) => !this.isLocked(k));
      if (!open.length) return undefined;
      cell = open[Math.floor(rng() * open.length)];
    }
    this.s.hintsLeft--;
    this.s.values[cell] = this.s.solution[cell];
    this.s.notes[cell] = 0;
    // Hinted cells score nothing and aren't undoable; drop stale history for this cell.
    this.s.history = this.s.history.filter((h) => h.cell !== cell);
    return { cell, result: this.placeCorrect(cell, undefined, false) };
  }

  undo(): number | undefined {
    if (this.status !== 'playing') return undefined;
    const h = this.s.history.pop();
    if (!h) return undefined;
    this.s.values[h.cell] = h.value;
    this.s.notes[h.cell] = h.notes;
    for (const [p, mask] of h.peerNotes) this.s.notes[p] = mask;
    return h.cell;
  }

  /** After losing: allow one more mistake and keep playing. Usable once per game. */
  secondChance(): boolean {
    if (this.status !== 'lost' || this.s.usedSecondChance) return false;
    this.s.usedSecondChance = true;
    this.s.mistakes = this.rule.maxMistakes - 1;
    this.status = 'playing';
    return true;
  }

  get canSecondChance() {
    return this.status === 'lost' && !this.s.usedSecondChance;
  }

  /** Same puzzle from scratch. */
  restart(): SudokuGame {
    const { difficulty, puzzle, solution } = this.s;
    return new SudokuGame({
      difficulty, puzzle, solution, values: puzzle.slice(), notes: new Array(81).fill(0),
      mistakes: 0, score: 0, elapsed: 0, lastScoredAt: 0, hintsLeft: HINTS_PER_GAME, scored: [], history: [],
    });
  }

  private push(i: number): HistoryEntry {
    const entry: HistoryEntry = { cell: i, value: this.s.values[i], notes: this.s.notes[i], peerNotes: [] };
    this.s.history.push(entry);
    if (this.s.history.length > 200) this.s.history.shift();
    return entry;
  }

  private placeCorrect(i: number, entry: HistoryEntry | undefined, award: boolean): MoveResult {
    const d = this.s.solution[i];
    const bit = 1 << d;
    for (const p of PEERS[i]) {
      if (this.s.notes[p] & bit) {
        entry?.peerNotes.push([p, this.s.notes[p]]);
        this.s.notes[p] &= ~bit;
      }
    }

    let points = 0;
    if (award && !this.s.scored.includes(i)) {
      const { base, min, penaltyPerSec } = this.rule.score;
      points = Math.max(min, Math.round(base + penaltyPerSec * (this.s.elapsed - this.s.lastScoredAt)));
      this.s.score += points;
      this.s.lastScoredAt = this.s.elapsed;
      this.s.scored.push(i);
    }

    const done = (cells: number[]) => cells.every((c) => this.isLocked(c));
    const completed: CompletedUnits = {};
    if (done(ROW_CELLS(rowOf(i)))) completed.row = rowOf(i);
    if (done(COL_CELLS(colOf(i)))) completed.col = colOf(i);
    if (done(BOX_CELLS(boxOf(i)))) completed.box = boxOf(i);

    const won = this.computeStatus() === 'won';
    if (won) this.status = 'won';
    return { kind: 'correct', points, completed, won };
  }

  private computeStatus(): Status {
    if (this.s.mistakes >= this.rule.maxMistakes) return 'lost';
    for (let i = 0; i < 81; i++) if (this.s.values[i] !== this.s.solution[i]) return 'playing';
    return 'won';
  }
}
