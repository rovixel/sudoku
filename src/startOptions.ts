import { DIFFICULTY_ORDER, type Difficulty } from './sudoku/rules';

/**
 * The host site can open the game straight into a new puzzle with
 * ?difficulty=easy|medium|hard|expert (e.g. a "hard sudoku" page). Anything
 * else, including no parameter, shows the menu as usual.
 */
export function parseStartDifficulty(search: string): Difficulty | null {
  try {
    const value = new URLSearchParams(search).get('difficulty');
    return value && (DIFFICULTY_ORDER as string[]).includes(value) ? (value as Difficulty) : null;
  } catch {
    return null;
  }
}

let consumed = false;

/**
 * The difficulty to start with on the first visit to the menu, or null. It is
 * used once per page load, so going back to the menu later shows the menu.
 */
export function takeStartDifficulty(): Difficulty | null {
  if (consumed) return null;
  consumed = true;
  return typeof location === 'undefined' ? null : parseStartDifficulty(location.search);
}
