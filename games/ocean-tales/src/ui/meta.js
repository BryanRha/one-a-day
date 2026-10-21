// 출석 보상 · 일일 미션 팝업 (지도에서 연다)
import { W, H, TXT } from '../config.js?v=0.17.5';
import { t } from '../i18n.js?v=0.17.5';
import { audio } from '../audio.js?v=0.17.5';
import { popup, button } from './widgets.js?v=0.17.5';
import { DAILY_REWARDS, ALL_BONUS, dailyState, claimDaily, missions, claimMission, canClaimBonus, claimBonus, today } from '../missions.js?v=0.17.5';

const BOOST_ICON = { hammer: 'boost_hammer', shuffle: 'boost_shuffle', swap: 'boost_swap', moves: 'boost_moves' };
const MISSION_ICON = {
  win3: ['star_big_on', 0.22], stars6: ['star_small_on', 0.9], crab: ['tile_red', 0.45], clown: ['tile_orange', 0.45], puffer: ['tile_yellow', 0.45],
  turtle: ['tile_green', 0.45], whale: ['tile_blue', 0.45], bomb5: ['tile_blue_bomb', 0.45], line8: ['tile_red_lineH', 0.45], make6: ['tile_rainbow', 0.45],
  oil30: ['obs_jelly_1', 0.45], cover15: ['obs_ice_2', 0.4], combo3: ['txt_combo_3', 0.09], restore1: ['ico_reef', 0.5],
};

// 보상 내용을 아이콘으로 (코인 + 부스터)
function rewardIcons(scene, box, x, y, r, size = 1) {
  const items = [];
  if (r.coins) items.push(['ico_coin', `${r.coins}`]);
  for (const [k, n] of Object.entries(r.boosters || {})) items.push([BOOST_ICON[k], `${n}`]);
  const gap = 92 * size, x0 = x - ((items.length - 1) * gap) / 2;
  items.forEach(([key, n], i) => {
    box.add(scene.add.image(x0 + i * gap, y, key).setScale((key === 'ico_coin' ? 0.44 : 0.4) * size));
    box.add(scene.add.text(x0 + i * gap, y + 36 * size, n, { ...TXT.small, fontSize: `${Math.round(26 * size)}px`, strokeThickness: 6 }).setOrigin(0.5));
  });
}

function fly(scene, from, key, n = 6) {
  for (let i = 0; i < n; i++) {
    const c = scene.add.image(from.x, from.y, key).setScale(0.35).setDepth(2000).setScrollFactor(0);
    scene.tweens.add({ targets: c, x: W / 2 - 180 + Math.random() * 40, y: 80, scale: 0.2, delay: i * 60, duration: 600, ease: 'Cubic.In', onComplete: () => c.destroy() });
  }
}

// ── 출석 보상: 7칸 달력, 오늘 칸을 받기
export function dailyPopup(scene, onDone) {
  const st = dailyState();
  const p = popup(scene, { title: t('dailyTitle'), width: 940, height: 980, onClose: onDone });
  const B = p.box;
  DAILY_REWARDS.forEach((r, i) => {
    const big = i === 6;
    const col = big ? 0 : i % 3, row = big ? 2 : Math.floor(i / 3);
    const x = big ? 0 : (col - 1) * 270, y = -270 + row * 230;
    const w = big ? 800 : 240, h = 200;
    const got = i < st.index || (i === st.index && !st.canClaim);
    const now = i === st.index && st.canClaim;
    const card = scene.add.nineslice(x, y, 'hud_goal_box', null, w, h, 40, 40, 40, 40).setAlpha(got ? 0.55 : 1);
    B.add(card);
    if (now) {
      const glow = scene.add.image(x, y, 'ptc_glow').setDisplaySize(w * 1.4, h * 1.6).setTint(0xFFE14D).setAlpha(0.5);
      B.addAt(glow, B.getIndex(card));
      scene.tweens.add({ targets: glow, alpha: 0.2, yoyo: true, repeat: -1, duration: 600 });
    }
    B.add(scene.add.text(x, y - 70, t('dailyDay', i + 1), { ...TXT.small, fontSize: '28px', color: now ? '#FFE14D' : '#FFFFFF', strokeThickness: 7 }).setOrigin(0.5));
    rewardIcons(scene, B, x, y - 5, r, big ? 1.1 : 0.9);
    if (got) B.add(scene.add.image(x + w / 2 - 40, y - h / 2 + 40, 'hud_goal_check').setScale(0.55));
  });
  if (st.canClaim) {
    const b = button(scene, 0, 400, t('dailyClaim'), () => {
      const r = claimDaily(); if (!r) return;
      audio.play('sfx_coin'); audio.play('sfx_star_slam'); audio.buzz(40);
      if (r.coins) fly(scene, { x: W / 2, y: H / 2 }, 'ico_coin', 8);
      scene.cameras.main.flash(200, 255, 255, 255);
      scene.time.delayedCall(450, () => p.close());
    }, { width: 460, height: 150, size: 54 });
    B.add(b);
  } else B.add(scene.add.text(0, 400, t('dailyNext'), TXT.dark).setOrigin(0.5));
  return p;
}

