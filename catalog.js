// 게임 목록. 새 게임은 여기에 한 줄 추가하고 tools/build.mjs 의 GAMES 에 빌드 위치를 적으면 된다.
// order: 오늘의 게임 순환 순서 (모든 유저에게 같은 날 같은 게임)
export const LAUNCH = '2026-10-18';          // 1일차
export const PLANNED = 30;                   // 첫 출시 목표 게임 수 (컬렉션의 빈칸 수)

export const GAMES = {
  witch: {
    title: '고양이와 마녀', en: 'Cat & Witch', genre: '슈팅', color: '#7A4DE0',
    tagline: '빗자루 타고 고양이와 밤하늘을 날아요',
    desc: '몬스터 줄의 빈틈을 뚫고 얼마나 멀리 날 수 있을까요? 별똥별을 피하고, 보스를 물리치고, 고양이 친구를 모아 보세요.',
    path: 'games/witch/', cover: 'covers/witch.png', icon: 'covers/witch_icon.png', time: '1~3분',
  },
  ocean: {
    title: '바다이야기', en: 'Ocean Tales', genre: '퍼즐', color: '#1E8FE6',
    tagline: '귀여운 바다 친구들을 맞춰요',
    desc: '같은 바다 친구 3개를 맞춰 터뜨리는 매치3 퍼즐. 500개 스테이지와 특수 블록 조합, 바다 마을 꾸미기까지.',
    path: 'games/ocean-tales/', cover: 'covers/ocean.png', icon: 'covers/ocean_icon.png', time: '2~4분',
  },
  racer: {
    title: '스트레스 차차차', en: 'Stress Cha-Cha-Cha', genre: '레이싱', color: '#3B5BDB',
    tagline: '앞차에 닿기 직전 휙! 칼치기 콤보',
    desc: '동물 친구들의 꽉 막힌 도로 질주! 연료가 바닥나기 전에 체크포인트를 지나고, 앞차에 닿기 직전 옆으로 빠지는 칼치기를 이어 스·트·레·스·차·차·차를 완성하면 무적 피버 질주!. 점프로 차를 밟고 넘어가면 대박 점수.',
    path: 'games/racer/', cover: 'covers/racer.png', icon: 'covers/racer_icon.png', time: '1~3분',
  },
  blocks: {
    title: '판다 블록', en: 'Panda Blocks', genre: '퍼즐', color: '#8A6BFF',
    tagline: '블록을 놓아 줄을 지워요',
    desc: '조각 3개를 판에 쏙쏙 넣어 가로·세로 줄을 지우는 블록 퍼즐. 여러 줄을 한 번에, 콤보를 이어 최고 기록에 도전하세요!',
    path: 'games/blocks/', cover: 'covers/blocks.png', icon: 'covers/blocks_icon.png', time: '3~6분',
  },
};
export const ORDER = ['witch', 'ocean', 'racer', 'blocks'];
