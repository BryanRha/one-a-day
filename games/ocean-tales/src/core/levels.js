// 레벨 데이터. 문자 규칙은 engine.js 상단 주석 참고.
// stars / moves 는 tools/tune.js 가 봇 시뮬레이션으로 계산한 levels_tuning.js 값을 덮어쓴다.
import { TUNING } from './levels_tuning.js?v=0.47.3';
import { MORE } from './levels_more.js?v=0.47.3';
import { GEN } from './levels_gen.js?v=0.47.3';
import { shapeLevel } from './levels_shapes.js?v=0.47.3';

const fill = (w, h, ch = '.') => Array.from({ length: h }, () => ch.repeat(w));

const RAW = [
  // ═══ 월드 1 · 산호초 마을 ═══════════════════════════════════
  { id: 1, moves: 18, colors: 4, layout: fill(7, 7), goals: [{ type: 'collect', color: 'red', count: 15 }],
    tutorial: { key: 'swap', hand: true } },
  { id: 2, moves: 18, colors: 4, layout: fill(8, 8), goals: [{ type: 'collect', color: 'orange', count: 20 }, { type: 'collect', color: 'green', count: 20 }],
    tutorial: { key: 'line' } },
  { id: 3, moves: 20, colors: 5, layout: fill(8, 8), goals: [{ type: 'jelly' }],
    jelly: ['00000000', '00000000', '00111100', '00111100', '00111100', '00111100', '00000000', '00000000'],
    tutorial: { key: 'jelly' } },
  { id: 4, moves: 22, colors: 5, layout: fill(8, 8), goals: [{ type: 'collect', color: 'red', count: 30 }, { type: 'collect', color: 'blue', count: 30 }],
    tutorial: { key: 'bomb' } },
  { id: 5, moves: 24, colors: 5, layout: fill(8, 8), goals: [{ type: 'jelly' }], jelly: ['00000000', '00000000', '01111110', '01111110', '01111110', '01111110', '00000000', '00000000'] },
  { id: 6, moves: 20, colors: 5, layout: fill(8, 8), goals: [{ type: 'drop', count: 2 }],
    pieces: ['...A....', ...fill(8, 7)], dropSpawn: { chance: 0.15, maxOnBoard: 1 }, tutorial: { key: 'drop' } },
  { id: 7, moves: 22, colors: 5, layout: fill(8, 8), goals: [{ type: 'cover' }],
    cover: ['........', '........', '..iiii..', '..i..i..', '..i..i..', '..iiii..', '........', '........'], tutorial: { key: 'ice' } },
  { id: 8, moves: 26, colors: 5, goals: [{ type: 'jelly' }],
    layout: ['#..##..#', '........', '........', '........', '........', '........', '#......#', '##....##'],
    jelly: ['00000000', '00000000', '01111110', '01111110', '01111110', '01111110', '00000000', '00000000'] },
  { id: 9, moves: 24, colors: 5, layout: fill(8, 8), goals: [{ type: 'cover' }],
    cover: ['........', '.k....k.', '........', '...kk...', '...kk...', '........', '.k....k.', '........'], tutorial: { key: 'chain' } },
  { id: 10, moves: 28, colors: 5, goals: [{ type: 'jelly' }, { type: 'drop', count: 2 }],
    layout: fill(9, 9), jelly: ['000000000', '000000000', '110000011', '110000011', '110000011', '110000011', '111222111', '111222111', '111111111'],
    pieces: ['....A....', ...fill(9, 8)], boss: true },

  // ═══ 월드 2 · 해초 숲 ═══════════════════════════════════
  { id: 11, moves: 22, colors: 5, layout: fill(8, 8), goals: [{ type: 'clear', what: 'stone' }],
    pieces: ['........', '........', '........', '........', '........', '.222222.', '........', '........'], tutorial: { key: 'stone' } },
  { id: 12, moves: 24, colors: 5, layout: fill(8, 8), goals: [{ type: 'clear', what: 'crate' }, { type: 'jelly' }],
    pieces: ['........', '........', '........', 'BB....BB', 'BB....BB', '........', '........', '........'],
    jelly: ['00000000', '00000000', '00000000', '00111100', '00111100', '00000000', '00000000', '00000000'] },
  { id: 13, moves: 24, colors: 5, layout: fill(8, 8), goals: [{ type: 'clear', what: 'slime' }],
    pieces: ['........', '........', '........', '........', '........', '........', '........', '..m..m..'], tutorial: { key: 'slime' } },
  { id: 14, moves: 26, colors: 5, layout: fill(8, 8), goals: [{ type: 'drop', count: 2 }],
    pieces: ['...A....', '........', '........', '........', '1......1', '........', '........', '........'], dropSpawn: { chance: 0.3, maxOnBoard: 1 } },
  { id: 15, moves: 22, colors: 5, layout: fill(8, 8), goals: [{ type: 'star', count: 16 }],
    pieces: ['*......*', '.*....*.', '..*..*..', '...**...', '...**...', '..*..*..', '.*....*.', '*......*'], tutorial: { key: 'star' } },
  { id: 16, moves: 26, colors: 5, layout: fill(8, 8), goals: [{ type: 'jelly' }, { type: 'cover' }],
    jelly: ['00000000', '00000000', '00111100', '00111100', '00111100', '00111100', '00000000', '00000000'], cover: ['........', '........', '..i..i..', '........', '........', '..i..i..', '........', '........'] },
  { id: 17, moves: 28, colors: 5, layout: fill(9, 9), goals: [{ type: 'clear', what: 'slime' }],
    pieces: ['.........', '.........', '.........', '.........', '.........', '.........', '.........', '.........', 'm...m...m'] },
  { id: 18, moves: 28, colors: 5, goals: [{ type: 'drop', count: 2 }],
    layout: ['..#####..', '...###...', '.........', '.........', '.........', '.........', '.........', '...###...', '..#####..'],
    pieces: ['.........', '.........', '....A....', ...fill(9, 6)], dropSpawn: { chance: 0.35, maxOnBoard: 1 } },
  { id: 19, moves: 28, colors: 5, layout: fill(9, 9), goals: [{ type: 'clear', what: 'stone' }, { type: 'clear', what: 'crate' }],
    pieces: ['.........', '.........', '.........', '.........', '2B.....B2', '.........', '2.bbbbb.2', '.........', '.........'] },
  { id: 20, moves: 32, colors: 5, layout: fill(9, 9), goals: [{ type: 'jelly' }, { type: 'clear', what: 'slime' }],
    jelly: ['000000000', '000000000', '001111100', '001111100', '001111100', '001111100', '001111100', '000000000', '000000000'], pieces: ['.........', '.........', '.........', '.........', '.........', '.........', '.........', '.........', 'm...m...m'], boss: true },

  // ═══ 월드 3 · 깊은 바다 ═════════════════════════════
  { id: 21, moves: 24, colors: 5, layout: fill(8, 8), goals: [{ type: 'collect', color: 'blue', count: 25 }], timerSpawn: 0.04, timerMoves: 9,
    pieces: ['........', '........', '...T....', '........', '........', '........', '........', '........'], tutorial: { key: 'timer' } },
  { id: 22, moves: 24, colors: 6, layout: fill(8, 8), goals: [{ type: 'cover' }],
    cover: ['q......q', '........', '..qqqq..', '..q..q..', '..q..q..', '..qqqq..', '........', 'q......q'], tutorial: { key: 'bubble' } },
  { id: 23, moves: 26, colors: 6, layout: fill(8, 9), goals: [{ type: 'collect', color: 'yellow', count: 25 }, { type: 'collect', color: 'purple', count: 25 }],
    cover: ['........', '........', '........', 'kkkkkkkk', '........', 'kkkkkkkk', '........', '........', '........'] },
  { id: 24, moves: 28, colors: 5, goals: [{ type: 'jelly' }],
    layout: ['...#...', '..###..', '.......', '.......', '.......', '.......', '.......', '.......', '.......'].map(r => '#' + r + '#'),
    jelly: ['000000000', '000000000', '001111100', '011111110', '011121110', '011121110', '011111110', '001111100', '000000000'] },
  { id: 25, moves: 26, colors: 5, layout: fill(8, 9), goals: [{ type: 'drop', count: 3 }, { type: 'clear', what: 'crate' }],
    pieces: ['..A..Z..', '........', '........', 'BBB..BBB', '........', '........', '........', '........', '........'] },
  { id: 26, moves: 26, colors: 5, layout: fill(8, 8), goals: [{ type: 'star', count: 8 }, { type: 'cover' }],
    pieces: ['........', '........', '..*..*..', '........', '........', '..*..*..', '........', '........'],
    cover: ['........', '.q....q.', '........', '........', '........', '........', '.q....q.', '........'] },
  { id: 27, moves: 30, colors: 5, layout: fill(9, 9), goals: [{ type: 'jelly' }, { type: 'collect', color: 'red', count: 25 }], timerSpawn: 0.025, timerMoves: 12,
    jelly: ['000000000', '000000000', '001111100', '001111100', '001111100', '001111100', '001111100', '000000000', '000000000'],
    pieces: ['.........', '..T...T..', '.........', '.........', '.........', '.........', '.........', '.........', '.........'] },
  { id: 28, moves: 30, colors: 5, layout: fill(9, 9), goals: [{ type: 'jelly' }, { type: 'clear', what: 'stone' }],
    jelly: ['000000000', '000000000', '000000000', '001111100', '011111110', '011111110', '001111100', '000000000', '000000000'], pieces: ['.........', '.........', '.........', '.........', '2.2.2.2.2', '.........', '.........', '.........', '.........'] },
  { id: 29, moves: 30, colors: 5, layout: fill(9, 9), goals: [{ type: 'clear', what: 'slime' }, { type: 'drop', count: 1 }],
    pieces: ['....A....', '.........', '.........', '.........', '.........', '.........', '.........', '.........', 'm.......m'] },
  { id: 30, moves: 34, colors: 5, layout: fill(9, 9), goals: [{ type: 'jelly' }, { type: 'drop', count: 2 }],
    jelly: ['000000000', '000000000', '000000000', '000000000', '011111110', '011111110', '111111111', '111111111', '111111111'], pieces: ['....A....', ...fill(9, 8)],
    cover: ['.........', '.........', '.........', '.i.i.i.i.', '.........', 'k.k.k.k.k', '.........', '.........', '.........'], dropSpawn: { chance: 0.3, maxOnBoard: 1 }, boss: true },
];

export const WORLD_OF = id => Math.ceil(id / 10);

// 원본 정의 (튜너는 이걸로 시작) / 튜닝 결과를 덮어쓴 실제 게임용 레벨
export const BASE_LEVELS = [...RAW, ...MORE, ...GEN].map(l => shapeLevel({ world: WORLD_OF(l.id), stars: [1500, 3000, 4500], ...l }));
export const LEVELS = BASE_LEVELS.map(l => ({ ...l, ...(TUNING[l.id] || {}) }));
