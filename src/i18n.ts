import { Storage } from './storage';

export type Lang = 'en' | 'zh';

const en = {
  title: 'Sudoku',
  tagline: 'Fill the grid, one square at a time',
  continueGame: 'Continue',
  newGame: 'New Game',
  lastGame: 'Last game',
  points: 'pts',
  bestScores: 'Best scores',
  chooseDifficulty: 'Choose difficulty',
  givens: (lo: number, hi: number) => `${lo}–${hi} given numbers`,
  best: (n: string) => `Best ${n}`,
  notPlayed: 'Not solved yet',
  lastPlayed: 'last played',
  rulesFooter: '3 hints per game · 3 mistakes and it’s over',
  difficulty: { easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert' },
  mistakes: 'Mistakes',
  score: 'Score',
  time: 'Time',
  undo: 'Undo',
  erase: 'Erase',
  notes: 'Notes',
  hint: 'Hint',
  on: 'ON',
  off: 'OFF',
  paused: 'Paused',
  resume: 'Resume',
  restart: 'Restart',
  home: 'Home',
  gameOver: 'Game over',
  outOfMistakes: (n: number) => `You made ${n} mistakes`,
  secondChance: 'One more chance',
  solved: 'Solved!',
  newRecord: 'NEW BEST',
  previousBest: (n: string) => `Previous best ${n}`,
  playAgain: 'Play again',
  howToPlay: 'How to play',
  help: [
    'Fill every empty square with 1–9 so that',
    'each row, column and 3×3 box contains',
    'every digit exactly once.',
    '',
    '• Tap a square, then tap a number',
    '• Notes: pencil in candidates',
    '• Undo / Erase: fix wrong entries',
    '• Hint: reveals a square (3 per game)',
    '• 3 mistakes ends the game',
    '• Faster answers score more points',
  ].join('\n'),
  language: 'Language',
};

const zh: typeof en = {
  title: '数独',
  tagline: '填满九宫，一格一格来',
  continueGame: '继续游戏',
  newGame: '新游戏',
  lastGame: '上一局',
  points: '分',
  bestScores: '各难度最高分',
  chooseDifficulty: '选择难度',
  givens: (lo, hi) => `${lo}–${hi} 个已知数字`,
  best: (n) => `最高 ${n}`,
  notPlayed: '未完成',
  lastPlayed: '上次玩的',
  rulesFooter: '每局可用 3 次提示 · 错 3 次结束',
  difficulty: { easy: '简单', medium: '中等', hard: '困难', expert: '专家' },
  mistakes: '错误',
  score: '得分',
  time: '时间',
  undo: '撤销',
  erase: '擦除',
  notes: '笔记',
  hint: '提示',
  on: '开',
  off: '关',
  paused: '暂停',
  resume: '继续',
  restart: '重新开始',
  home: '返回首页',
  gameOver: '游戏结束',
  outOfMistakes: (n) => `已经错了 ${n} 次`,
  secondChance: '再给一次机会',
  solved: '完成啦！',
  newRecord: '新纪录',
  previousBest: (n) => `之前的最高分 ${n}`,
  playAgain: '再来一局',
  howToPlay: '玩法说明',
  help: [
    '在每个空格中填入 1–9，',
    '使每一行、每一列和每个 3×3 宫',
    '都恰好包含 1–9 各一次。',
    '',
    '• 先点格子，再点数字填入',
    '• 笔记模式：记下候选数字',
    '• 撤销 / 擦除：修改填错的数字',
    '• 提示：直接揭示答案（每局 3 次）',
    '• 错 3 次游戏结束',
    '• 填得越快，每格得分越高',
  ].join('\n'),
  language: '语言',
};

const TABLES: Record<Lang, typeof en> = { en, zh };

function initialLang(): Lang {
  // The host site can pick the language with ?lang=zh / ?lang=en; a player's own choice wins after that.
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'zh' || q === 'en') return Storage.get<Lang | null>('lang', null) ?? q;
  } catch {
    // ignore
  }
  return Storage.get<Lang>('lang', 'en');
}

let lang: Lang = initialLang();

export const t = () => TABLES[lang];
export const getLang = () => lang;

/** `remember` is for the player's own choice; applying the starting language must not save it, or ?lang= would stop working. */
export function setLang(next: Lang, remember = true) {
  lang = next;
  if (remember) Storage.set('lang', next);
  document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en';
  document.title = TABLES[next].title;
}

/** 1,240 in both languages. */
export const fmtNum = (n: number) => n.toLocaleString('en-US');
