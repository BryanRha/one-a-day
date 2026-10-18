// 게임 목록. 새 게임은 여기에 한 줄 추가하고 tools/build.mjs 의 GAMES 에 빌드 위치를 적으면 된다.
// order: 오늘의 게임 순환 순서 (모든 유저에게 같은 날 같은 게임)
export const LAUNCH = '2026-10-18';          // 1일차
export const PLANNED = 30;                   // 첫 출시 목표 게임 수 (컬렉션의 빈칸 수)

export const GAMES = {
  witch: {
    title: '냥냥 마녀', en: 'Witch & Whiskers', genre: '슈팅', color: '#7A4DE0',
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
};
export const ORDER = ['witch', 'ocean'];
