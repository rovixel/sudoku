import { describe, expect, it } from 'vitest';
import { parseStartDifficulty } from './startOptions';

describe('parseStartDifficulty', () => {
  it('accepts the four difficulties', () => {
    expect(parseStartDifficulty('?difficulty=easy')).toBe('easy');
    expect(parseStartDifficulty('?difficulty=medium')).toBe('medium');
    expect(parseStartDifficulty('?lang=en&difficulty=hard')).toBe('hard');
    expect(parseStartDifficulty('?difficulty=expert')).toBe('expert');
  });

  it('ignores missing or unknown values', () => {
    expect(parseStartDifficulty('')).toBeNull();
    expect(parseStartDifficulty('?lang=zh')).toBeNull();
    expect(parseStartDifficulty('?difficulty=evil')).toBeNull();
    expect(parseStartDifficulty('?difficulty=HARD')).toBeNull();
  });
});
