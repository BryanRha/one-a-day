// 공용 UI 위젯: 버튼 · 아이콘 버튼 · 팝업 · 토스트
import { W, H, TXT, FONT, INK } from '../config.js?v=0.11.3';
import { audio } from '../audio.js?v=0.11.3';
import { pushBack } from '../oad.js?v=0.11.3';

// 9-slice 버튼 (btn_primary / btn_secondary) + 글자
export function button(scene, x, y, label, onClick, { kind = 'primary', width = 480, height = 150, size = 56 } = {}) {
  const key = `btn_${kind}`;
  const c = scene.add.container(x, y);
  const slice = kind === 'primary' ? 70 : 56;
  // 주요 버튼 뒤에서 은은하게 숨 쉬는 빛 (가산 혼합)
  if (kind === 'primary') {
    const halo = scene.add.image(0, 6, 'ptc_glow').setDisplaySize(width * 1.35, height * 1.9).setTint(0xFFB070).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
    c.add(halo);
    scene.tweens.add({ targets: halo, alpha: 0.12, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.InOut' });
  }
  const bg = scene.add.nineslice(0, 0, key, null, width, height, slice, slice, 0, 0);
  const txt = scene.add.text(0, -8, label, { ...TXT.mid, fontSize: `${size}px`, stroke: kind === 'primary' ? '#8A2E08' : '#0B5E58' }).setOrigin(0.5);
  c.add([bg, txt]);
  c.setSize(width, height);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => { bg.setTexture(`${key}_pressed`); txt.y = 0; c.setScale(0.98); });
  const release = () => { bg.setTexture(key); txt.y = -8; c.setScale(1); };
  c.on('pointerout', release);
  c.on('pointerup', () => { release(); audio.play('sfx_click'); onClick && onClick(); });
  c.label = txt;
  return c;
}

// 원형 아이콘 버튼 (btn_icon_bg + ico_*)
export function iconButton(scene, x, y, icon, onClick, { size = 120, bg = 'btn_icon_bg' } = {}) {
  const c = scene.add.container(x, y);
  const b = scene.add.image(0, 0, bg).setDisplaySize(size, size);
  const ic = scene.add.image(0, -size * 0.04, icon).setDisplaySize(size * 0.62, size * 0.62);
  c.add([b, ic]);
  c.setSize(size, size);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => { if (scene.textures.exists(`${bg}_pressed`)) b.setTexture(`${bg}_pressed`); ic.y = size * 0.02; });
  const release = () => { b.setTexture(bg); ic.y = -size * 0.04; };
  c.on('pointerout', release);
  c.on('pointerup', () => { release(); audio.play('sfx_click'); onClick && onClick(); });
  c.icon = ic;
  return c;
}

