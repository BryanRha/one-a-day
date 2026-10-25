// 레벨 31~100 (월드 4~10). 문자 규칙은 engine.js 상단 주석 참고.
// 모양은 좌표 함수로 만든다: L({ w, h, hole, piece, jelly, cover }) — 각 함수는 (x, y) → 문자 (없으면 기본값).
// moves / stars / 목표량(drop·collect)은 tools/tune.js 가 사람 봇 기준으로 다시 맞춘다.

const G = (w, h, f, d) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => f(x, y) || d).join(''));

function L({ w = 9, h = 9, hole, piece, jelly, cover, ...rest }) {
  const H = (x, y) => !!(hole && hole(x, y));
  const lv = { moves: 25, colors: 5, ...rest, layout: G(w, h, (x, y) => (H(x, y) ? '#' : '.'), '.') };
  if (piece) lv.pieces = G(w, h, (x, y) => (H(x, y) ? '.' : piece(x, y)), '.');
  if (jelly) lv.jelly = G(w, h, (x, y) => (H(x, y) ? '0' : jelly(x, y)), '0');
  if (cover) lv.cover = G(w, h, (x, y) => (H(x, y) ? '.' : cover(x, y)), '.');
  return lv;
}

// 모양 도우미 (보드 중심 기준 거리)
const dx = (x, w) => Math.abs(x - (w - 1) / 2);
const dy = (y, h) => Math.abs(y - (h - 1) / 2);
const box = (x, y, w, h) => Math.max(dx(x, w), dy(y, h));        // 사각 고리 거리
const dia = (x, y, w, h) => dx(x, w) + dy(y, h);                  // 마름모 거리
const corner = (x, y, w, h, n = 1) => (x < n || x >= w - n) && (y < n || y >= h - n);
const c = ch => () => ch;
const top = (x, y) => (y === 0 && x === 4 ? 'A' : null);          // 9칸 보드 윗줄 가운데 재료

