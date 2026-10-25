// 게임 TIP — 공략 · 농장 상식 · 더팜 이야기. 로딩·레벨 시작·실패 화면에서 무작위로 보여준다.
const TIPS = {
  ko: [
    // 공략
    '보드 아래쪽에서 맞추면 연쇄가 더 잘 일어나요!',
    '4개를 한 줄로 맞추면 줄 블록이 생겨요.',
    'L자나 T자로 맞추면 황금 폭탄이 생겨요!',
    '5개를 일렬로 맞추면 황금 배추가 생겨요.',
    '황금 배추 두 개를 바꾸면 보드 전체가 터지는 황금 배추 폭풍!',
    '줄 블록 둘을 바꾸면 십자 모양으로 터져요.',
    '폭탄과 줄 블록을 바꾸면 굵은 십자 폭발이 일어나요!',
    '황금 배추와 특수 블록을 바꾸면 같은 작물이 모두 특수 블록으로 변해요.',
    '가시 잡초는 2턴 동안 하나도 안 치우면 번져요. 먼저 뽑으세요!',
    '벌집의 숫자가 0이 되기 전에 옆에서 맞춰서 치워요.',
    '삽은 원하는 칸 하나를 바로 깨요. 마지막 한 칸에 딱!',
    '밧줄에 묶인 작물은 같은 작물과 맞추면 풀려나요.',
    '남은 이동이 많을수록 보너스 점수가 커져요.',
    '연속으로 깨면 특수 블록을 들고 시작해요!',
    // 농장 상식
    '딸기는 씨가 겉에 붙어 있는 신기한 열매예요.',
    '당근은 원래 보라색이었대요. 주황 당근은 나중에 생겼어요.',
    '옥수수 수염 한 가닥은 알 하나와 이어져 있어요.',
    '블루베리는 꽃이 지고 약 두 달 뒤에 익어요.',
    '포도 한 송이에는 알이 100개 넘게 달리기도 해요.',
    '배추는 서늘한 가을에 가장 맛있게 자라요.',
    '꿀벌 한 마리는 평생 꿀을 한 숟가락쯤 모아요.',
    '병아리는 태어나자마자 엄마 닭을 졸졸 따라다녀요.',
    // 더팜 이야기
    '샘은 참새 쫓기에서 한 번도 진 적이 없대요.',
    '라벤더 공주는 배추왕국에서 온 새 농장 주인이에요.',
    '한스의 망치질 소리가 들리면 새 건물이 생긴대요.',
    '퍼즐에서 모은 코인은 마을 코인과 똑같이 쓸 수 있어요!',
  ],
  en: [
    'Matches near the bottom start more chain reactions!',
    'Match 4 in a row to make a light-beam friend.',
    'Match in an L or T shape for a starburst bomb!',
    'Match 5 in a row to make a rainbow pearl.',
    'Swap two pearls for a board-clearing Pearl Storm!',
    'Swap two light-beam friends for a cross blast.',
    'Swap a bomb with a light beam for a giant cross!',
    'Swap two bombs for a much bigger explosion.',
    'Swap a pearl with a special friend to turn that color into specials.',
    'Clear sea mines before their number hits 0.',
    'Polluted kelp spreads if you don’t clear any for 2 turns!',
    'Clear the pieces below the baby friends to bring them down.',
    'More moves left means more points in Bonus Time.',
    'Stuck? Shake things up with the Whirlpool.',
    'The Trident breaks any one tile. Perfect for the last one!',
    'Match a netted friend with its buddies to set it free.',
    'Thick ice takes several hits to break.',
    'Your first 3-star clear gives +30 bonus coins!',
    'Clear every 5th level for the first time to get a booster gift.',
    'Wait a moment and a possible match will sparkle.',
    'An octopus has three hearts and blue blood.',
    'Clownfish are born male; the biggest in the group becomes female.',
    'Sea turtles return to the beach where they hatched to lay eggs.',
    'Pufferfish gulp water to puff up when they feel danger.',
    'Crab legs bend sideways, so walking sideways is easier.',
    'Humpback whales sing songs that can last over 20 minutes.',
    'Starfish can regrow lost arms.',
    'Jellyfish have no brain and no heart.',
    'Seahorse dads give birth from a pouch on their belly.',
    'Coral looks like a plant, but it is actually an animal.',
    'Tiny ocean plankton make about half of the oxygen we breathe.',
    'The blue whale is the largest animal that has ever lived.',
    'The ocean covers about 70% of Earth’s surface.',
    'Giant kelp can grow more than 50 cm in a single day.',
    'Octopuses change color in a flash to hide.',
    'Mongi the baby whale is still practicing that water spout!',
    'Mongi’s orange scarf was knitted by Grandma Whale.',
    'The pufferfish gets round when surprised. Don’t startle it!',
    'The octopus wishes it could squirt laughter instead of ink.',
    'The crab is practicing walking forward.',
  ],
};

let lang = 'en';
try { lang = (navigator.language || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en'; } catch { /* node */ }
const recent = [];

// 최근에 나온 10개는 피해서 무작위로
export function pickTip() {
  const list = TIPS[lang];
  let i;
  do { i = Math.floor(Math.random() * list.length); } while (recent.includes(i) && recent.length < list.length);
  recent.push(i); if (recent.length > 10) recent.shift();
  return `TIP  ${list[i]}`;
}