// 모달 팝업. 반환된 container 에 내용을 add 하고, close() 로 닫는다.
export function popup(scene, { title, width = 900, height = 1100, onClose, closeButton = true, onBack } = {}) {
  const o = { onBack };
  const layer = scene.add.container(0, 0).setDepth(1000);
  // 배경: 옅은 남색 + 가장자리 비네트 (단색으로 덮지 않고 뒤 화면이 비쳐 보이게)
  const dim = scene.add.rectangle(W / 2, H / 2, W * 2, H * 2, 0x06204A, 0.32).setInteractive();
  const vig = scene.add.image(W / 2, H / 2, 'ui_vignette').setDisplaySize(W * 1.25, H * 1.15);
  const box = scene.add.container(W / 2, H / 2);
  // 유리 패널 뒤 후광
  const halo = scene.add.image(0, 0, 'ptc_glow').setDisplaySize(width * 1.6, height * 1.35).setTint(0xBFEFFF).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD);
  const panel = scene.add.nineslice(0, 0, 'popup_panel', null, width, height, 96, 96, 96, 96);
  box.add([halo, panel]);
  if (title) {
    const rib = scene.add.image(0, -height / 2 + 10, 'popup_ribbon').setDisplaySize(Math.min(width + 120, 980), 220);
    const tt = scene.add.text(0, -height / 2 - 4, title, { ...TXT.big, stroke: '#0B3E8A' }).setOrigin(0.5);
    box.add([rib, tt]);
  }
  layer.add([dim, vig, box]);
  vig.alpha = 0; scene.tweens.add({ targets: vig, alpha: 1, duration: 250 });
  const close = (silent) => {
    if (layer.closing) return; layer.closing = true;
    if (!silent) audio.play('sfx_popup_close');
    scene.tweens.add({ targets: box, scale: 0.8, alpha: 0, duration: 160, ease: 'Back.In' });
    scene.tweens.add({ targets: [dim, vig], alpha: 0, duration: 180, onComplete: () => { layer.destroy(); onClose && onClose(); } });
  };
  if (closeButton) {
    const x = iconButton(scene, width / 2 - 30, -height / 2 + 30, 'ico_plus', () => close(), { size: 110, bg: 'btn_close' });
    x.icon.setVisible(false);
    box.add(x);
  }
  // 뒤로가기 (One a Day): 맨 위 팝업부터 — 닫을 수 있으면 닫고, 닫기 없는 창은 onBack 이 있으면 그것(예: 일시정지 → 계속하기), 없으면 그대로 둠
  const unback = pushBack(() => { if (layer.closing) return false; if (o.onBack) { o.onBack(); return true; } if (!closeButton) return true; close(); return true; });
  layer.once('destroy', unback);
  box.setScale(0.82); box.alpha = 0; box.y += 40;
  scene.tweens.add({ targets: box, scale: 1, alpha: 1, y: H / 2, duration: 320, ease: 'Back.Out' });
  audio.play('sfx_popup_open');
  layer.box = box; layer.close = close; layer.panelH = height; layer.panelW = width;
  // 스크롤되는 화면(지도)에서도 팝업은 화면에 고정: 지금과 이 프레임에 추가될 내용까지 고정
  pin(layer);
  scene.events.once('postupdate', () => pin(layer));
  layer.pin = () => pin(layer);
  return layer;
}

export function pin(o) {
  if (o.setScrollFactor) o.setScrollFactor(0);
  if (o.list) o.list.forEach(pin);
}

export function toast(scene, msg, y = H * 0.45) {
  const t = scene.add.text(W / 2, y, msg, { ...TXT.mid, fontSize: '42px', align: 'center', wordWrap: { width: W - 120, useAdvancedWrap: true } }).setOrigin(0.5).setDepth(2000).setScrollFactor(0);
  t.setScale(0.6); t.alpha = 0;
  scene.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 200, ease: 'Back.Out' });
  scene.tweens.add({ targets: t, alpha: 0, y: y - 80, delay: 1300, duration: 400, onComplete: () => t.destroy() });
  return t;
}

// 별 3개 (결과·맵용)
export function starsRow(scene, x, y, n, { size = 150, gap = 170, key = 'big', animate = false } = {}) {
  const c = scene.add.container(x, y);
  for (let i = 0; i < 3; i++) {
    const s = scene.add.image((i - 1) * gap, i === 1 ? -size * 0.18 : 0, `star_${key}_off`).setDisplaySize(size, size);
    c.add(s);
    if (i < n) {
      const on = scene.add.image(s.x, s.y, `star_${key}_on`).setDisplaySize(size, size);
      c.add(on);
      if (animate) {
        on.setScale(0); on.alpha = 0;
        scene.tweens.add({ targets: on, scaleX: size / on.width, scaleY: size / on.height, alpha: 1, delay: 300 + i * 350, duration: 380, ease: 'Back.Out',
          onStart: () => audio.play(`sfx_star_${i + 1}`) });
      }
    }
  }
  return c;
}

export function label(scene, x, y, text, style = TXT.mid) {
  return scene.add.text(x, y, text, style).setOrigin(0.5);
}

export { FONT, INK };

// 빛 계열 이미지(빛·빛줄기·고리·반짝이·폭발 시트)는 가산 혼합으로 그려서 실제로 빛나 보이게
const GLOW = new Set(['ptc_glow', 'ptc_rays', 'ptc_ring', 'ptc_spark', 'fx_bomb', 'fx_rainbow_orb', 'fx_special_create', 'fx_star_burst', 'fx_line_h', 'fx_line_v', 'fx_rainbow_beam']);
export function enableGlow(scene) {
  if (scene.__glowOn) return;        // scene.restart 때 같은 장면 객체가 재사용되므로 한 번만 등록
  scene.__glowOn = true;
  scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, go => {
    const k = go.texture && go.texture.key;
    if (k && GLOW.has(k) && go.blendMode === Phaser.BlendModes.NORMAL) go.setBlendMode(Phaser.BlendModes.ADD);
  });
}
