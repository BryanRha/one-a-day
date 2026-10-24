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
    title: '그 남자의 비밀', en: 'His Secret', genre: '로맨스 미스터리', color: '#E8628A',
    tagline: '숨은 단서를 찾고 그의 거짓말을 밝혀요',
    desc: '3주년 전날, 남자친구 도현이 "야근"이라며 연락을 끊었다. 그의 회사 빌딩 구석구석에서 숨은 단서를 찾고, 사진 두 장을 대조해 거짓말을 밝혀내세요. 한 화마다 숨은 물건 찾기 → 증거 대조 → 웹툰 결말로 이어지는 로맨스 미스터리. 시즌 2 「그 여자의 비밀」, 냥카페와 오늘의 코디까지.',
    path: 'games/seek/', logo: true, cover: 'covers/seek.png', icon: 'covers/seek_icon.png', time: '5~10분',
  },

  beauty: {
    title: 'K뷰티 레시피', en: 'K-Beauty Recipe', genre: '머지', color: '#E8507A',
    tagline: '같은 재료를 합쳐 할머니의 화장품 가게를 되살려요',
    desc: '할머니가 남긴 서울 골목의 한방 화장품 가게 「설화당」. 동백·쌀·인삼·녹차를 합쳐 손님 주문을 해결하고, 번 코인으로 가게를 고치고 꾸며요. 라이벌 화장품 회사의 방해와 원료 농장 청년과의 설렘까지, 이야기가 이어지는 머지 게임.',
    path: 'games/beauty/', logo: true, cover: 'covers/beauty.png', icon: 'covers/beauty_icon.png', time: '10~20분',
  },

  farm: {
    title: '더팜', en: 'The Farm', genre: '농장 SNG', color: '#3E8E2A',
    tagline: '공주가 맡은 시골 농장을 왕국 최고의 마을로',
    desc: '배추왕국의 라벤더 공주가 시골 농장을 맡았다! 밭에 작물을 심어 거두고, 젖소·닭을 키우고, 빵집·낙농 공방에서 물건을 만들어 마을 사람들의 주문과 왕국 기차에 실어 보내요. 집을 지어 주민을 늘리고 숲을 정리해 땅을 넓히는 농장 마을 만들기. 피처폰 명작 「더팜」 시리즈가 새로 돌아왔어요.',
    path: 'games/farm/', logo: true, cover: 'covers/farm.png', icon: 'covers/farm_icon.png', time: '10~15분',
  },

  tour: {
    title: 'K-다이스 투어', en: 'K-Dice Tour', genre: '보드게임', color: '#2E5FB8',
    tagline: '주사위를 굴려 한국 팔도의 땅을 사고 지어요',
    desc: '경복궁부터 제주 한라산까지, 한국 명소 32칸을 도는 여행 보드게임. 주사위를 굴려 땅을 사고 빌라·빌딩·호텔·랜드마크를 올려 통행료를 받아요. 상대 셋을 파산시키거나 한 줄·색 3개·관광지 4곳을 독점하면 우승! 성격이 다른 AI 상대와 한 판 15분.',
    path: 'games/tour/', logo: true, cover: 'covers/tour.png', icon: 'covers/tour_icon.png', time: '10~15분',
  },
};
// 별빛 궁수(archer)는 2026-10-22 사용자 요청으로 목록에서 내림 (CATALOG 항목·게임 소스는 남겨 둠)
export const ORDER = ['witch', 'ocean', 'racer', 'blocks', 'dice', 'war', 'seek', 'beauty', 'farm'];
// K-다이스 투어(tour)는 2026-10-24 사용자 요청으로 목록에서 내림 — 대전 네트워크(서버)가 붙으면 다시 올림 (CATALOG 항목·소스는 남겨 둠)