// ── 일일 미션: 3줄 + 모두 깨면 보너스
export function missionPopup(scene, onChange) {
  const p = popup(scene, { title: t('missionTitle'), width: 940, height: 1060 });
  const B = p.box;
  const render = () => {
    scene.events.once('postupdate', () => p.pin && p.pin());
    B.list.filter(o => o.meta).forEach(o => o.destroy());
    const tag = o => { o.meta = true; B.add(o); return o; };
    missions().forEach((m, i) => {
      const y = -300 + i * 200;
      tag(scene.add.nineslice(0, y, 'hud_goal_box', null, 820, 180, 40, 40, 40, 40));
      const [ik, sc] = MISSION_ICON[m.id] || ['ico_check', 0.4];
      tag(scene.add.image(-330, y, ik).setScale(sc));
      tag(scene.add.text(-250, y - 40, t(`missionText.${m.id}`), { ...TXT.dark, fontSize: '34px' }).setOrigin(0, 0.5));
      // 진행 막대
      const bw = 330;
      tag(scene.add.image(-250, y + 25, 'hud_score_bar_bg').setOrigin(0, 0.5).setDisplaySize(bw, 30));
      const f = tag(scene.add.image(-250, y + 25, 'hud_score_bar_fill').setOrigin(0, 0.5).setDisplaySize(bw, 30));
      f.setCrop(0, 0, f.width * Math.min(1, m.progress / m.target), f.height);
      tag(scene.add.text(-250 + bw + 20, y + 25, `${m.progress}/${m.target}`, { ...TXT.dark, fontSize: '28px' }).setOrigin(0, 0.5));
      // 보상 / 받기
      if (m.claimed) tag(scene.add.text(300, y, t('claimed'), { ...TXT.small, fontSize: '32px', color: '#9AE8BE', stroke: '#1E6A44' }).setOrigin(0.5));
      else if (m.progress >= m.target) {
        const b = tag(button(scene, 300, y, `${t('claim')} +${m.coins}`, () => { if (claimMission(m.id)) { audio.play('sfx_coin'); fly(scene, { x: W / 2 + 300, y: H / 2 + y }, 'ico_coin', 5); render(); onChange && onChange(); } }, { width: 230, height: 110, size: 32 }));
        scene.tweens.add({ targets: b, scale: 1.06, yoyo: true, repeat: -1, duration: 450 });
      } else {
        tag(scene.add.image(270, y, 'ico_coin').setScale(0.3));
        tag(scene.add.text(305, y, `${m.coins}`, { ...TXT.small, fontSize: '32px', stroke: '#7A3F00' }).setOrigin(0, 0.5));
      }
    });
    // 모두 깨면 보너스
    const by = 330;
    tag(scene.add.text(-180, by - 10, t('allBonus'), { ...TXT.dark, fontSize: '32px' }).setOrigin(0.5));
    const gift = tag(scene.add.image(60, by - 10, 'ico_gift').setScale(0.6));
    rewardIcons(scene, { add: o => tag(o) }, 240, by - 25, ALL_BONUS, 0.8);
    if (canClaimBonus()) {
      scene.tweens.add({ targets: gift, angle: { from: -10, to: 10 }, yoyo: true, repeat: -1, duration: 120 });
      tag(button(scene, 0, 440, t('claim'), () => { if (claimBonus()) { audio.play('sfx_world_clear'); fly(scene, { x: W / 2, y: H / 2 + by }, 'ico_coin', 10); render(); onChange && onChange(); } }, { width: 380, height: 130, size: 46 }));
    } else {
      // 다음 미션까지 남은 시간
      const end = new Date(); end.setHours(24, 0, 0, 0);
      const left = Math.max(0, end - Date.now());
      const hh = String(Math.floor(left / 3600000)).padStart(2, '0'), mm = String(Math.floor(left / 60000) % 60).padStart(2, '0');
      tag(scene.add.text(0, 440, t('newMissionIn', `${hh}:${mm}`), { ...TXT.body, fontSize: '30px' }).setOrigin(0.5));
    }
  };
  render();
  return p;
}

export { today };