export const MORE = [
  // ═══ 월드 4 · 열대 석호 — 기름띠(젤리) 청소 ═══════════════════
  L({ id: 31, w: 8, h: 8, goals: [{ type: 'collect', color: 'yellow', count: 30 }, { type: 'collect', color: 'green', count: 30 }],
      jelly: (x, y) => (box(x, y, 8, 8) < 1 ? '1' : null) }),
  L({ id: 32, goals: [{ type: 'jelly' }], hole: (x, y) => corner(x, y, 9, 9),
      jelly: (x, y) => (dia(x, y, 9, 9) <= 4 ? '1' : null) }),
  L({ id: 33, goals: [{ type: 'jelly' }, { type: 'drop', count: 2 }], piece: top,
      jelly: (x, y) => (y >= 7 ? '1' : null), dropSpawn: { chance: 0.25, maxOnBoard: 1 } }),
  L({ id: 34, w: 8, h: 9, goals: [{ type: 'collect', color: 'red', count: 30 }, { type: 'cover' }],
      cover: (x, y) => (box(x, y, 8, 9) === 2.5 && (x + y) % 2 === 0 ? 'i' : null) }),
  L({ id: 35, goals: [{ type: 'jelly' }], hole: (x, y) => (x === 4 && (y === 0 || y === 8)),
      jelly: (x, y) => (dia(x, y, 9, 9) <= 1 ? '2' : x === y || x === 8 - y ? '1' : null) }),
  L({ id: 36, w: 8, h: 8, goals: [{ type: 'drop', count: 2 }], piece: (x, y) => (y === 0 && x === 3 ? 'A' : null), dropSpawn: { chance: 0.3, maxOnBoard: 1 } }),
  L({ id: 37, goals: [{ type: 'jelly' }, { type: 'cover' }],
      jelly: (x, y) => (box(x, y, 9, 9) <= 2 ? '1' : null), cover: (x, y) => (box(x, y, 9, 9) === 3 && (x + y) % 2 === 0 ? 'k' : null) }),
  L({ id: 38, goals: [{ type: 'jelly' }], hole: (x, y) => (y === 4 && (x === 0 || x === 8)) || corner(x, y, 9, 9),
      jelly: (x, y) => (y >= 5 ? '1' : null) }),
  L({ id: 39, goals: [{ type: 'drop', count: 2 }, { type: 'jelly' }], piece: (x, y) => (y === 0 && (x === 2 || x === 6) ? (x === 2 ? 'A' : 'Z') : null),
      jelly: (x, y) => (y >= 7 ? '1' : null), dropSpawn: { chance: 0.2, maxOnBoard: 2 } }),
  L({ id: 40, goals: [{ type: 'jelly' }, { type: 'drop', count: 2 }, { type: 'cover' }], piece: top, boss: true,
      jelly: (x, y) => (y >= 6 ? '1' : null), cover: (x, y) => (y === 4 && x % 2 === 1 ? 'i' : null), dropSpawn: { chance: 0.25, maxOnBoard: 1 } }),

  // ═══ 월드 5 · 난파선 만 — 보물상자·산호 바위·어망 ═══════════════
  L({ id: 41, w: 8, h: 8, goals: [{ type: 'clear', what: 'crate' }],
      piece: (x, y) => (box(x, y, 8, 8) === 1.5 ? ((x + y) % 2 ? 'B' : 'b') : null) }),
  L({ id: 42, goals: [{ type: 'clear', what: 'stone' }, { type: 'collect', color: 'blue', count: 25 }],
      piece: (x, y) => ((x === 1 || x === 7) && y % 2 === 1 ? '2' : null) }),
  L({ id: 43, goals: [{ type: 'drop', count: 2 }, { type: 'clear', what: 'crate' }],
      piece: (x, y) => (top(x, y) || (y === 4 && x !== 4 ? 'B' : null)), dropSpawn: { chance: 0.25, maxOnBoard: 1 } }),
  L({ id: 44, w: 8, h: 9, goals: [{ type: 'collect', color: 'orange', count: 30 }, { type: 'cover' }],
      cover: (x, y) => ((x === 1 || x === 6) && y >= 2 ? 'k' : null) }),
  L({ id: 45, goals: [{ type: 'clear', what: 'stone' }, { type: 'jelly' }],
      piece: (x, y) => (box(x, y, 9, 9) === 1 ? '3' : null), jelly: (x, y) => (box(x, y, 9, 9) === 3 ? '1' : null) }),
  L({ id: 46, w: 8, h: 8, goals: [{ type: 'clear', what: 'crate' }],
      piece: (x, y) => ((y === 2 || y === 5) && (x === 1 || x === 2 || x === 5 || x === 6) ? 'B' : null) }),
  L({ id: 47, goals: [{ type: 'clear', what: 'stone' }, { type: 'cover' }],
      piece: (x, y) => (y === 6 && x % 2 === 0 ? '2' : null), cover: (x, y) => (y === 3 && x % 2 === 0 ? 'k' : null) }),
  L({ id: 48, goals: [{ type: 'drop', count: 3 }],
      piece: (x, y) => (top(x, y) || ((y === 3 || y === 6) && (x === 1 || x === 7) ? 'B' : null)), dropSpawn: { chance: 0.3, maxOnBoard: 1 } }),
  L({ id: 49, goals: [{ type: 'clear', what: 'crate' }, { type: 'cover' }],
      piece: (x, y) => (y === 6 && x % 3 !== 1 ? 'B' : null), cover: (x, y) => (y === 2 && x % 2 === 0 ? 'i' : null) }),
  L({ id: 50, goals: [{ type: 'clear', what: 'stone' }, { type: 'jelly' }, { type: 'drop', count: 2 }], boss: true,
      piece: (x, y) => (top(x, y) || (corner(x, y, 9, 9, 2) && y > 6 ? '2' : null)),
      jelly: (x, y) => (dx(x, 9) <= 2 && y >= 6 ? '1' : null), dropSpawn: { chance: 0.25, maxOnBoard: 1 } }),

  // ═══ 월드 6 · 빙하 바다 — 두꺼운 얼음·물방울 ═════════════════
  L({ id: 51, w: 8, h: 8, goals: [{ type: 'cover' }], cover: (x, y) => ((x + y) % 3 === 0 && box(x, y, 8, 8) <= 2.5 ? 'i' : null) }),
  L({ id: 52, goals: [{ type: 'cover' }], cover: (x, y) => (box(x, y, 9, 9) === 2 ? 'i' : box(x, y, 9, 9) === 0 ? 'I' : null) }),
  L({ id: 53, goals: [{ type: 'cover' }, { type: 'collect', color: 'blue', count: 25 }],
      cover: (x, y) => (dia(x, y, 9, 9) <= 1 ? 'I' : null) }),
  L({ id: 54, goals: [{ type: 'cover' }], cover: (x, y) => (y % 3 === 1 ? (x % 2 ? 'q' : y === 4 ? 'i' : null) : null) }),
  L({ id: 55, goals: [{ type: 'cover' }, { type: 'drop', count: 2 }], piece: top,
      cover: (x, y) => (y === 4 ? 'i' : null), dropSpawn: { chance: 0.25, maxOnBoard: 1 } }),
  L({ id: 56, w: 8, h: 8, goals: [{ type: 'collect', color: 'blue', count: 30 }, { type: 'cover' }],
      cover: (x, y) => (corner(x, y, 8, 8, 2) ? 'q' : null) }),
  L({ id: 57, goals: [{ type: 'jelly' }, { type: 'cover' }],
      jelly: (x, y) => (y >= 3 && y <= 5 ? '1' : null), cover: (x, y) => (y === 4 && x % 2 === 0 ? 'i' : null) }),
  L({ id: 58, goals: [{ type: 'cover' }], hole: (x, y) => corner(x, y, 9, 9),
      cover: (x, y) => (x === y || x === 8 - y ? 'q' : dia(x, y, 9, 9) === 4 ? 'i' : null) }),
  L({ id: 59, goals: [{ type: 'star', count: 6 }, { type: 'cover' }],
      piece: (x, y) => ((y === 2 || y === 6) && (x === 2 || x === 4 || x === 6) ? '*' : null), cover: (x, y) => (y === 4 ? 'i' : null) }),
  L({ id: 60, goals: [{ type: 'cover' }, { type: 'jelly' }, { type: 'clear', what: 'stone' }], boss: true,
      cover: (x, y) => (box(x, y, 9, 9) === 1 ? 'I' : null), jelly: (x, y) => (y >= 7 ? '1' : null),
      piece: (x, y) => (y === 2 && (x === 0 || x === 8) ? '2' : null) }),

  // ═══ 월드 7 · 진주 동굴 — 불가사리·동굴 모양 보드 ═══════════════
  L({ id: 61, w: 8, h: 8, goals: [{ type: 'star', count: 8 }, { type: 'cover' }],
      piece: (x, y) => ((y === 1 || y === 6) && (x === 1 || x === 3 || x === 4 || x === 6) ? '*' : null), cover: (x, y) => (y === 3 ? 'i' : null) }),
  L({ id: 62, goals: [{ type: 'star', count: 12 }, { type: 'cover' }], hole: (x, y) => (y <= 1 && dx(x, 9) >= 3) || (y >= 7 && dx(x, 9) >= 3),
      piece: (x, y) => (dia(x, y, 9, 9) === 3 ? '*' : null), cover: (x, y) => (dia(x, y, 9, 9) <= 1 ? 'i' : null) }),
  L({ id: 63, goals: [{ type: 'star', count: 6 }, { type: 'clear', what: 'stone' }],
      piece: (x, y) => (y === 3 && x % 3 === 1 ? '*' : y === 6 && x % 3 === 1 ? '*' : y === 5 && x % 2 === 0 ? '1' : null) }),
  L({ id: 64, colors: 6, goals: [{ type: 'collect', color: 'yellow', count: 25 }, { type: 'collect', color: 'purple', count: 25 }],
      hole: (x, y) => (dx(x, 9) === 4 && dy(y, 9) >= 2) || (dx(x, 9) === 3 && dy(y, 9) >= 4) }),
  L({ id: 65, goals: [{ type: 'star', count: 4 }, { type: 'clear', what: 'stone' }, { type: 'jelly' }],
      piece: (x, y) => (box(x, y, 9, 9) === 2 && dx(x, 9) === 2 && dy(y, 9) === 2 ? '*' : box(x, y, 9, 9) === 1 ? '3' : null),
      jelly: (x, y) => (box(x, y, 9, 9) === 4 && y >= 4 ? '1' : null) }),
  L({ id: 66, goals: [{ type: 'drop', count: 2 }], hole: (x, y) => (y >= 3 && y <= 5 && (x <= 1 || x >= 7)),
      piece: top, dropSpawn: { chance: 0.3, maxOnBoard: 1 } }),
  L({ id: 67, goals: [{ type: 'star', count: 6 }, { type: 'clear', what: 'crate' }],
      piece: (x, y) => (y === 1 && x % 3 === 1 ? '*' : y === 7 && x % 3 === 1 ? '*' : y === 4 && x !== 4 ? 'b' : null) }),
  L({ id: 68, goals: [{ type: 'jelly' }], hole: (x, y) => dy(y, 9) <= 1 && dx(x, 9) >= 3,
      jelly: (x, y) => (y === 6 || (y === 2 && dx(x, 9) <= 2) ? '1' : null) }),
  L({ id: 69, goals: [{ type: 'star', count: 4 }, { type: 'drop', count: 2 }],
      piece: (x, y) => (top(x, y) || (y === 5 && (x === 1 || x === 3 || x === 5 || x === 7) ? '*' : null)), dropSpawn: { chance: 0.25, maxOnBoard: 1 } }),
  L({ id: 70, goals: [{ type: 'star', count: 8 }, { type: 'jelly' }, { type: 'cover' }], boss: true,
      hole: (x, y) => corner(x, y, 9, 9),
      piece: (x, y) => (dia(x, y, 9, 9) === 2 ? '*' : null), jelly: (x, y) => (y >= 7 ? '1' : null),
      cover: (x, y) => (y === 1 && x % 2 === 1 ? 'I' : null) }),

  // ═══ 월드 8 · 화산 해구 — 기뢰·오염 해초 ═════════════════════
  L({ id: 71, w: 8, h: 8, goals: [{ type: 'collect', color: 'red', count: 30 }], timerSpawn: 0.03, timerMoves: 12,
      piece: (x, y) => (y === 2 && x === 3 ? 'T' : null) }),
  L({ id: 72, goals: [{ type: 'clear', what: 'slime' }], piece: (x, y) => (y === 8 && (x === 0 || x === 4 || x === 8) ? 'm' : y === 7 && x === 4 ? 'm' : null) }),
  L({ id: 73, goals: [{ type: 'jelly' }], timerSpawn: 0.03, timerMoves: 10,
      jelly: (x, y) => (box(x, y, 9, 9) <= 2 ? '1' : null), piece: (x, y) => (y === 1 && (x === 1 || x === 7) ? 'T' : null) }),
  L({ id: 74, goals: [{ type: 'clear', what: 'slime' }, { type: 'clear', what: 'stone' }],
      piece: (x, y) => (y === 8 && x % 4 === 0 ? 'm' : y === 5 && x % 2 === 1 ? '2' : null) }),
  L({ id: 75, goals: [{ type: 'clear', what: 'slime' }], timerSpawn: 0.025, timerMoves: 12,
      piece: (x, y) => (y >= 7 && x % 2 === 0 ? 'm' : null) }),
  L({ id: 76, w: 8, h: 8, goals: [{ type: 'collect', color: 'green', count: 30 }, { type: 'collect', color: 'orange', count: 30 }], timerSpawn: 0.02, timerMoves: 14 }),
  L({ id: 77, goals: [{ type: 'drop', count: 2 }, { type: 'clear', what: 'slime' }],
      piece: (x, y) => (top(x, y) || (y === 8 && (x === 3 || x === 5) ? 'm' : null)), dropSpawn: { chance: 0.25, maxOnBoard: 1 } }),
  L({ id: 78, goals: [{ type: 'jelly' }], timerSpawn: 0.035, timerMoves: 10, hole: (x, y) => x === 4 && y >= 3 && y <= 5,
      jelly: (x, y) => (y >= 7 ? '1' : null) }),
  L({ id: 79, goals: [{ type: 'clear', what: 'slime' }, { type: 'clear', what: 'crate' }],
      piece: (x, y) => (y === 8 && (x === 2 || x === 6) ? 'm' : y === 4 && dx(x, 9) >= 2 ? 'B' : null) }),
  L({ id: 80, goals: [{ type: 'clear', what: 'slime' }, { type: 'jelly' }, { type: 'drop', count: 2 }], boss: true, timerSpawn: 0.02, timerMoves: 12,
      piece: (x, y) => (top(x, y) || (y === 8 && (x === 0 || x === 8) ? 'm' : null)),
      jelly: (x, y) => (y >= 4 && y <= 6 && dx(x, 9) <= 3 ? '1' : null), dropSpawn: { chance: 0.25, maxOnBoard: 1 } }),

  // ═══ 월드 9 · 해파리 정원 — 물방울·어망·6색 ══════════════════
  L({ id: 81, w: 8, h: 8, goals: [{ type: 'cover' }], cover: (x, y) => (box(x, y, 8, 8) === 0.5 || box(x, y, 8, 8) === 1.5 || (box(x, y, 8, 8) === 2.5 && (x + y) % 2) ? 'q' : null) }),
  L({ id: 82, colors: 6, goals: [{ type: 'cover' }, { type: 'collect', color: 'blue', count: 20 }],
      cover: (x, y) => (x === 4 && y % 2 === 0 ? 'k' : y === 4 && x % 2 ? 'q' : null) }),
  L({ id: 83, goals: [{ type: 'jelly' }, { type: 'cover' }],
      jelly: (x, y) => (dia(x, y, 9, 9) <= 3 ? '1' : null), cover: (x, y) => (dia(x, y, 9, 9) === 4 ? 'q' : null) }),
  L({ id: 84, goals: [{ type: 'drop', count: 2 }, { type: 'cover' }], piece: top,
      cover: (x, y) => (y === 5 && x % 2 === 0 ? 'k' : null), dropSpawn: { chance: 0.25, maxOnBoard: 1 } }),
  L({ id: 85, goals: [{ type: 'cover' }], cover: (x, y) => (box(x, y, 9, 9) === 1 ? 'k' : box(x, y, 9, 9) === 3 ? 'q' : null) }),
  L({ id: 86, colors: 6, w: 8, h: 8, goals: [{ type: 'collect', color: 'purple', count: 20 }, { type: 'collect', color: 'yellow', count: 20 }] }),
  L({ id: 87, goals: [{ type: 'star', count: 6 }, { type: 'cover' }],
      piece: (x, y) => (y === 2 && x % 3 === 1 ? '*' : y === 6 && x % 3 === 1 ? '*' : null), cover: (x, y) => (y === 4 ? (x % 2 ? 'I' : 'q') : null) }),
  L({ id: 88, goals: [{ type: 'jelly' }, { type: 'cover' }],
      jelly: (x, y) => (y >= 7 ? '1' : null), cover: (x, y) => (y === 3 && x % 2 === 1 ? 'k' : null) }),
  L({ id: 89, goals: [{ type: 'clear', what: 'slime' }, { type: 'cover' }],
      piece: (x, y) => (y === 8 && (x === 2 || x === 6) ? 'm' : null), cover: (x, y) => (y === 2 && x !== 4 ? 'q' : null) }),
  L({ id: 90, goals: [{ type: 'cover' }, { type: 'drop', count: 2 }], boss: true, piece: top,
      hole: (x, y) => corner(x, y, 9, 9),
      cover: (x, y) => (y === 3 && x % 2 === 0 ? 'k' : y === 6 && x % 2 ? 'q' : null), dropSpawn: { chance: 0.25, maxOnBoard: 1 } }),

  // ═══ 월드 10 · 해저 도시 — 모든 기믹 종합 ═════════════════════
  L({ id: 91, w: 8, h: 8, goals: [{ type: 'collect', color: 'red', count: 25 }, { type: 'jelly' }],
      jelly: (x, y) => (dy(y, 8) <= 0.5 ? '1' : null) }),
  L({ id: 92, goals: [{ type: 'clear', what: 'stone' }, { type: 'star', count: 4 }],
      piece: (x, y) => (corner(x, y, 9, 9, 2) && box(x, y, 9, 9) === 3 ? '*' : dia(x, y, 9, 9) <= 2 && dia(x, y, 9, 9) > 0 ? '2' : null) }),
  L({ id: 93, goals: [{ type: 'jelly' }, { type: 'cover' }], hole: (x, y) => x === 4 && (y <= 1 || y >= 7),
      jelly: (x, y) => (dx(x, 9) >= 2 && dx(x, 9) <= 3 && y >= 3 && y <= 5 ? '1' : null), cover: (x, y) => (dx(x, 9) === 1 && y % 2 === 0 ? 'i' : null) }),
  L({ id: 94, goals: [{ type: 'drop', count: 3 }, { type: 'clear', what: 'crate' }],
      piece: (x, y) => (top(x, y) || (y === 5 && x % 2 === 0 ? 'B' : null)), dropSpawn: { chance: 0.3, maxOnBoard: 1 } }),
  L({ id: 95, goals: [{ type: 'jelly' }, { type: 'clear', what: 'slime' }], timerSpawn: 0.02, timerMoves: 12,
      jelly: (x, y) => (box(x, y, 9, 9) <= 2 ? '2' : null), piece: (x, y) => (y === 8 && (x === 0 || x === 8) ? 'm' : null) }),
  L({ id: 96, w: 8, h: 8, goals: [{ type: 'collect', color: 'green', count: 25 }, { type: 'collect', color: 'blue', count: 25 }] }),
  L({ id: 97, goals: [{ type: 'cover' }, { type: 'star', count: 4 }],
      piece: (x, y) => (y === 4 && (x === 1 || x === 3 || x === 5 || x === 7) ? '*' : null),
      cover: (x, y) => (y === 2 || y === 6 ? (x % 2 ? 'i' : 'q') : null) }),
  L({ id: 98, goals: [{ type: 'jelly' }, { type: 'drop', count: 2 }], piece: (x, y) => (top(x, y) || (y === 3 && (x === 0 || x === 8) ? '2' : null)),
      jelly: (x, y) => (y >= 6 ? '1' : null), dropSpawn: { chance: 0.25, maxOnBoard: 1 } }),
  L({ id: 99, goals: [{ type: 'clear', what: 'stone' }, { type: 'clear', what: 'crate' }, { type: 'cover' }],
      piece: (x, y) => (y === 6 && x % 2 === 0 ? '3' : y === 3 && x % 2 === 1 ? 'B' : null), cover: (x, y) => (y === 1 && x % 2 === 0 ? 'k' : null) }),
  L({ id: 100, goals: [{ type: 'jelly' }, { type: 'drop', count: 2 }, { type: 'star', count: 4 }, { type: 'cover' }], boss: true,
      hole: (x, y) => corner(x, y, 9, 9),
      piece: (x, y) => (top(x, y) || (y === 2 && (x === 2 || x === 6) ? '*' : y === 6 && (x === 1 || x === 7) ? '*' : null)),
      jelly: (x, y) => (y >= 7 ? '1' : null),
      cover: (x, y) => (y === 4 && x % 2 === 0 ? 'i' : null), dropSpawn: { chance: 0.25, maxOnBoard: 1 } }),
];
