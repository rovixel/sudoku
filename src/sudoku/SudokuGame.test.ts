import { describe, expect, it } from 'vitest';
import { SudokuGame } from './SudokuGame';
import { PEERS } from './rules';

function setup() {
  const g = SudokuGame.create('easy');
  const s = g.serialize();
  const empty = s.puzzle.findIndex((v) => v === 0);
  const answer = s.solution[empty];
  const wrong = answer === 9 ? 1 : answer + 1;
  return { g, s, empty, answer, wrong };
}

describe('SudokuGame', () => {
  it('scores correct entries and locks them', () => {
    const { g, empty, answer } = setup();
    const r = g.enter(empty, answer, false);
    expect(r.kind).toBe('correct');
    expect(g.score).toBe(10);
    expect(g.isLocked(empty)).toBe(true);
    expect(g.enter(empty, 1, false).kind).toBe('noop');
  });

  it('counts mistakes and loses at the limit', () => {
    const { g, empty, wrong } = setup();
    g.enter(empty, wrong, false);
    expect(g.isWrong(empty)).toBe(true);
    g.erase(empty);
    g.enter(empty, wrong, false);
    g.erase(empty);
    const r = g.enter(empty, wrong, false);
    expect(r).toEqual({ kind: 'wrong', lost: true });
    expect(g.status).toBe('lost');
  });

  it('applies time penalty with a floor', () => {
    const { g, empty, answer } = setup();
    g.tick(1000);
    g.enter(empty, answer, false);
    expect(g.score).toBe(2);
  });

  it('notes toggle, are cleared from peers on a correct entry, and undo restores them', () => {
    const { g, empty, answer } = setup();
    const peer = PEERS[empty].find((p) => !g.isGiven(p))!;
    g.enter(peer, answer, true);
    expect(g.notes(peer) & (1 << answer)).toBeTruthy();
    g.enter(empty, answer, false);
    expect(g.notes(peer) & (1 << answer)).toBe(0);
    expect(g.undo()).toBe(empty);
    expect(g.value(empty)).toBe(0);
    expect(g.notes(peer) & (1 << answer)).toBeTruthy();
  });

  it('does not re-award points after undo + re-entry', () => {
    const { g, empty, answer } = setup();
    g.enter(empty, answer, false);
    g.undo();
    g.enter(empty, answer, false);
    expect(g.score).toBe(10);
  });

  it('hint fills a cell without points and wins when the board is complete', () => {
    const { g } = setup();
    let last;
    while (g.hintsLeft > 0) last = g.hint(-1);
    expect(last?.result.kind).toBe('correct');
    expect(g.score).toBe(0);
    expect(g.hint(-1)).toBeUndefined();

    const s = g.serialize();
    for (let i = 0; i < 81; i++) if (!g.isLocked(i)) g.enter(i, s.solution[i], false);
    expect(g.status).toBe('won');
  });

  it('round-trips through serialize/restore', () => {
    const { g, empty, wrong } = setup();
    g.enter(empty, wrong, false);
    const r = SudokuGame.restore(g.serialize());
    expect(r.mistakes).toBe(1);
    expect(r.value(empty)).toBe(wrong);
  });
});

describe('SudokuGame recovery', () => {
  it('second chance works once', () => {
    const { g, empty, wrong } = setup();
    for (let k = 0; k < 3; k++) {
      g.erase(empty);
      g.enter(empty, wrong, false);
    }
    expect(g.status).toBe('lost');
    expect(g.secondChance()).toBe(true);
    expect(g.status).toBe('playing');
    expect(g.mistakes).toBe(2);
    g.erase(empty);
    g.enter(empty, wrong, false);
    expect(g.status).toBe('lost');
    expect(g.secondChance()).toBe(false);
  });

  it('restart resets progress on the same puzzle', () => {
    const { g, s, empty, answer } = setup();
    g.enter(empty, answer, false);
    const r = g.restart();
    expect(r.value(empty)).toBe(0);
    expect(r.score).toBe(0);
    expect(r.serialize().solution).toEqual(s.solution);
  });
});
