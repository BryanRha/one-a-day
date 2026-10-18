// 게임 TIP — 공략 · 바다 상식(실제 사실) · 캐릭터 이야기. 로딩·레벨 시작·실패 화면에서 무작위로 보여준다.
const TIPS = {
  ko: [
    // 공략
    '보드 아래쪽에서 맞추면 연쇄가 더 잘 일어나요!',
    '4마리를 한 줄로 맞추면 빛줄기 친구가 생겨요.',
    'L자나 T자로 맞추면 별빛 폭탄이 생겨요!',
    '5마리를 일렬로 맞추면 무지개 진주가 생겨요.',
    '진주 두 개를 바꾸면 보드 전체가 터지는 Pearl Storm!',
    '빛줄기 친구 둘을 바꾸면 십자 모양으로 터져요.',
    '폭탄과 빛줄기를 바꾸면 굵은 십자 폭발이 일어나요!',
    '폭탄 두 개를 바꾸면 훨씬 넓게 터져요.',
    '진주와 특수 친구를 바꾸면 같은 색 친구가 모두 특수 친구로 변해요.',
    '기뢰는 숫자가 0이 되기 전에 옆에서 맞춰 없애 주세요.',
    '오염 해초는 2턴 동안 하나도 안 치우면 번져요. 먼저 치우세요!',
    '방울 속 아기 친구는 아래쪽을 비워야 내려와요.',
    '남은 이동이 많을수록 보너스 타임 점수가 커져요.',
    '막혔다면 소용돌이로 보드를 섞어 보세요.',
    '삼지창은 원하는 칸 하나를 바로 깨요. 마지막 한 칸에 딱!',
    '어망에 걸린 친구는 같은 친구와 맞추면 풀려나요.',
    '두꺼운 얼음은 여러 번 맞혀야 깨져요.',
    '별 3개를 처음 받으면 보너스 코인 +30!',
    '5레벨마다 처음 클리어하면 부스터 선물이 있어요.',
    '잠깐 기다리면 맞출 수 있는 곳을 반짝여서 알려 줘요.',
    // 바다 상식
    '문어는 심장이 3개이고, 피는 파란색이에요.',
    '흰동가리는 수컷으로 태어나고, 무리에서 가장 큰 물고기가 암컷이 돼요.',
    '바다거북은 자기가 태어난 해변으로 돌아와 알을 낳아요.',
    '복어는 위험을 느끼면 물을 들이켜 몸을 크게 부풀려요.',
    '게는 다리 관절이 옆으로 굽어서 옆걸음이 편해요.',
    '혹등고래는 노래를 불러요. 한 곡이 20분 넘게 이어지기도 해요.',
    '불가사리는 팔이 떨어져도 다시 자라나요.',
    '해파리는 뇌도 심장도 없어요.',
    '해마는 아빠가 배 주머니에서 새끼를 낳아요.',
    '산호는 식물처럼 보이지만 사실 동물이에요.',
    '우리가 마시는 산소의 절반쯤은 바다의 작은 플랑크톤이 만들어요.',
    '대왕고래는 지구에 살았던 동물 중 가장 커요.',
    '바다는 지구 표면의 약 70%를 덮고 있어요.',
    '거대한 해초는 하루에 50cm 넘게 자라기도 해요.',
    '문어는 순식간에 몸 색을 바꿔 주변에 숨어요.',
    // 캐릭터 이야기
    '몽이는 아직 물줄기를 높이 못 뿜어요. 매일 연습 중!',
    '몽이의 주황 스카프는 할머니 고래가 떠 주신 거래요.',
    '복어 친구는 깜짝 놀라면 동그래져요. 놀래키지 마세요!',
    '문어 친구는 먹물 대신 웃음을 뿜고 싶대요.',
    '꽃게 친구는 앞으로 걷는 연습을 하고 있어요.',
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
