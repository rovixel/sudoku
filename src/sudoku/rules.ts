// Game-design numbers, mirroring the reference game's config.json.

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface DifficultyRule {
  /** Range of pre-filled cells (inclusive). */
  givens: [number, number];
  /** Every 3×3 box keeps at least this many givens. */
  minInBox: number;
  maxMistakes: number;
  score: { base: number; min: number; penaltyPerSec: number };
}

export const DIFFICULTIES: Record<Difficulty, DifficultyRule> = {
  easy: { givens: [43, 46], minInBox: 3, maxMistakes: 3, score: { base: 10, min: 2, penaltyPerSec: -0.1 } },
  medium: { givens: [36, 37], minInBox: 2, maxMistakes: 3, score: { base: 15, min: 3, penaltyPerSec: -0.1 } },
  hard: { givens: [30, 34], minInBox: 2, maxMistakes: 3, score: { base: 20, min: 4, penaltyPerSec: -0.1 } },
  expert: { givens: [25, 28], minInBox: 1, maxMistakes: 3, score: { base: 25, min: 5, penaltyPerSec: -0.1 } },
};

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

export const HINTS_PER_GAME = 3;

export const rowOf = (i: number) => Math.floor(i / 9);
export const colOf = (i: number) => i % 9;
export const boxOf = (i: number) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

/** Indices of the 20 cells sharing a row, column or box with `i`. */
export const PEERS: number[][] = Array.from({ length: 81 }, (_, i) => {
  const peers: number[] = [];
  for (let j = 0; j < 81; j++) {
    if (j !== i && (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i))) peers.push(j);
  }
  return peers;
});

export const ROW_CELLS = (r: number) => Array.from({ length: 9 }, (_, c) => r * 9 + c);
export const COL_CELLS = (c: number) => Array.from({ length: 9 }, (_, r) => r * 9 + c);
export const BOX_CELLS = (b: number) =>
  Array.from({ length: 9 }, (_, k) => (Math.floor(b / 3) * 3 + Math.floor(k / 3)) * 9 + (b % 3) * 3 + (k % 3));
