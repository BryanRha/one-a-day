// 바다 친구 도감 · 업적 팝업 (지도에서 연다)
import { W, H, TXT } from '../config.js?v=0.40.0';
import { t } from '../i18n.js?v=0.40.0';
import { audio } from '../audio.js?v=0.40.0';
import { popup, button } from './widgets.js?v=0.40.0';
import { DEX, DEX_COINS, ACH, stat, dexLevel, dexClaimed, claimDex, achDone, achClaimed, claimAch } from '../progress.js?v=0.40.0';

const fit = (img, size) => img.setScale(Math.min(size / img.width, size / img.height));

function coinBurst(scene, x, y, n = 6) {
  for (let i = 0; i < n; i++) {
    const c = scene.add.image(x, y, 'ico_coin').setScale(0.35).setDepth(2000).setScrollFactor(0);
    scene.tweens.add({ targets: c, x: W / 2 - 180, y: 80, scale: 0.2, delay: i * 50, duration: 600, ease: 'Cubic.In', onComplete: () => c.destroy() });
  }
}

function tierStars(scene, box, x, y, lv, size = 46) {
  for (let i = 0; i < 3; i++) box.add(scene.add.image(x + (i - 1) * (size + 6), y, i < lv ? 'star_small_on' : 'star_small_off').setDisplaySize(size, size));
}

// ── 도감: 3 × 4 카드, 누르면 자세히
export function dexPopup(scene, onChange) {
  const p = popup(scene, { title: t('dexTitle'), width: 960, height: 1340 });
  const B = p.box;
  const render = () => {
    B.list.filter(o => o.meta).forEach(o => o.destroy());
    const tag = o => { o.meta = true; B.add(o); return o; };
    DEX.forEach((e, i) => {
      const x = ((i % 3) - 1) * 285, y = -455 + Math.floor(i / 3) * 285;
      const lv = dexLevel(e), claimable = lv > dexClaimed(e.id);
      if (claimable) {
        const g = tag(scene.add.image(x, y, 'ptc_glow').setDisplaySize(330, 330).setTint(0xFFE14D).setAlpha(0.55));
        scene.tweens.add({ targets: g, alpha: 0.2, yoyo: true, repeat: -1, duration: 600 });
      }
      const card = tag(scene.add.nineslice(x, y, 'hud_goal_box', null, 260, 260, 40, 40, 40, 40).setInteractive({ useHandCursor: true }));
      card.on('pointerup', () => { audio.play('sfx_click'); dexDetail(scene, e, () => { render(); onChange && onChange(); }); });
      const img = tag(fit(scene.add.image(x, y - 25, e.key), 140));
      if (!lv) { img.setTint(0x1C2A55).setAlpha(0.55); tag(scene.add.text(x, y - 25, '?', { ...TXT.big, fontSize: '70px' }).setOrigin(0.5)); }
      tag(scene.add.text(x, y + 72, lv ? t(`dexNames.${e.id}`) : '???', { ...TXT.dark, fontSize: '28px' }).setOrigin(0.5));
      const stars = []; tierStars(scene, { add: o => stars.push(tag(o)) }, x, y + 108, lv, 30);
      if (claimable) tag(scene.add.circle(x + 105, y - 105, 20, 0xFF3B4A).setStrokeStyle(4, 0xffffff));
    });
    p.pin && p.pin();
  };
  render();
  return p;
}

