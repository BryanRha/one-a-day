// 지도: 9칸 너비 · 세로 길이 자유. 칸 글자 = 지형(+주인 0 중립·1 파랑·2 빨강)
// . 평지  f 숲  m 산  r 길  ~ 강  = 다리  b 모래  s 바다  p 밭  w 밀밭  t 참호  C 도시  B 기지  A 비행장  H 본부
// 파랑(1) 아래 · 빨강(2) 위. 대부분 점대칭(공정)
const mirror = (top, mid) => {   // 위쪽 절반 → 아래쪽은 180° 돌리고 주인 바꿈
  const sw = c => c.replace(/(.)([12])$/, (m, a, b) => a + (b === '1' ? '2' : '1'));
  const rows = top.map(r => r.trim().split(/\s+/));
  const bottom = rows.slice().reverse().map(r => r.slice().reverse().map(sw).join(' '));
  return [...top, ...(mid ? [mid] : []), ...bottom];
};
// 캠페인 판: 원작처럼 판마다 조건을 다르게 (초반엔 적이 생산 못 하고 배치된 부대만 · 뒤로 갈수록 적이 유리)
export function campaignMap(m) {
  const c = m.camp || {};
  return { ...m, noBuild: c.noBuild || [], units: [...m.units, ...(c.extra || []).map(u => ({ ...u, p: 2 }))], funds: c.funds || m.funds, incomeMul: c.incomeMul || [1, 1, 1] };
}
const munits = (list, h) => list.flatMap(u => [{ ...u, p: 2 }, { t: u.t, p: 1, x: 8 - u.x, y: h - 1 - u.y }]);

export const MAPS = [
  {
    id: 'm1', name: '첫 교전', desc: '강을 사이에 둔 작은 전선 · 전차와 보병의 기본', par: 9,
    rows: mirror([
      'm  f  .  .  H2 .  .  f  m',
      'f  C2 .  B2 r  .  .  C2 f',
      '.  .  .  .  r  .  f  .  .',
      'C0 .  f  .  r  .  .  .  C0',
      'p  p  .  .  r  .  f  w  w',
      '.  f  .  C0 r  .  .  .  .',
    ], '~  ~  =  ~  =  ~  =  ~  ~'),
    units: munits([{ t: 'inf', x: 3, y: 2 }, { t: 'inf', x: 5, y: 1 }, { t: 'ltank', x: 4, y: 2 }], 13),
    funds: [3000, 3000], tip: '적은 생산을 못 해요 · 적 부대를 모두 무찌르면 승리!',
    camp: { noBuild: [2], extra: [{ t: 'inf', x: 1, y: 2 }, { t: 'recon', x: 7, y: 2 }] },
  },
  {
    id: 'm2', name: '숲의 골짜기', desc: '숲과 산이 많은 길목 · 바주카병과 야포', par: 11,
    rows: mirror([
      'm  m  f  C2 H2 C2 f  m  m',
      'm  f  .  .  r  .  B2 f  m',
      'f  .  C0 .  r  .  .  .  f',
      '.  .  f  f  r  m  .  C0 .',
      'C0 .  .  .  r  .  .  f  .',
      'f  m  .  f  r  r  r  .  .',
      '.  .  .  .  .  f  r  .  C0',
    ]),
    units: munits([{ t: 'inf', x: 3, y: 1 }, { t: 'bazooka', x: 5, y: 2 }, { t: 'arty', x: 4, y: 1 }], 14),
    funds: [4000, 4000], tip: '야포는 움직이지 않고 쏴요 · 적은 생산을 못 해요',
    camp: { noBuild: [2], extra: [{ t: 'inf', x: 2, y: 2 }, { t: 'ltank', x: 6, y: 2 }, { t: 'arty', x: 3, y: 0 }, { t: 'inf', x: 7, y: 3 }] },
  },
  {
    id: 'm3', name: '해안 교두보', desc: '바닷가 비행장 · 공격헬기와 대공포차', par: 14,
    rows: mirror([
      's  s  b  C2 H2 .  f  m  m',
      's  b  A2 .  r  .  B2 .  f',
      's  b  .  .  r  .  .  C0 .',
      'b  .  C0 f  r  f  .  .  .',
      '.  .  .  .  r  .  t  .  C0',
      'p  p  f  .  r  .  .  w  w',
      '~  =  ~  ~  =  ~  ~  ~  ~',
    ]),
    units: munits([{ t: 'inf', x: 3, y: 1 }, { t: 'recon', x: 5, y: 2 }, { t: 'aa', x: 4, y: 2 }], 14),
    funds: [5000, 5000], tip: '헬기는 지형을 무시해요 · 대공포차로 막아요',
    camp: { funds: [6000, 1000], incomeMul: [1, 1, 0.45] },
  },
  {
    id: 'm4', name: '도시 쟁탈전', desc: '도시가 많은 시가전 · 자금 싸움', par: 13,
    rows: mirror([
      'C2 .  C0 .  H2 .  C0 .  C2',
      '.  r  r  r  r  r  r  r  .',
      'C0 r  B2 .  C0 .  B2 r  C0',
      '.  r  .  f  .  f  .  r  .',
      'C0 r  r  r  t  r  r  r  C0',
      '.  .  f  .  .  .  f  .  .',
      '.  C0 .  .  m  .  .  C0 .',
    ]),
    units: munits([{ t: 'inf', x: 2, y: 3 }, { t: 'inf', x: 6, y: 3 }, { t: 'recon', x: 4, y: 3 }], 14),
    funds: [4000, 4000], tip: '도시가 많을수록 자금이 빨리 쌓여요',
    camp: { funds: [5000, 3000], incomeMul: [1, 1, 0.8] },
  },
  {
    id: 'm5', name: '최후의 요새', desc: '참호와 산으로 막힌 요새 · 로켓포와 중전차', par: 17,
    rows: mirror([
      'm  t  C2 A2 H2 B2 C2 t  m',
      'm  t  t  .  r  .  t  t  m',
      'f  .  .  .  r  .  .  .  f',
      'C0 .  m  f  r  f  m  .  C0',
      '.  .  m  .  r  .  m  .  .',
      'B0 .  .  .  r  .  .  .  C0',
      '.  f  ~  ~  =  ~  ~  f  .',
      '.  .  .  C0 r  C0 .  .  .',
    ]),
    units: munits([{ t: 'inf', x: 3, y: 2 }, { t: 'htank', x: 4, y: 1 }, { t: 'arty', x: 5, y: 2 }, { t: 'inf', x: 5, y: 1 }], 16),
    funds: [6000, 6000], tip: '로켓포는 아주 멀리 쏴요 · 바주카병으로 가까이 붙어요',
    camp: { funds: [6000, 9000], incomeMul: [1, 1, 0.4], extra: [{ t: 'rocket', x: 4, y: 2 }] },
  },
];
