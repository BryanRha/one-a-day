// 바다 복원: 월드마다 6개 과제를 별로 하나씩 해결한다 (오염 걷어내기 → 생물이 돌아옴).
// 비용 합계: 월드 1~3 은 18개, 4~10 은 24개 → 평균 별 2.2개 정도로 깨면 끝까지 복원할 수 있는 수준.
const THEME = {
  1: { coral: 'map_deco_coral_tree', home: 'map_deco_shell', friends: ['tile_orange', 'tile_red', 'tile_yellow'] },
  2: { coral: 'map_deco_coral_fan', home: 'map_deco_rock', friends: ['tile_green', 'tile_orange', 'item_drop_b'] },
  3: { coral: 'map_deco_coral_fan', home: 'map_deco_anchor', friends: ['tile_blue', 'tile_purple', 'map_deco_jellyfish'] },
  4: { coral: 'map_deco_coral_tree', home: 'map_deco_shell', friends: ['tile_orange', 'tile_yellow', 'item_drop_a'] },
  5: { coral: 'map_deco_coral_fan', home: 'map_deco_chest', friends: ['tile_red', 'tile_blue', 'tile_green'] },
  6: { coral: 'map_deco_coral_tree', home: 'map_deco_rock', friends: ['tile_yellow', 'tile_blue', 'tile_purple'] },
  7: { coral: 'map_deco_coral_fan', home: 'map_deco_shell', friends: ['tile_purple', 'tile_blue', 'item_collect_star'] },
  8: { coral: 'map_deco_coral_tree', home: 'map_deco_anchor', friends: ['tile_purple', 'tile_red', 'tile_orange'] },
  9: { coral: 'map_deco_coral_fan', home: 'map_deco_urchin', friends: ['map_deco_jellyfish', 'item_drop_b', 'tile_purple'] },
  10: { coral: 'map_deco_coral_tree', home: 'map_deco_chest', friends: ['tile_red', 'tile_orange', 'tile_yellow', 'tile_green', 'tile_blue', 'tile_purple'] },
};
const BASE_COST = [2, 2, 3, 3, 4, 4];
export const RESTORE_TASKS = 6;
export const TASK_COINS = 20;
export const WORLD_COINS = 200;

export function restoreTheme(world) { return THEME[((world - 1) % 10) + 1] || THEME[1]; }
export function taskCost(world, i) { return BASE_COST[i] + (world >= 4 ? 1 : 0); }