function dexDetail(scene, e, onChange) {
  const p = popup(scene, { title: t(`dexNames.${e.id}`), width: 860, height: 1000 });
  const B = p.box;
  const lv = dexLevel(e);
  const img = fit(scene.add.image(0, -230, e.key), 300);
  if (!lv) img.setTint(0x1C2A55).setAlpha(0.55);
  B.add(img);
  scene.tweens.add({ targets: img, y: img.y - 14, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut' });
  tierStars(scene, B, 0, -40, lv, 64);
  B.add(scene.add.text(0, 60, lv ? t(`dexFacts.${e.id}`) : t('dexLocked'), { ...TXT.body, fontSize: '32px', wordWrap: { width: 700, useAdvancedWrap: true }, lineSpacing: 8 }).setOrigin(0.5));
  const v = stat(e.stat);
  const next = e.tiers[lv];
  B.add(scene.add.text(0, 200, next ? `${t(`dexHow.${e.id}`)} · ${t('dexNext')} ${Math.min(v, next)}/${next}` : t('dexMax'), { ...TXT.dark, fontSize: '30px' }).setOrigin(0.5));
  const got = dexClaimed(e.id);
  if (lv > got) {
    let coins = 0; for (let i = got; i < lv; i++) coins += DEX_COINS[i];
    const b = button(scene, 0, 360, `${t('claim')} +${coins}`, () => {
      const c = claimDex(e.id); if (!c) return;
      audio.play('sfx_coin'); audio.play('sfx_star_slam'); coinBurst(scene, W / 2, H / 2 + 360, 8);
      p.close(); onChange && onChange();
    }, { width: 420, height: 140, size: 46 });
    B.add(b);
  }
  p.pin && p.pin();
}

// ── 업적: 한 쪽에 6개씩, 화살표로 넘김
export function achPopup(scene, onChange) {
  const p = popup(scene, { title: t('achTitle'), width: 940, height: 1300 });
  const B = p.box;
  const PER = 6, pages = Math.ceil(ACH.length / PER);
  // 받을 것이 있는 쪽부터 보여 줌
  const firstClaim = ACH.findIndex(a => achDone(a) && !achClaimed(a.id));
  let page = firstClaim >= 0 ? Math.floor(firstClaim / PER) : 0;
  const render = () => {
    B.list.filter(o => o.meta).forEach(o => o.destroy());
    const tag = o => { o.meta = true; B.add(o); return o; };
    ACH.slice(page * PER, page * PER + PER).forEach((a, i) => {
      const y = -440 + i * 160;
      const done = achDone(a), claimed = achClaimed(a.id);
      tag(scene.add.nineslice(0, y, 'hud_goal_box', null, 840, 145, 40, 40, 40, 40).setAlpha(claimed ? 0.6 : 1));
      // 메달
      tag(scene.add.circle(-340, y, 46, done ? 0xFFC21F : 0xB9C2CC).setStrokeStyle(6, done ? 0x8A5200 : 0x6A7380));
      tag(fit(scene.add.image(-340, y, done ? 'ico_trophy' : 'ico_lock'), 64).setAlpha(done ? 1 : 0.7));
      tag(scene.add.text(-270, y - 22, t(`achText.${a.id}`), { ...TXT.dark, fontSize: '32px' }).setOrigin(0, 0.5));
      const v = Math.min(stat(a.stat), a.n);
      const bw = 300;
      tag(scene.add.image(-270, y + 28, 'hud_score_bar_bg').setOrigin(0, 0.5).setDisplaySize(bw, 26));
      const f = tag(scene.add.image(-270, y + 28, 'hud_score_bar_fill').setOrigin(0, 0.5).setDisplaySize(bw, 26));
      f.setCrop(0, 0, f.width * (v / a.n), f.height);
      tag(scene.add.text(-270 + bw + 16, y + 28, `${v}/${a.n}`, { ...TXT.dark, fontSize: '24px' }).setOrigin(0, 0.5));
      if (claimed) tag(scene.add.image(320, y, 'hud_goal_check').setScale(0.6));
      else if (done) {
        const b = tag(button(scene, 310, y, `+${a.coins}`, () => {
          if (claimAch(a.id)) { audio.play('sfx_coin'); audio.play('sfx_star_3'); coinBurst(scene, W / 2 + 310, H / 2 + y, 6); render(); onChange && onChange(); }
        }, { width: 200, height: 100, size: 36 }));
        scene.tweens.add({ targets: b, scale: 1.07, yoyo: true, repeat: -1, duration: 450 });
      } else {
        tag(scene.add.image(290, y, 'ico_coin').setScale(0.28));
        tag(scene.add.text(320, y, `${a.coins}`, { ...TXT.small, fontSize: '30px', stroke: '#7A3F00' }).setOrigin(0, 0.5));
      }
    });
    tag(scene.add.text(0, 520, `${page + 1} / ${pages}`, TXT.dark).setOrigin(0.5));
    if (page > 0) tag(button(scene, -280, 520, '◀', () => { page--; render(); }, { kind: 'secondary', width: 160, height: 100, size: 40 }));
    if (page < pages - 1) tag(button(scene, 280, 520, '▶', () => { page++; render(); }, { kind: 'secondary', width: 160, height: 100, size: 40 }));
    p.pin && p.pin();
  };
  render();
  return p;
}
