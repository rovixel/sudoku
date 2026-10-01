import { DIFFICULTIES, type Difficulty, PEERS, boxOf } from './rules';

/** Grid of 81 digits, 0 = empty. */
export type Grid = number[];

export interface Puzzle {
  puzzle: Grid;
  solution: Grid;
}

type Rng = () => number;

function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const bitCount = (m: number) => {
  let n = 0;
  for (; m; m &= m - 1) n++;
  return n;
};

/** Bitmask (bit d set ⇒ digit d allowed) of candidates for cell i. */
function candidates(grid: Grid, i: number): number {
  let used = 0;
  for (const p of PEERS[i]) used |= 1 << grid[p];
  return ~used & 0b1111111110;
}

/**
 * Counts solutions up to `limit`, solving in place (grid is restored).
 * Picks the most constrained empty cell each step, which keeps this fast enough
 * for uniqueness checks during generation.
 */
export function countSolutions(grid: Grid, limit = 2): number {
  let best = -1;
  let bestMask = 0;
  let bestCount = 10;
  for (let i = 0; i < 81; i++) {
    if (grid[i]) continue;
    const mask = candidates(grid, i);
    const n = bitCount(mask);
    if (n === 0) return 0;
    if (n < bestCount) {
      best = i;
      bestMask = mask;
      bestCount = n;
      if (n === 1) break;
    }
  }
  if (best < 0) return 1;

  let total = 0;
  for (let d = 1; d <= 9 && total < limit; d++) {
    if (!(bestMask & (1 << d))) continue;
    grid[best] = d;
    total += countSolutions(grid, limit - total);
  }
  grid[best] = 0;
  return total;
}

function fillRandom(grid: Grid, rng: Rng): boolean {
  const i = grid.indexOf(0);
  if (i < 0) return true;
  const mask = candidates(grid, i);
  for (const d of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)) {
    if (!(mask & (1 << d))) continue;
    grid[i] = d;
    if (fillRandom(grid, rng)) return true;
  }
  grid[i] = 0;
  return false;
}

export function randomSolution(rng: Rng = Math.random): Grid {
  const grid: Grid = new Array(81).fill(0);
  fillRandom(grid, rng);
  return grid;
}

/**
 * Generates a puzzle with a unique solution and a given count inside the
 * difficulty's range, keeping at least `minInBox` givens per 3×3 box.
 */
export function generatePuzzle(difficulty: Difficulty, rng: Rng = Math.random): Puzzle {
  const rule = DIFFICULTIES[difficulty];
  const [lo, hi] = rule.givens;
  let fallback: Puzzle | undefined;
  let fallbackGivens = 82;

  for (let attempt = 0; attempt < 30; attempt++) {
    const solution = randomSolution(rng);
    const target = lo + Math.floor(rng() * (hi - lo + 1));
    const puzzle = solution.slice();
    const perBox = new Array(9).fill(9);
    let givens = 81;

    for (const i of shuffle(Array.from({ length: 81 }, (_, k) => k), rng)) {
      if (givens <= target) break;
      if (perBox[boxOf(i)] <= rule.minInBox) continue;
      const keep = puzzle[i];
      puzzle[i] = 0;
      if (countSolutions(puzzle.slice()) !== 1) {
        puzzle[i] = keep;
        continue;
      }
      perBox[boxOf(i)]--;
      givens--;
    }

    if (givens <= hi) return { puzzle, solution };
    if (givens < fallbackGivens) {
      fallback = { puzzle, solution };
      fallbackGivens = givens;
    }
  }
  // Extremely unlikely: return the closest attempt rather than failing.
  return fallback!;
}
