// 게임 목록. 새 게임은 여기에 한 줄 추가하고 tools/build.mjs 의 GAMES 에 빌드 위치를 적으면 된다.
// order: 오늘의 게임 순환 순서 (모든 유저에게 같은 날 같은 게임)
export const LAUNCH = '2026-10-18';          // 1일차
export const PLANNED = 30;                   // 첫 출시 목표 게임 수 (컬렉션의 빈칸 수)

export const GAMES = {
  witch: {
    title: '고양이와 마녀', en: 'Cat & Witch', genre: '슈팅', color: '#7A4DE0',
    tagline: '빗자루 타고 고양이와 밤하늘을 날아요',
    desc: '몬스터 줄의 빈틈을 뚫고 얼마나 멀리 날 수 있을까요? 별똥별을 피하고, 보스를 물리치고, 고양이 친구를 모아 보세요.',
    path: 'games/witch/', logo: true, cover: 'covers/witch.png', icon: 'covers/witch_icon.png', time: '1~3분',
  },
  ocean: {
    title: '바다이야기', en: 'Ocean Tales', genre: '퍼즐', color: '#1E8FE6',
    tagline: '귀여운 바다 친구들을 맞춰요',
    desc: '같은 바다 친구 3개를 맞춰 터뜨리는 매치3 퍼즐. 500개 스테이지와 특수 블록 조합, 바다 마을 꾸미기까지.',
    path: 'games/ocean-tales/', logo: true, cover: 'covers/ocean.png', icon: 'covers/ocean_icon.png', time: '2~4분',
  },
  racer: {
    title: '스트레스 차차차', en: 'Stress Cha-Cha-Cha', genre: '레이싱', color: '#3B5BDB',
    tagline: '앞차에 닿기 직전 휙! 칼치기 콤보',
    desc: '동물 친구들의 꽉 막힌 도로 질주! 연료가 바닥나기 전에 체크포인트를 지나고, 앞차에 닿기 직전 옆으로 빠지는 칼치기를 이어 스·트·레·스·차·차·차를 완성하면 무적 피버 질주!. 점프로 차를 밟고 넘어가면 대박 점수.',
    path: 'games/racer/', cover: 'covers/racer.png', icon: 'covers/racer_icon.png', time: '1~3분',
  },
  blocks: {
    title: '블록 블리스', en: 'Block Bliss', genre: '퍼즐', color: '#4F72FF',
    tagline: '줄을 지우는 보석 블록 퍼즐',
    desc: '조각 3개를 판에 맞춰 가로·세로 줄을 지우는 블록 퍼즐. 최고 기록에 도전하는 클래식, 매주 96레벨로 그림 한 장을 완성하는 어드벤처, 매일 바뀌는 미션까지.',
    path: 'games/blocks/', logo: true, cover: 'covers/blocks.png', icon: 'covers/blocks_icon.png', time: '3~6분',
  },
  dice: {
    title: '룬 다이스', en: 'Rune Dice', genre: '디펜스', color: '#8E6BFF',
    tagline: '룬 주사위를 소환하고 합성해 제단을 지켜요',
    desc: '무작위로 소환되는 룬 주사위를 같은 종류·같은 눈끼리 합성해 강하게 키우는 디펜스. 웨이브마다 몰려오는 적과 5종의 보스를 막고 최고 웨이브에 도전하세요. 매일 모두 같은 덱으로 겨루는 오늘의 도전도 있어요.',
    path: 'games/dice/', logo: true, cover: 'covers/dice.png', icon: 'covers/dice_icon.png', time: '5~8분',
  },
  war: {
    title: '작전명 허스키', en: 'Operation Husky', genre: '전략', color: '#6E8338',
    tagline: '귀여운 부대를 지휘하는 턴제 전략',
    desc: '격자 전장에서 보병·전차·전투기·함선을 지휘해 적 본부를 점령하는 턴제 전략 게임. 공격 전에 정확한 피해와 반격을 미리 보여 줘요. 이야기가 있는 캠페인 25작전, 지휘관 16명과 필살기, 안개·날씨·잠수함, 점수를 겨루는 전쟁실, 둘이서 대전과 지도 제작까지.',
    path: 'games/war/', cover: 'covers/war.png', icon: 'covers/war_icon.png', time: '10~15분',
  },
  archer: {
    title: '별빛 궁수', en: 'Star Archer', genre: '액션 RPG', color: '#5B48D8',
    tagline: '한 손으로 즐기는 던전 액션 RPG',
    desc: '끌어서 움직이고 멈추면 자동으로 쏴요. 방을 깰 때마다 능력 3개 중 하나를 골라 매번 다른 궁수를 만들어요. 숲·사막·얼음 동굴 3개 장, 장마다 방 20개와 보스. 영웅 4명, 장비 강화·합성, 오늘의 던전까지.',
    path: 'games/archer/', logo: true, cover: 'covers/archer.png', icon: 'covers/archer_icon.png', time: '5~10분',
  },
  seek: {
    title: '추억 사진관', en: 'Memory Studio', genre: '숨은그림', color: '#8A5A2E',
    tagline: '오래된 사진 속 추억을 찾아드려요',
    desc: '동네 사진관에 매일 손님이 오래된 사진을 들고 찾아와요. 사진 속 추억의 물건을 찾고(숨은 물건), 원본과 복원본의 다른 곳을 찾아(틀린 그림) 사진을 되살려 주세요. 문방구·목욕탕·시장·교실·김장하는 날 — 숨은 물건은 시간 제한 없이 편안하게, 별 3개에 도전해요.',
    path: 'games/seek/', logo: true, cover: 'covers/seek.png', icon: 'covers/seek_icon.png', time: '3~6분',
  },
};
// 별빛 궁수(archer)는 2026-10-22 사용자 요청으로 목록에서 내림 (CATALOG 항목·게임 소스는 남겨 둠)
export const ORDER = ['witch', 'ocean', 'racer', 'blocks', 'dice', 'war', 'seek'];
