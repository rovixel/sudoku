import { describe, expect, it } from 'vitest';
import { countSolutions, generatePuzzle, randomSolution } from './generator';
import { BOX_CELLS, COL_CELLS, DIFFICULTIES, DIFFICULTY_ORDER, ROW_CELLS, boxOf } from './rules';

const isValidSolution = (g: number[]) =>
  [ROW_CELLS, COL_CELLS, BOX_CELLS].every((unit) =>
    Array.from({ length: 9 }, (_, k) => new Set(unit(k).map((i) => g[i])).size === 9),
  );

describe('generator', () => {
  it('builds valid full solutions', () => {
    for (let n = 0; n < 20; n++) expect(isValidSolution(randomSolution())).toBe(true);
  });

  for (const d of DIFFICULTY_ORDER) {
    it(`${d}: unique solution, givens in range, min per box`, () => {
      const rule = DIFFICULTIES[d];
      for (let n = 0; n < 5; n++) {
        const { puzzle, solution } = generatePuzzle(d);
        const givens = puzzle.filter(Boolean).length;
        expect(givens).toBeGreaterThanOrEqual(rule.givens[0]);
        expect(givens).toBeLessThanOrEqual(rule.givens[1]);
        expect(countSolutions(puzzle.slice())).toBe(1);
        puzzle.forEach((v, i) => v && expect(v).toBe(solution[i]));
        const perBox = new Array(9).fill(0);
        puzzle.forEach((v, i) => v && perBox[boxOf(i)]++);
        expect(Math.min(...perBox)).toBeGreaterThanOrEqual(rule.minInBox);
      }
    });
  }
});
