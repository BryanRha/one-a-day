// 인게임: 엔진(core/engine.js)이 만든 steps 를 순서대로 애니메이션으로 재생한다.
import { W, H, CELL, TXT, COLOR_HEX, COLOR_NAMES, BOOSTER_PRICE, asset, themeOf } from '../config.js?v=0.55.0';
import { Engine } from '../core/engine.js?v=0.55.0';
import { LEVELS } from '../core/levels.js?v=0.55.0';
import { t } from '../i18n.js?v=0.55.0';
import { audio, WORLD_BGM } from '../audio.js?v=0.55.0';
import { pickTip } from '../tips.js?v=0.55.0';
import { track, flush, onMissionDone } from '../missions.js?v=0.55.0';
import { load, save, addStreak, breakStreak, recordWin, addCoins, addBooster, spendCoins, useBooster } from '../save.js?v=0.55.0';
import { button, iconButton, popup, toast, starsRow, enableGlow } from '../ui/widgets.js?v=0.55.0';
import { inOAD, exitToOAD } from '../oad.js?v=0.55.0';

const BOARD_TOP = 436;
// 별 게이지: 별 3개를 같은 간격에 두고, 점수는 별 사이 구간별로 선형 보간 (기준 점수 간격이 달라도 보기 좋게)
const STAR_POS = [0.3, 0.62, 0.94];
function starProgress(score, th) {
  const pts = [[0, 0], [th[0], STAR_POS[0]], [th[1], STAR_POS[1]], [th[2], STAR_POS[2]], [th[2] * 1.15, 1]];
  for (let i = 1; i < pts.length; i++) {
    const [s0, p0] = pts[i - 1], [s1, p1] = pts[i];
    if (score <= s1) return p0 + (p1 - p0) * Math.max(0, (score - s0) / Math.max(1, s1 - s0));
  }
  return 1;
}
const wait = (scene, ms) => new Promise(res => scene.time.delayedCall(ms, res));
const tweenP = (scene, cfg) => new Promise(res => scene.tweens.add({ ...cfg, onComplete: () => { cfg.onDone && cfg.onDone(); res(); } }));

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.levelId = data.levelId || 1;
    this.level = LEVELS.find(l => l.id === this.levelId);
    // scene.restart 는 같은 장면 객체를 다시 쓰므로, 판마다 바뀌는 표시는 여기서 초기화
    this.worldCleared = null; this.comboImg = null; this.ptcLive = 0; this.pendingPause = false;
    this.engine = new Engine(this.level, (Date.now() % 1e9) | 0);
    this.sprites = new Map();
    this.jellySprites = new Map();
    this.busy = true;
    this.selected = null;
    this.armed = null;          // 'hammer' | 'swap'
    this.speed = 1;
    this.hintTimer = null;
    this.lastScore = 0;
    this.pendingPause = false;
    this.explained = new Set();
  }
  preload() {
    // 이 월드 배경만 메모리에 둔다 (10개 월드 배경을 한꺼번에 올리면 폰 GPU 메모리가 부족)
    const key = `bg_game_${themeOf(this.level.world)}`;
    for (const k of this.textures.getTextureKeys()) if (k.startsWith('bg_game_') && k !== key) this.textures.remove(k);
    if (!this.textures.exists(key)) this.load.image(key, asset(`assets/img/${key}.png`));
  }


  create() {
    if (!this.textures.exists('glint')) {
      const g = this.make.graphics({ add: false });
      for (let i = 0; i < 12; i++) { g.fillStyle(0xFFFFFF, 0.08 + i * 0.02); g.fillRoundedRect(i * 1.2, 6 + i * 2, 30 - i * 2.4, 138 - i * 4, 10); }
      g.generateTexture('glint', 30, 150); g.destroy();
    }
    enableGlow(this);
    const offMission = onMissionDone(def => this.missionToast(def));
    this.events.once('shutdown', offMission);
    const s = this.engine.s;
    this.boardBottom = H - 270;
    const bg = this.add.image(W / 2, H / 2, `bg_game_${themeOf(this.level.world)}`);
    bg.setScale(Math.max(W / bg.width, H / bg.height));
    // 보드 배율: 작은 보드는 화면에 맞게 키움 (최대 1.3배). 보드 레이어들은 모두 같은 변환(ox, oy, k)을 쓴다.
    const availH = this.boardBottom - BOARD_TOP - 60;
    this.k = Math.min(1.3, (W - 70) / (s.w * CELL), availH / (s.h * CELL));
    this.cs = CELL * this.k;
    this.ox = Math.round((W - s.w * this.cs) / 2);
    this.oy = Math.round((BOARD_TOP + this.boardBottom) / 2 - (s.h * this.cs) / 2);
    const layer = depth => this.add.container(this.ox, this.oy).setScale(this.k).setDepth(depth);
    this.cellLayer = layer(1); this.jellyLayer = layer(2); this.frameLayer = layer(3);
    this.pieceLayer = layer(5); this.overLayer = layer(6); this.fxLayer = layer(10);
    this.drawBoard();
    const maskG = this.make.graphics({}, false);
    maskG.fillStyle(0xffffff);
    this.engine.each((cl, r, c) => maskG.fillRect(this.ox + c * this.cs - 2, this.oy + r * this.cs - 2, this.cs + 4, this.cs + 4));
    this.pieceLayer.setMask(maskG.createGeometryMask());
    this.selectFx = this.add.image(0, 0, 'ovl_select').setVisible(false).setDisplaySize(CELL + 8, CELL + 8);
    this.overLayer.add(this.selectFx);
    this.engine.each((cl, r, c) => { if (cl.p) this.makeSprite(cl.p, r, c, cl.cover); });
    this.buildHUD();
    this.buildBoosters();
    this.setupInput();
    audio.music(`bgm_game_${WORLD_BGM[(this.level.world - 1) % WORLD_BGM.length]}`, this);
    audio.intensity(0);
    this.cameras.main.fadeIn(250, 189, 235, 255);
    this.levelStartPopup();
  }

  // ═══ 보드 그리기 ═══════════════════════════════════════════
  xy(r, c) { return { x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 }; }            // 보드 레이어 내부 좌표
  toWorld(p) { return { x: this.ox + p.x * this.k, y: this.oy + p.y * this.k }; }

  drawBoard() {
    const e = this.engine;
    const g = this.add.graphics();
    this.cellLayer.add(g);
    // 캔디크러쉬처럼 어두운 반투명 남색 보드 → 파스텔 블록이 또렷하게 떠 보임
    g.fillStyle(0x0A2350, 0.62);
    e.each((cl, r, c) => g.fillRect(c * CELL, r * CELL, CELL, CELL));
    e.each((cl, r, c) => {
      if ((r + c) % 2) { g.fillStyle(0x2A5CA8, 0.22); g.fillRect(c * CELL, r * CELL, CELL, CELL); }
      if (cl.jelly > 0) this.addJelly(r, c, cl.jelly);
    });
    // 테두리: 구멍/바깥과 맞닿은 변마다 직선, 바깥 모서리에는 코너 조각
    const has = (r, c) => !!e.cell(r, c);
    const B = 20; // 띠 두께 (1x)
    e.each((cl, r, c) => {
      const { x, y } = this.xy(r, c);
      const open = { t: !has(r - 1, c), b: !has(r + 1, c), l: !has(r, c - 1), r: !has(r, c + 1) };
      const edge = (dx, dy, ang) => this.frameLayer.add(this.add.image(x + dx, y + dy, 'board_frame_edge').setAngle(ang).setDisplaySize(CELL, CELL));
      if (open.t) edge(0, -B, 0);
      if (open.b) edge(0, B, 180);
      if (open.l) edge(-B, 0, -90);
      if (open.r) edge(B, 0, 90);
      const corner = (dx, dy, ang) => this.frameLayer.add(this.add.image(x + dx, y + dy, 'board_frame_corner_out').setAngle(ang).setDisplaySize(CELL, CELL));
      if (open.t && open.l) corner(-B, -B, 0);
      if (open.t && open.r) corner(B, -B, 90);
      if (open.b && open.r) corner(B, B, 180);
      if (open.b && open.l) corner(-B, B, -90);
    });
    if (e.goal('drop')) {
      for (const key of Object.keys(e.s.exits)) {
        const [r, c] = key.split(',').map(Number);
        const { x, y } = this.xy(r, c);
        const a = this.add.image(x, y + CELL / 2 + 46, 'board_exit').setScale(0.36);
        this.frameLayer.add(a);
        this.tweens.add({ targets: a, y: a.y + 8, yoyo: true, repeat: -1, duration: 500 });
      }
    }
  }

  addJelly(r, c, n) {
    const { x, y } = this.xy(r, c);
    const img = this.add.image(x, y, `obs_jelly_${n}`).setDisplaySize(CELL, CELL);
    this.jellyLayer.add(img);
    this.jellySprites.set(`${r},${c}`, img);
    return img;
  }

  textureFor(p) {
    switch (p.k) {
      case 'tile': return p.sp === 'rainbow' ? 'tile_rainbow' : `tile_${COLOR_NAMES[p.c]}${p.sp ? `_${p.sp}` : ''}`;
      case 'stone': return `obs_stone_${Math.max(1, p.hp)}`;
      case 'crate': return `obs_crate_${Math.max(1, p.hp)}`;
      case 'slime': return 'obs_slime';
      case 'timer': return 'obs_timer_bomb';
      case 'drop': return `item_drop_${p.v}`;
      case 'star': return 'item_collect_star';
      default: return 'tile_red';
    }
  }
  coverTexture(cv) { return cv.t === 'ice' ? `obs_ice_${Math.max(1, cv.hp)}` : cv.t === 'chain' ? 'obs_chain' : 'obs_bubble'; }

  makeSprite(p, r, c, cover, from) {
    const pos = from || this.xy(r, c);
    const cont = this.add.container(pos.x, pos.y);
    const img = this.add.image(0, 0, this.textureFor(p));
    cont.add(img);
    cont.img = img; cont.piece = { ...p };
    if (p.k === 'timer') {
      cont.timerText = this.add.text(0, 8, `${p.t}`, { ...TXT.mid, fontSize: '60px', color: '#123A6E', stroke: '#FFF6E6', strokeThickness: 8 }).setOrigin(0.5);
      cont.add(cont.timerText);
    }
    if (cover) { cont.cover = this.add.image(0, 0, this.coverTexture(cover)); cont.add(cont.cover); }
    this.pieceLayer.add(cont);
    this.sprites.set(p.id, cont);
    return cont;
  }

  // 특수 블록은 가만히 있을 때도 살짝 움직여 눈에 띄게 (줄: 화살표 방향으로 살랑, 폭탄·진주: 두근두근)
  update(time) {
    if (!this.sprites) return;
    const t = time / 1000;
    for (const sp of this.sprites.values()) {
      const pc = sp.piece, img = sp.img;
      if (!pc || !img || pc.k !== 'tile') continue;
      if (img.baseScale === undefined) img.baseScale = img.scaleX;
      const b = img.baseScale, ph = t * 5 + (sp.x + sp.y) * 0.01;
      // 연쇄로 장전된 특수 블록: 빠르게 떨며 반짝 (떨어져 자리를 잡은 뒤 터짐)
      if (sp.armed && pc.sp) { img.setScale(b * (1.1 + 0.08 * Math.sin(t * 28))); img.setAngle(8 * Math.sin(t * 22)); img.setTint(Math.floor(t * 12) % 2 ? 0xFFFFFF : 0xFFE08A); continue; }
      if (pc.sp === 'lineH') img.setScale(b * (1 + 0.07 * Math.sin(ph)), b * (1 - 0.03 * Math.sin(ph)));
      else if (pc.sp === 'lineV') img.setScale(b * (1 - 0.03 * Math.sin(ph)), b * (1 + 0.07 * Math.sin(ph)));
      else if (pc.sp === 'bomb') { img.setScale(b * (1 + 0.07 * Math.sin(ph * 1.3))); img.setAngle(6 * Math.sin(ph * 0.65)); }
      else if (pc.sp === 'rainbow') img.setScale(b * (1 + 0.06 * Math.sin(ph * 1.3)));
      else if (img.scaleX !== b) img.setScale(b);
      if (pc.sp !== 'bomb' && img.angle) img.setAngle(0);
      // 줄 블록: 빛줄기가 터지는 방향으로 훑고 지나감 (1.6초마다)
      const line = pc.sp === 'lineH' || pc.sp === 'lineV';
      if (line && !sp.glint) { sp.glint = this.add.image(0, 0, 'glint').setBlendMode(Phaser.BlendModes.ADD); sp.add(sp.glint); }
      if (sp.glint) {
        sp.glint.setVisible(line);
        if (line) {
          const half = img.displayWidth * 0.42, k = ((t + (sp.x * 0.003 + sp.y * 0.002)) % 1.6) / 1.6;
          const u = k < 0.5 ? k / 0.5 : 1, pos = -half + u * half * 2;
          sp.glint.setAlpha(k < 0.5 ? Math.sin(u * Math.PI) * 0.75 : 0).setScale(1, img.displayHeight / 150);
          if (pc.sp === 'lineH') sp.glint.setPosition(pos, 0).setAngle(0); else sp.glint.setPosition(0, pos).setAngle(90).setScale(1, img.displayWidth / 150);
        }
      }
    }
  }

  setPieceTexture(id, p) {
    const sp = this.sprites.get(id);
    if (!sp) return;
    Object.assign(sp.piece, p);
    sp.img.setTexture(this.textureFor(sp.piece));
  }

  // 엔진 상태와 화면을 강제로 일치 (애니메이션 누락 대비 안전망)
  syncAll() {
    const alive = new Set();
    this.engine.each((cl, r, c) => {
      if (!cl.p) return;
      alive.add(cl.p.id);
      let sp = this.sprites.get(cl.p.id);
      if (!sp) sp = this.makeSprite(cl.p, r, c, cl.cover);
      const { x, y } = this.xy(r, c);
      sp.setPosition(x, y).setScale(1).setAlpha(1).setAngle(0);
      if (sp.img.texture.key !== this.textureFor(cl.p)) { sp.piece = { ...cl.p }; sp.img.setTexture(this.textureFor(cl.p)); }
      if (cl.cover) {
        if (!sp.cover) { sp.cover = this.add.image(0, 0, this.coverTexture(cl.cover)); sp.add(sp.cover); }
        else sp.cover.setTexture(this.coverTexture(cl.cover));
      } else if (sp.cover) { sp.cover.destroy(); sp.cover = null; }
      if (sp.timerText) sp.timerText.setText(`${cl.p.t}`);
    });
    for (const [id, sp] of this.sprites) if (!alive.has(id)) { sp.destroy(); this.sprites.delete(id); }
    this.engine.each((cl, r, c) => {
      const key = `${r},${c}`; const js = this.jellySprites.get(key);
      if (cl.jelly > 0) {
        if (js) js.setTexture(`obs_jelly_${cl.jelly}`);
        else this.addJelly(r, c, cl.jelly);
      } else if (js) { js.destroy(); this.jellySprites.delete(key); }
    });
  }

  // ═══ HUD ═══════════════════════════════════════════════════
  buildHUD() {
    const s = this.engine.s;
    // 상단 바를 세로로 늘려서 원·목표 칸이 아래 물결 테두리에 걸치지 않게 한다 (물결은 y≈220 부터)
    this.add.image(W / 2, 0, 'hud_topbar').setOrigin(0.5, 0).setDisplaySize(W, 300).setDepth(20);
    // 이동 수: 라벨과 숫자 모두 안쪽 크림 원 안에 (테두리와 겹치지 않게)
    const mb = this.add.image(140, 112, 'hud_moves_box').setScale(0.82).setDepth(20);
    this.movesBox = mb;
    this.add.text(140, 88, t('moves'), { ...TXT.dark, fontSize: '24px' }).setOrigin(0.5).setDepth(21);
    this.movesText = this.add.bitmapText(140, 130, 'font_num_white', `${s.moves}`, 56).setOrigin(0.5).setDepth(21);
    iconButton(this, W - 86, 100, 'ico_settings', () => this.pausePopup(), { size: 112 }).setDepth(22);

    // 목표
    this.goalViews = [];
    const goals = s.goals;
    // 목표가 많으면(물고기·해마 따로 등) 칸을 좁혀서 한 줄에
    const span = 640, step = Math.min(170, span / goals.length), gk = step / 170, startX = 300 + (span - 40 - goals.length * step) / 2 + step / 2;
    goals.forEach((g, i) => {
      // 목표 칸: 아이콘은 위, 남은 개수는 칸 안쪽 아래 (테두리와 겹치지 않게)
      const x = startX + i * step, y = 114;
      this.add.nineslice(x, y, 'hud_goal_box', null, 150 * gk, 156, 40 * gk, 40 * gk, 40, 40).setDepth(20);
      const icon = this.add.image(x, y - 20, this.goalIcon(g)).setDepth(21);
      icon.setScale((g.type === 'jelly' ? 0.64 : g.type === 'score' ? 1.3 : 0.58) * gk);
      const txt = this.add.bitmapText(x, y + 44, 'font_num_white', '', 42 * Math.max(0.8, gk)).setOrigin(0.5).setDepth(22);
      const check = this.add.image(x, y + 44, 'hud_goal_check').setScale(0.5 * gk).setDepth(22).setVisible(false);
      this.goalViews.push({ g, icon, txt, check, x, y });
    });
    // 점수 바
    // 물결 아래 상태 패널: [레벨 | 점수 + 별 게이지] 를 하나로 묶는다
    // 상단 물결(≈y272)과 보드 테두리 위쪽 사이 빈 공간의 한가운데에 둔다
    const PY = Math.max(336, Math.round((272 + (this.oy - 24 * this.k)) / 2));
    this.add.nineslice(W / 2, PY, 'hud_goal_box', null, 900, 124, 40, 40, 40, 40).setDepth(20);
    this.add.text(170, PY - 22, t('level'), { ...TXT.dark, fontSize: '26px' }).setOrigin(0.5).setDepth(21);
    this.add.text(170, PY + 18, `${this.levelId}`, { ...TXT.dark, fontSize: '48px' }).setOrigin(0.5).setDepth(21);
    const div = this.add.graphics().setDepth(21);
    div.lineStyle(4, 0x2EA8E6, 0.6).lineBetween(250, PY - 40, 250, PY + 40);
    // "점수 1,234" 는 게이지 위 가운데 (점수가 늘어나도 가운데 유지 → layoutScore)
    this.scoreLabel = this.add.text(0, PY - 26, t('score'), { ...TXT.dark, fontSize: '26px' }).setOrigin(0, 0.5).setDepth(21);
    this.scoreText = this.add.bitmapText(0, PY - 26, 'font_num_gold', '0', 40).setOrigin(0, 0.5).setDepth(22);
    this.scoreCenterX = 285 + 670 / 2;
    // 별 게이지: 별은 같은 간격(STAR_POS)에 두고, 게이지는 별 사이 구간별로 차오른다
    const BX = 285, BWID = 670, BAR_Y = PY + 22;
    this.add.image(BX + BWID / 2, BAR_Y, 'hud_score_bar_bg').setDisplaySize(BWID, 40).setDepth(21);
    this.scoreFill = this.add.image(BX, BAR_Y, 'hud_score_bar_fill').setOrigin(0, 0.5).setDisplaySize(BWID, 40).setDepth(21);
    this.scoreFillW = this.scoreFill.width;
    this.scoreFill.setCrop(0, 0, 0, this.scoreFill.height);
    this.scoreStars = s.stars.map((th, i) => {
      const x = BX + BWID * STAR_POS[i];
      const off = this.add.image(x, BAR_Y, 'hud_score_star_off').setScale(0.46).setDepth(22);
      const on = this.add.image(x, BAR_Y, 'hud_score_star_on').setScale(0.46).setDepth(22).setVisible(false);
      return { off, on, th };
    });
    this.updateHUD({ score: s.score, moves: s.moves, goals: s.goals.map(g => g.progress) });
  }

  layoutScore() {
    const gap = 12, w = this.scoreLabel.width + gap + this.scoreText.width;
    this.scoreLabel.x = this.scoreCenterX - w / 2;
    this.scoreText.x = this.scoreLabel.x + this.scoreLabel.width + gap;
  }

  goalIcon(g) {
    switch (g.type) {
      case 'score': return 'star_small_on';
      case 'jelly': return 'obs_jelly_2';
      case 'drop': return `item_drop_${g.v || 'a'}`;
      case 'collect': return `tile_${g.color}`;
      case 'clear': return g.what === 'stone' ? 'obs_stone_3' : g.what === 'crate' ? 'obs_crate_2' : 'obs_slime';
      case 'cover': {
        let tp = 'ice'; this.engine.each(cl => { if (cl.cover) tp = cl.cover.t; });
        return tp === 'ice' ? 'obs_ice_2' : tp === 'chain' ? 'obs_chain' : 'obs_bubble';
      }
      case 'star': return 'item_collect_star';
      default: return 'star_small_on';
    }
  }

  updateHUD(snap) {
    const s = this.engine.s;
    if (snap.moves !== undefined) this.movesText.setText(`${Math.max(0, snap.moves)}`);
    if (snap.score !== undefined) {
      this.scoreText.setText(snap.score.toLocaleString('en-US'));
      this.layoutScore();
      const ratio = starProgress(snap.score, s.stars);
      this.tweens.addCounter({ from: this.fillRatio || 0, to: ratio, duration: 250, onUpdate: tw => { this.fillRatio = tw.getValue(); this.scoreFill.setCrop(0, 0, this.scoreFillW * this.fillRatio, this.scoreFill.height); } });
      for (const st of this.scoreStars) {
        if (snap.score >= st.th && !st.on.visible) { st.on.setVisible(true).setScale(0); this.tweens.add({ targets: st.on, scale: 0.55, duration: 300, ease: 'Back.Out' }); }
      }
    }
    if (snap.goals) {
      snap.goals.forEach((prog, i) => {
        const v = this.goalViews[i]; if (!v) return;
        const g = s.goals[i];
        const left = g.type === 'score' ? Math.max(0, g.target - snap.score) : Math.max(0, g.target - prog);
        const done = left <= 0;
        v.txt.setText(done ? '' : g.type === 'score' ? `${Math.ceil(left / 1000)}k` : `${left}`);
        if (done && !v.check.visible) { v.check.setVisible(true).setScale(0); this.tweens.add({ targets: v.check, scale: 0.5, duration: 280, ease: 'Back.Out' }); }
        if (v.lastLeft !== undefined && left < v.lastLeft) this.tweens.add({ targets: v.icon, scale: v.icon.scale * 1.15, yoyo: true, duration: 90 });
        v.lastLeft = left;
      });
    }
  }

  // ═══ 부스터 ════════════════════════════════════════════════
  buildBoosters() {
    this.add.image(W / 2, H, 'hud_bottombar').setOrigin(0.5, 1).setDepth(20);
    this.boosterViews = {};
    const list = [['hammer', 'boost_hammer'], ['shuffle', 'boost_shuffle'], ['swap', 'boost_swap']];
    list.forEach(([k, icon], i) => {
      const x = W / 2 + (i - 1) * 240, y = H - 110;
      const slot = this.add.image(x, y, 'hud_booster_slot').setDepth(21).setInteractive({ useHandCursor: true });
      const ic = this.add.image(x, y + 2, icon).setScale(0.82).setDepth(22);
      const badge = this.add.image(x + 56, y - 52, 'hud_booster_count').setDepth(23);
      const n = this.add.text(badge.x, badge.y - 2, '', { ...TXT.small, fontSize: '32px', strokeThickness: 6 }).setOrigin(0.5).setDepth(24);
      const plus = this.add.image(badge.x, badge.y, 'hud_booster_add').setDepth(23);
      slot.on('pointerup', () => { audio.play('sfx_click'); this.onBooster(k); });
      this.boosterViews[k] = { slot, ic, badge, n, plus };
    });
    this.refreshBoosters();
  }
  refreshBoosters() {
    const b = load().boosters;
    for (const [k, v] of Object.entries(this.boosterViews)) {
      const n = b[k] || 0;
      v.n.setText(`${n}`); v.badge.setVisible(n > 0); v.n.setVisible(n > 0); v.plus.setVisible(n <= 0);
      v.slot.setTint(this.armed === k ? 0xFFF1A8 : 0xffffff);
      v.ic.setScale(this.armed === k ? 0.95 : 0.82);
    }
  }
  onBooster(k) {
    if (this.busy && !this.armed) return;
    if (this.armed === k) { this.armed = null; this.refreshBoosters(); this.hideArmHint(); return; }
    const d = load();
    if ((d.boosters[k] || 0) <= 0) return this.buyPopup(k);
    if (k === 'shuffle') {
      useBooster('shuffle'); this.refreshBoosters();
      this.busy = true;
      audio.play('sfx_booster');
      const res = this.engine.useShuffle();
      this.playSteps(res.steps).then(() => this.afterTurn());
      return;
    }
    this.armed = k; this.refreshBoosters();
    this.showArmHint(t(k === 'hammer' ? 'tapTarget' : 'swapTarget'));
  }
  showArmHint(msg) {
    this.hideArmHint();
    this.armText = this.add.text(W / 2, BOARD_TOP - 24, msg, { ...TXT.small, fontSize: '34px' }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: this.armText, alpha: 0.5, yoyo: true, repeat: -1, duration: 500 });
  }
  hideArmHint() { if (this.armText) { this.armText.destroy(); this.armText = null; } }
  buyPopup(k, onBought) {
    const price = BOOSTER_PRICE[k];
    const name = t({ hammer: 'boosterHammer', shuffle: 'boosterShuffle', swap: 'boosterSwap', moves: 'boosterMoves' }[k]);
    const p = popup(this, { title: name, width: 820, height: 760 });
    p.box.add(this.add.image(0, -120, `boost_${k}`).setScale(1.1));
    p.box.add(this.add.text(0, 40, t('buyBooster', name, price), TXT.body).setOrigin(0.5));
    p.box.add(this.add.image(-60, 140, 'ico_coin').setScale(0.4));
    p.box.add(this.add.text(-20, 140, `${load().coins}`, TXT.dark).setOrigin(0, 0.5));
    p.box.add(button(this, 0, 270, `${t('buy')}  ${price}`, () => {
      if (!spendCoins(price)) { toast(this, t('notEnough')); return; }
      audio.play('sfx_coin');
      const d = load(); d.boosters[k] = (d.boosters[k] || 0) + 1; save();
      this.refreshBoosters(); p.close(); onBought && onBought();
    }, { width: 440, height: 140, size: 50 }));
  }

  // ═══ 입력 ══════════════════════════════════════════════════
  toCell(x, y) {
    const c = Math.floor((x - this.ox) / this.cs), r = Math.floor((y - this.oy) / this.cs);
    return this.engine.cell(r, c) ? [r, c] : null;
  }
  setupInput() {
    this.input.on('pointerdown', p => {
      if (this.busy) return;
      const cell = this.toCell(p.x, p.y);
      this.resetHint();
      if (!cell) { this.select(null); return; }
      if (this.armed === 'hammer') return this.applyHammer(cell);
      this.drag = { cell, x: p.x, y: p.y, moved: false };
    });
    this.input.on('pointermove', p => {
      if (!this.drag || this.busy || !p.isDown) return;
      const dx = p.x - this.drag.x, dy = p.y - this.drag.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 42) return;
      const [r, c] = this.drag.cell;
      const target = Math.abs(dx) > Math.abs(dy) ? [r, c + Math.sign(dx)] : [r + Math.sign(dy), c];
      this.drag.moved = true;
      const from = this.drag.cell; this.drag = null;
      if (this.engine.cell(...target)) this.trySwap(from, target);
    });
    this.input.on('pointerup', p => {
      if (!this.drag || this.busy) { this.drag = null; return; }
      const cell = this.drag.cell; this.drag = null;
      if (this.selected && Math.abs(this.selected[0] - cell[0]) + Math.abs(this.selected[1] - cell[1]) === 1) this.trySwap(this.selected, cell);
      else if (this.selected && this.selected[0] === cell[0] && this.selected[1] === cell[1]) this.select(null);
      else this.select(cell);
    });
  }
  select(cell) {
    this.selected = cell;
    if (!cell) { this.selectFx.setVisible(false); return; }
    const { x, y } = this.xy(...cell);
    this.selectFx.setPosition(x, y).setVisible(true);
    audio.play('sfx_select');
  }

  async trySwap(a, b) {
    this.select(null);
    const free = this.armed === 'swap';
    const e = this.engine;
    const blocked = [a, b].find(pos => !e.canSwap(e.cell(...pos)));
    if (blocked) { this.shake(blocked); this.explainBlocked(blocked); return; }
    this.busy = true;
    const res = e.swap(a, b, { free });
    if (!res.ok) {
      audio.play('sfx_swap_invalid');
      await this.animSwap(a, b, true);
      this.busy = false; this.scheduleHint();
      return;
    }
    if (free) { useBooster('swap'); this.armed = null; this.hideArmHint(); this.refreshBoosters(); audio.play('sfx_booster'); }
    if (this.tutorialHand) { this.tutorialHand.destroy(); this.tutorialHand = null; }
    await this.playSteps(res.steps);
    this.afterTurn();
  }
  async applyHammer(cell) {
    const cl = this.engine.cell(...cell);
    const useful = cl && (cl.cover || cl.jelly > 0 || (cl.p && cl.p.k !== 'drop'));
    if (!useful) { toast(this, t('hammerNo'), BOARD_TOP + 40); return; }   // 재료·빈칸: 부스터를 쓰지 않음
    this.busy = true; this.armed = null; this.hideArmHint();
    useBooster('hammer'); this.refreshBoosters();
    const res = this.engine.useHammer(...cell);
    await this.playSteps(res.steps);
    this.afterTurn();
  }
  // 움직일 수 없는 칸을 건드렸을 때 이유를 알려준다 (같은 종류는 레벨당 한 번)
  explainBlocked(pos) {
    const cl = this.engine.cell(...pos);
    if (!cl || !cl.p) return;
    const key = cl.cover ? cl.cover.t : cl.p.k;
    const msg = t(`blocked.${key}`);
    if (!msg || msg === `blocked.${key}`) return;
    this.explained = this.explained || new Set();
    if (this.explained.has(key)) return;
    this.explained.add(key);
    toast(this, msg, BOARD_TOP + 40);
  }
  shake(cell) {
    const sp = this.pieceAt(cell); if (!sp) return;
    audio.play('sfx_swap_invalid');
    this.tweens.add({ targets: sp, x: sp.x + 10, yoyo: true, repeat: 2, duration: 50 });
  }
  pieceAt([r, c]) { const cl = this.engine.cell(r, c); return cl && cl.p ? this.sprites.get(cl.p.id) : null; }

  // ═══ 힌트 ══════════════════════════════════════════════════
  scheduleHint() {
    this.resetHint();
    this.hintTimer = this.time.delayedCall(5000, () => this.showHint());
  }
  resetHint() {
    if (this.hintTimer) { this.hintTimer.remove(); this.hintTimer = null; }
    if (this.hintTweens) { this.hintTweens.forEach(tw => tw.stop()); this.hintTweens = null; }
    for (const sp of this.sprites.values()) sp.setAngle(0);
  }
  showHint() {
    if (this.busy) return;
    const m = this.engine.possibleMoves(1)[0];
    if (!m) return;
    this.hintTweens = m.map(pos => {
      const sp = this.pieceAt(pos);
      return sp && this.tweens.add({ targets: sp, angle: { from: -9, to: 9 }, yoyo: true, repeat: 5, duration: 120, onComplete: () => sp.setAngle(0) });
    }).filter(Boolean);
    this.hintTimer = this.time.delayedCall(4000, () => this.showHint());
  }

  // ═══ step 재생 ═════════════════════════════════════════════
  async playSteps(steps) {
    for (const st of steps) {
      await this.playStep(st);
      this.updateHUD(st);
      if (st.score !== undefined) this.lastScore = st.score;
    }
  }

  async playStep(st) {
    const sp = this.speed;
    switch (st.type) {
      case 'swap': audio.play('sfx_swap'); return this.animSwap(st.a, st.b, false, st.ids);
      case 'match': return this.animMatch(st);
      case 'blast': return this.animBlast(st);
      case 'fall': return this.animFall(st);
      case 'exit': {
        audio.play('sfx_item_drop');
        await Promise.all(st.items.map(it => {
          const s = this.sprites.get(it.id); if (!s) return null;
          track('rescue', 1, (s.piece && s.piece.v) || 'a');
          this.sprites.delete(it.id);
          this.sparkles(s.x, s.y, 0xFFD23F, 8);
          return tweenP(this, { targets: s, y: s.y + 90, alpha: 0, scale: 1.3, duration: 380 / sp, onDone: () => s.destroy() });
        }));
        this.floatText(st.items[0] ? this.xy(...st.items[0].at) : { x: W / 2, y: H / 2 }, '+1000');
        return;
      }
      case 'convert': case 'bonusConvert': {
        if (st.type === 'convert') audio.play('sfx_rainbow');
        for (const it of st.items) {
          this.setPieceTexture(it.id, { sp: it.sp });
          const s = this.sprites.get(it.id); if (!s) continue;
          this.fx('fx_special_create', s.x, s.y, { scale: 1 });
          if (st.type === 'bonusConvert') { audio.play('sfx_special_create'); s.setScale(0); this.tweens.add({ targets: s, scale: 1, duration: 200, ease: 'Back.Out' }); await wait(this, 70 / sp); }
        }
        return wait(this, 250 / sp);
      }
      case 'shuffle': {
        audio.play('sfx_shuffle');
        toast(this, t('shuffle'), (BOARD_TOP + this.boardBottom) / 2);
        await Promise.all(st.items.map(it => {
          const s = this.sprites.get(it.id); if (!s) return null;
          this.setPieceTexture(it.id, { c: it.c, sp: it.sp });
          const { x, y } = this.xy(...it.at);
          return tweenP(this, { targets: s, x, y, duration: 420, ease: 'Cubic.InOut' });
        }));
        return;
      }
      case 'slimeSpread': {
        const old = this.sprites.get(st.removed);
        if (old) { old.destroy(); this.sprites.delete(st.removed); }
        const s = this.makeSprite(st.piece, ...st.to);
        s.setScale(0); audio.play('sfx_jelly', { rate: 0.7 });
        return tweenP(this, { targets: s, scale: 1, duration: 300, ease: 'Back.Out' });
      }
      case 'timerTick': {
        for (const it of st.items) {
          const s = this.sprites.get(it.id); if (!s || !s.timerText) continue;
          s.timerText.setText(`${Math.max(0, it.t)}`);
          if (it.t <= 3) { s.timerText.setColor('#C2183A'); this.tweens.add({ targets: s, scale: 1.18, yoyo: true, duration: 140 }); }
        }
        return;
      }
      case 'timerBoom': {
        for (const it of st.items) { const { x, y } = this.xy(...it.at); this.fx('fx_bomb', x, y, { scale: 2.2 }); }
        audio.play('sfx_bomb'); this.cameras.main.shake(400, 0.015);
        return wait(this, 600);
      }
      case 'booster': {
        const { x, y } = this.xy(...st.at);
        const h = this.add.image(x + 90, y - 140, 'boost_hammer').setAngle(40);
        this.fxLayer.add(h);
        audio.play('sfx_booster');
        await tweenP(this, { targets: h, x: x + 30, y: y - 40, angle: -30, duration: 220, ease: 'Back.In' });
        this.cameras.main.shake(120, 0.008);
        this.tweens.add({ targets: h, alpha: 0, duration: 200, onComplete: () => h.destroy() });
        return;
      }
      default: return;
    }
  }

  animSwap(a, b, fail, ids) {
    const A = this.xy(...a), B = this.xy(...b);
    // 성공 시 엔진은 이미 바뀐 상태이므로 ids 로 찾음 (ids[0] = 원래 a 에 있던 조각)
    const sa = ids ? this.sprites.get(ids[0]) : this.pieceAt(a);
    const sb = ids ? this.sprites.get(ids[1]) : this.pieceAt(b);
    const d = 150 / this.speed;
    const ps = [];
    if (sa) ps.push(tweenP(this, { targets: sa, x: B.x, y: B.y, duration: d, ease: 'Quad.InOut', yoyo: fail }));
    if (sb) ps.push(tweenP(this, { targets: sb, x: A.x, y: A.y, duration: d, ease: 'Quad.InOut', yoyo: fail }));
    return Promise.all(ps);
  }

  async animMatch(st) {
    const cells = st.groups.flatMap(g => g.cells);
    const avgC = cells.length ? cells.reduce((a, [, c]) => a + c, 0) / cells.length : this.engine.s.w / 2;
    audio.play(`sfx_match_${Math.min(5, st.level)}`, { pan: this.panOf(avgC) });
    // 연쇄가 이어질수록 화면 흔들림·번쩍임·진동이 커짐
    if (st.level >= 3) { this.cameras.main.shake(140 + st.level * 30, 0.002 * Math.min(st.level, 6)); audio.buzz(12 + st.level * 4); }
    if (st.level >= 5) this.cameras.main.flash(120, 255, 255, 255, false);
    if (st.level >= 4) track('combo');
    track('comboLevel', st.level);
    for (const c of st.created) {
      track('make');
      this.setPieceTexture(c.id, { sp: c.sp });
      const s = this.sprites.get(c.id);
      if (s) { s.setScale(0.4); this.tweens.add({ targets: s, scale: 1, duration: 260, ease: 'Back.Out' }); this.fx('fx_special_create', s.x, s.y); }
    }
    if (st.created.length) {
      audio.play('sfx_special_create');
      // 바다의 신: 무지개 진주를 만들면 특별히 감탄
      if (st.created.some(c => c.sp === 'rainbow')) audio.voice('rainbow');
    }
    this.handleHits(st.hits);
    const gained = st.score - (this.lastScore ?? 0);
    if (gained > 0 && st.groups.length) {
      const all = st.groups.flatMap(g => g.cells);
      const cx = all.reduce((a, [r, c]) => a + this.xy(r, c).x, 0) / all.length, cy = all.reduce((a, [r, c]) => a + this.xy(r, c).y, 0) / all.length;
      this.floatText({ x: cx, y: cy }, `${gained}`);
    }
    if (st.level >= 2) { this.comboText(st.level); if (st.level >= 3) audio.voice(`combo_${Math.min(5, st.level - 2)}`); }
    await wait(this, 220 / this.speed);
  }

  async animBlast(st) {
    let big = false, ripple = null; const centers = [];
    // 히트스톱: 특수 블록이 터지는 순간 화면을 아주 잠깐 멈춰 '손맛'을 준다
    const weight = Math.max(...st.fx.map(f => ({ lineH: 1, lineV: 1, bomb: 2, cross: 3, bigCross: 3, bigBomb: 3, rainbow: 2, rainbowAll: 4 }[f.fx] || 0)));
    if (weight) await this.hitStop([0, 45, 70, 100, 140][weight]);
    for (const f of st.fx) {
      const at = f.at ? this.xy(...f.at) : { x: W / 2, y: H / 2 };
      const bw = this.engine.s.w * CELL, bh = this.engine.s.h * CELL;
      const lineH = (r) => { const y = this.xy(r, 0).y; const s = this.add.sprite(bw / 2, y, 'fx_line_h').setDisplaySize(bw + 120, 130); this.fxLayer.add(s); s.play('fx_line_h'); s.once('animationcomplete', () => s.destroy()); this.torpedo(at.x, y, true, bw); };
      const lineV = (c) => { const x = this.xy(0, c).x; const s = this.add.sprite(x, bh / 2, 'fx_line_v').setDisplaySize(130, bh + 120); this.fxLayer.add(s); s.play('fx_line_v'); s.once('animationcomplete', () => s.destroy()); this.torpedo(x, at.y, false, bh); };
      const pan = f.at ? this.panOf(f.at[1]) : 0;
      switch (f.fx) {
        case 'lineH': track('line'); audio.play('sfx_line', { pan }); audio.buzz(25); lineH(f.at[0]); break;
        case 'lineV': track('line'); audio.play('sfx_line', { pan }); audio.buzz(25); lineV(f.at[1]); break;
        case 'bomb': track('bomb'); await this.boom(f, at, st.hits, 1); centers.push(f.at); big = true; break;
        case 'cross': audio.play('sfx_combo_special', { pan }); audio.buzz(50); lineH(f.at[0]); lineV(f.at[1]); big = true; break;
        case 'bigCross': audio.play('sfx_combo_special', { pan }); audio.buzz(70); for (let d = -1; d <= 1; d++) { lineH(f.at[0] + d); lineV(f.at[1] + d); } big = true; break;
        case 'bigBomb': track('bomb'); audio.play('sfx_combo_special'); await this.boom(f, at, st.hits, 2); centers.push(f.at); big = true; break;
        case 'rainbowAll': {
          // 진주 + 진주: 큰 진주 폭발 → 빛줄기가 모든 칸으로 → 중심에서 물결처럼 차례로 터짐 (아래 handleHits)
          audio.play('sfx_rainbow'); audio.play('sfx_combo_special'); audio.buzz([60, 40, 140]);
          this.fx('fx_rainbow_orb', at.x, at.y, { scale: 3.4 });
          this.cameras.main.flash(350, 255, 255, 255);
          const ring = this.add.circle(at.x, at.y, 40, 0xffffff, 0).setStrokeStyle(18, 0xFFF6B0, 1);
          this.fxLayer.add(ring);
          this.tweens.add({ targets: ring, radius: Math.max(bw, bh), alpha: 0, duration: 650, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
          const hues = [0xFF5C8F, 0xFF9F1C, 0xFFD23F, 0x8CE04A, 0x3EC1F3, 0xA55CF0];
          (f.cells || []).forEach(([r, c], i) => {
            const p = this.xy(r, c);
            const beam = this.add.image(at.x, at.y, 'fx_rainbow_beam').setOrigin(0, 0.5).setTint(hues[i % hues.length]);
            beam.setDisplaySize(Phaser.Math.Distance.Between(at.x, at.y, p.x, p.y), 22);
            beam.setRotation(Phaser.Math.Angle.Between(at.x, at.y, p.x, p.y));
            this.fxLayer.add(beam);
            this.tweens.add({ targets: beam, alpha: 0, duration: 480, delay: 160, onComplete: () => beam.destroy() });
          });
          this.pearlStorm(); track('pearl');
          ripple = true; centers.push(f.at);
          big = true;
          await wait(this, 380 / this.speed);
          break;
        }
        case 'rainbow': {
          audio.play('sfx_rainbow', { pan }); audio.buzz(35);
          this.fx('fx_rainbow_orb', at.x, at.y, { scale: 1.4 });
          const targets = (f.cells || []).slice(0, 40);
          for (const [r, c] of targets) {
            const p = this.xy(r, c);
            const beam = this.add.image(at.x, at.y, 'fx_rainbow_beam').setOrigin(0, 0.5);
            beam.setDisplaySize(Phaser.Math.Distance.Between(at.x, at.y, p.x, p.y), 26);
            beam.setRotation(Phaser.Math.Angle.Between(at.x, at.y, p.x, p.y));
            this.fxLayer.add(beam);
            this.tweens.add({ targets: beam, alpha: 0, duration: 420, delay: 120, onComplete: () => beam.destroy() });
          }
          await wait(this, 200 / this.speed);
          break;
        }
        case 'hammer': audio.play('sfx_bomb', { volume: 0.5 }); this.fx('fx_pop', at.x, at.y, { scale: 1.6 }); break;
        default: break;
      }
    }
    if (big) this.cameras.main.shake(ripple ? 520 : 260, ripple ? 0.014 : 0.011);
    await wait(this, 90 / this.speed);
    if (centers.length) {
      // 폭발 중심에서 가까운 칸부터 한 고리씩 터뜨린다 (폭탄·진주 대폭발)
      const ring = h => Math.min(...centers.map(c => Math.max(Math.abs(h.at[0] - c[0]), Math.abs(h.at[1] - c[1]))));
      const maxR = Math.max(0, ...st.hits.map(ring));
      for (let d = 0; d <= maxR; d++) {
        const group = st.hits.filter(h => ring(h) === d);
        if (!group.length) continue;
        this.handleHits(group);
        if (ripple && d % 2 === 0) audio.play(`sfx_match_${Math.min(5, 1 + d / 2)}`, { volume: 0.5 });
        await wait(this, (ripple ? 70 : 55) / this.speed);
      }
    } else this.handleHits(st.hits);
    await wait(this, 200 / this.speed);
  }

  // 폭탄 연출: 부풀며 하얗게 번쩍 → 터지는 범위가 빛남 → 불꽃 + 충격파 + 파편
  // 폭탄 연출 (물속 폭발): 물방울을 빨아들이며 부풂 → 빛줄기·이중 충격파 → 물보라·거품 고리, 터지는 칸마다 둥근 빛
  async boom(f, at, hits, rad) {
    const sp = this.speed;
    const R = (rad + 0.5) * CELL;                  // 폭발 반경 (3×3 → 1.5칸, 5×5 → 2.5칸)
    const h = hits.find(x => x.at[0] === f.at[0] && x.at[1] === f.at[1] && x.pid);
    const s = h && this.sprites.get(h.pid);
    // ① 빨아들임: 주변 물방울이 폭탄으로 모여들고, 폭탄이 하얗게 부풂
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, d = R * 1.1;
      const b = this.add.image(at.x + Math.cos(a) * d, at.y + Math.sin(a) * d, 'ptc_bubble').setScale(0.3).setAlpha(0.9);
      this.fxLayer.add(b);
      this.tweens.add({ targets: b, x: at.x, y: at.y, scale: 0.08, duration: 130 / sp, ease: 'Quad.In', onComplete: () => b.destroy() });
    }
    const glow = this.add.image(at.x, at.y, 'ptc_glow').setScale(0.4).setAlpha(0).setTint(0xFFF1C8);
    this.fxLayer.add(glow);
    this.tweens.add({ targets: glow, alpha: 1, scale: 1.2, duration: 130 / sp, onComplete: () => this.tweens.add({ targets: glow, alpha: 0, scale: 2.2, duration: 260, onComplete: () => glow.destroy() }) });
    if (s) await tweenP(this, { targets: s, scale: s.scale * 1.45, duration: 130 / sp, ease: 'Quad.In' });
    else await wait(this, 130 / sp);

    audio.play('sfx_bomb', { pan: this.panOf(f.at[1]) });
    audio.buzz(rad === 1 ? 45 : 80);
    // ② 카메라 펀치 (아주 짧게 확대됐다 돌아옴)
    const cam = this.cameras.main;
    this.tweens.add({ targets: cam, zoom: rad === 1 ? 1.025 : 1.045, yoyo: true, duration: 90, ease: 'Quad.Out', onComplete: () => cam.setZoom(1) });
    // ③ 따뜻한 방사형 빛줄기 + 불꽃
    const rays = this.add.image(at.x, at.y, 'ptc_rays').setScale(0.2).setTint(0xFFC46A).setAlpha(0.95);
    this.fxLayer.add(rays);
    this.tweens.add({ targets: rays, scale: R / 170, angle: 40, alpha: 0, duration: 480, ease: 'Cubic.Out', onComplete: () => rays.destroy() });
    this.fx('fx_bomb', at.x, at.y, { scale: rad === 1 ? 2.4 : 4.0 });
    // ④ 이중 충격파: 주황 고리 → 조금 늦게 하얀 고리
    [[0xFF8A3D, 0, 1.0], [0xFFFFFF, 70, 0.8]].forEach(([tint, delay, a]) => {
      const ring = this.add.image(at.x, at.y, 'ptc_ring').setScale(0.15).setTint(tint).setAlpha(a);
      this.fxLayer.add(ring);
      this.tweens.add({ targets: ring, scale: (R * 2.3) / 256, alpha: 0, delay, duration: 420, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
    });
    // ⑤ 터지는 칸마다 둥근 빛 (가운데부터 바깥으로)
    for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
      const r = f.at[0] + dr, c = f.at[1] + dc;
      if (!this.engine.cell(r, c)) continue;
      const p = this.xy(r, c);
      const g = this.add.image(p.x, p.y, 'ptc_glow').setScale(0.2).setAlpha(0).setTint(0xFFE2A0);
      this.fxLayer.add(g);
      this.tweens.add({ targets: g, alpha: 0.85, scale: 0.55, delay: Math.max(Math.abs(dr), Math.abs(dc)) * 45, duration: 110, yoyo: true, onComplete: () => g.destroy() });
    }
    // ⑥ 물보라: 물방울이 사방으로 튀었다가 떨어짐 + 거품 고리
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.3, d = R * (0.9 + Math.random() * 0.6);
      const dp = this.add.image(at.x, at.y, i % 3 ? 'ptc_drop' : 'ptc_bubble').setScale(0.3 + Math.random() * 0.3).setRotation(a + Math.PI / 2);
      this.fxLayer.add(dp);
      const tx = at.x + Math.cos(a) * d, ty = at.y + Math.sin(a) * d;
      this.tweens.add({ targets: dp, x: tx, y: ty, duration: 260, ease: 'Quad.Out',
        onComplete: () => this.tweens.add({ targets: dp, y: ty + 70, alpha: 0, scale: dp.scale * 0.6, duration: 320, ease: 'Quad.In', onComplete: () => dp.destroy() }) });
    }
    this.sparkles(at.x, at.y, 0xFFD23F, 8);
  }

  // 미션 완료 · 도감 등급 업 · 업적 달성 알림 (화면 위쪽에서 내려왔다 올라감, 여러 개면 차례로)
  missionToast(def) {
    const head = { mission: t('missionDone'), dex: t('dexNew'), ach: t('achDone') }[def.kind] || t('missionDone');
    const body = def.kind === 'dex' ? `${t(`dexNames.${def.id}`)} · ${t('dexTier')[def.lv - 1]}` : def.kind === 'ach' ? t(`achText.${def.id}`) : t(`missionText.${def.id}`);
    const icon = def.kind === 'dex' ? def.key : def.kind === 'ach' ? 'ico_trophy' : 'ico_mission';
    const delay = Math.max(0, (this.toastUntil || 0) - this.time.now);
    this.toastUntil = this.time.now + delay + 2500;
    this.time.delayedCall(delay, () => {
      audio.play('sfx_star_2');
      const c = this.add.container(W / 2, -80).setDepth(950);
      c.add(this.add.nineslice(0, 0, 'hud_goal_box', null, 700, 120, 40, 40, 40, 40));
      const ic = this.add.image(-290, 0, icon); ic.setScale(Math.min(80 / ic.width, 80 / ic.height));
      c.add(ic);
      c.add(this.add.text(-230, -22, head, { ...TXT.small, fontSize: '30px', color: '#FF6A1F', stroke: '#FFFFFF', strokeThickness: 6 }).setOrigin(0, 0.5));
      c.add(this.add.text(-230, 22, body, { ...TXT.dark, fontSize: '30px' }).setOrigin(0, 0.5));
      this.tweens.add({ targets: c, y: 330, duration: 380, ease: 'Back.Out',
        onComplete: () => this.tweens.add({ targets: c, y: -100, delay: 1700, duration: 300, ease: 'Back.In', onComplete: () => c.destroy() }) });
    });
  }

  // 진주 대폭발 문구 (다른 콤보 문구와 같은 영문 이미지)
  pearlStorm() {
    if (this.comboImg) this.comboImg.destroy();
    audio.voice('pearl_storm');
    const img = this.add.image(W / 2, (BOARD_TOP + this.boardBottom) / 2 - 120, 'txt_pearl_storm').setDepth(60).setScale(0).setAngle(-6);
    this.comboImg = img;
    this.tweens.add({ targets: img, scale: 0.75, angle: 0, duration: 380, ease: 'Back.Out' });
    this.tweens.add({ targets: img, alpha: 0, y: img.y - 70, delay: 1100, duration: 350, onComplete: () => img.destroy() });
  }


  handleHits(hits) {
    let jelly = false, ice = false, stone = false, chain = false;
    for (const h of hits) {
      const { x, y } = this.xy(...h.at);
      // 연쇄로 맞은 특수 블록: 반짝이며 떨고 있다가, 떨어져 자리를 잡은 뒤 터짐
      if (h.armed) { const s = this.sprites.get(h.armed); if (s && !s.armed) { s.armed = true; this.fx('fx_special_create', s.x, s.y, { scale: 0.9 }); } }
      if (h.jelly !== undefined) {
        jelly = true;
        const key = `${h.at[0]},${h.at[1]}`; const js = this.jellySprites.get(key);
        if (js) {
          track('jelly');
          if (h.jelly <= 0) { this.jellySprites.delete(key); this.tweens.add({ targets: js, alpha: 0, scale: js.scale * 1.2, duration: 220, onComplete: () => js.destroy() }); }
          else js.setTexture(`obs_jelly_${h.jelly}`);
        }
        this.fx('fx_jelly_break', x, y, { scale: 0.9 });
      }
      if (h.cover) {
        const s = this.sprites.get(h.pid);
        if (h.cover.t === 'chain') chain = true; else ice = true;
        if (s && s.cover) {
          if (h.cover.hp <= 0) track('cover');
          if (h.cover.hp <= 0) { const cv = s.cover; s.cover = null; this.tweens.add({ targets: cv, alpha: 0, scale: 1.3, duration: 200, onComplete: () => cv.destroy() }); }
          else s.cover.setTexture(this.coverTexture(h.cover));
        }
        this.fx(h.cover.t === 'bubble' ? 'fx_jelly_break' : 'fx_ice_break', x, y, { scale: 1 });
      }
      if (h.damaged && !h.removed) {
        stone = true;
        this.setPieceTexture(h.damaged, { hp: h.hp });
        this.fx('fx_stone_crack', x, y);
        const s = this.sprites.get(h.damaged); if (s) this.tweens.add({ targets: s, scale: 0.9, yoyo: true, duration: 80 });
      }
      if (h.removed) {
        const s = this.sprites.get(h.removed);
        this.sprites.delete(h.removed);
        if (h.kind === 'tile') { this.popTile(x, y, h.color); track('collect', 1, h.color); }
        else if (h.kind === 'stone' || h.kind === 'crate') { stone = true; this.fx('fx_stone_crack', x, y, { scale: 1.2 }); }
        else if (h.kind === 'slime') { this.fx('fx_jelly_break', x, y, { tint: 0x4E5E1E }); jelly = true; }
        else if (h.kind === 'timer') { this.fx('fx_bomb', x, y, { scale: 0.9 }); }
        else if (h.kind === 'star') { track('star'); audio.play('sfx_coin'); this.sparkles(x, y, 0xFFD23F, 10); }
        if (s) {
          if (h.kind === 'star' || (h.kind === 'tile' && this.isCollectGoal(h.color))) this.flyToGoal(s);
          else this.tweens.add({ targets: s, scale: 1.25, alpha: 0, duration: 180, ease: 'Quad.Out', onComplete: () => s.destroy() });
        }
      }
    }
    if (jelly) audio.play('sfx_jelly');
    if (ice) audio.play('sfx_ice');
    if (chain) audio.play('sfx_chain');
    if (stone) audio.play('sfx_stone');
  }

  isCollectGoal(color) { return this.engine.s.goals.some(g => g.type === 'collect' && COLOR_NAMES.indexOf(g.color) === color); }
  flyToGoal(s) {
    const idx = this.engine.s.goals.findIndex(g => g.type === 'star' || g.type === 'collect');
    const v = this.goalViews[idx] || this.goalViews[0];
    const w = this.toWorld(s);
    this.pieceLayer.remove(s); this.add.existing(s);
    s.setPosition(w.x, w.y).setScale(this.k).setDepth(25);
    this.tweens.add({ targets: s, x: v.x, y: v.y, scale: 0.4, duration: 500, ease: 'Cubic.In', onComplete: () => s.destroy() });
  }

  async animFall(st) {
    const per = 62 / this.speed;
    const all = [];
    for (const f of st.falls) {
      const s = this.sprites.get(f.id); if (!s) continue;
      const end = this.xy(...f.path[f.path.length - 1]);
      const n = f.path.length - 1;
      all.push(tweenP(this, { targets: s, x: end.x, y: end.y, duration: Math.max(90, n * per), ease: 'Quad.In' }).then(() => this.land(s)));
    }
    for (const f of st.spawns) {
      const start = this.xy(...f.path[0]);
      const s = this.makeSprite(f.piece, 0, 0, null, start);
      const end = this.xy(...f.path[f.path.length - 1]);
      const n = Math.max(1, Math.round((end.y - start.y) / CELL));
      all.push(tweenP(this, { targets: s, x: end.x, y: end.y, duration: Math.max(90, n * per), ease: 'Quad.In' }).then(() => this.land(s)));
    }
    await Promise.all(all);
  }
  land(s) { this.tweens.add({ targets: s, scaleY: 0.9, scaleX: 1.06, yoyo: true, duration: 70 }); }

  // ═══ 이펙트 도우미 ═════════════════════════════════════════
  panOf(col) { return Phaser.Math.Clamp(((col + 0.5) / this.engine.s.w) * 2 - 1, -1, 1) * 0.7; }

  // 히트스톱: 진행 중인 트윈·애니메이션을 실제 시간으로 잠깐 멈춤
  hitStop(ms) {
    if (this.speed > 1.5) return Promise.resolve();      // 보너스 빨리 감기 중에는 생략
    this.tweens.pauseAll(); this.anims.pauseAll();
    return new Promise(res => setTimeout(() => { this.tweens.resumeAll(); this.anims.resumeAll(); res(); }, ms));
  }

  // 바다 생물별로 다른 파편이 튀고, 색 고리가 퍼짐 (파티클 수는 상한을 둬서 폰에서도 부드럽게)
  popTile(x, y, color) {
    const tint = color >= 0 ? COLOR_HEX[color] : 0xffffff;
    this.fx('fx_pop', x, y, { tint });
    const ring = this.add.image(x, y, 'ptc_ring').setScale(0.15).setTint(tint).setAlpha(0.9);
    this.fxLayer.add(ring);
    this.tweens.add({ targets: ring, scale: 0.55, alpha: 0, duration: 260, ease: 'Quad.Out', onComplete: () => ring.destroy() });
    const key = ['ptc_crab', 'ptc_scale', 'ptc_spike', 'ptc_hex', 'ptc_drop', 'ptc_ink'][color] || 'ptc_bubble';
    this.ptcLive = this.ptcLive || 0;
    const n = this.ptcLive > 150 ? 1 : this.ptcLive > 90 ? 3 : 5;
    for (let i = 0; i < n; i++) {
      const p = this.add.image(x, y, i === n - 1 && n > 2 ? 'ptc_bubble' : key).setScale(0.45 + Math.random() * 0.35).setAngle(Math.random() * 360);
      this.fxLayer.add(p); this.ptcLive++;
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, d = 70 + Math.random() * 90;
      const tx = x + Math.cos(a) * d, peak = y + Math.sin(a) * d;
      this.tweens.add({ targets: p, x: tx + Math.cos(a) * 20, angle: p.angle + (Math.random() < 0.5 ? -240 : 240), duration: 520 });
      this.tweens.add({ targets: p, y: peak, duration: 200, ease: 'Quad.Out',
        onComplete: () => this.tweens.add({ targets: p, y: peak + 90, alpha: 0, scale: p.scale * 0.6, duration: 320, ease: 'Quad.In', onComplete: () => { p.destroy(); this.ptcLive--; } }) });
    }
  }

  // 줄 특수: 물줄기 어뢰가 양쪽 끝으로 달리며 물방울 자국을 남김
  torpedo(x, y, horizontal, len) {
    for (const dir of [-1, 1]) {
      const head = this.add.image(x, y, 'ptc_glow').setScale(0.55).setTint(0xBFF4FF);
      this.fxLayer.add(head);
      const end = horizontal ? { x: dir < 0 ? -40 : len + 40 } : { y: dir < 0 ? -40 : len + 40 };
      let last = 0;
      this.tweens.add({ targets: head, ...end, duration: 260, ease: 'Quad.In',
        onUpdate: () => {
          const now = this.time.now; if (now - last < 28) return; last = now;
          const b = this.add.image(head.x, head.y, 'ptc_bubble').setScale(0.18 + Math.random() * 0.2).setAlpha(0.9);
          this.fxLayer.add(b);
          this.tweens.add({ targets: b, y: b.y - 30 - Math.random() * 30, x: b.x + (Math.random() - 0.5) * 30, alpha: 0, duration: 450, onComplete: () => b.destroy() });
        },
        onComplete: () => head.destroy() });
    }
  }

  fx(key, x, y, { scale = 1, tint = null, angle = 0 } = {}) {
    const s = this.add.sprite(x, y, key).setScale(scale).setAngle(angle);
    if (tint !== null) s.setTint(tint);
    this.fxLayer.add(s);
    s.play(key);
    s.once('animationcomplete', () => s.destroy());
    return s;
  }
  sparkles(x, y, tint, n = 6) {
    for (let i = 0; i < n; i++) {
      const p = this.add.image(x, y, i % 2 ? 'ptc_spark' : 'ptc_star').setScale(0.3 + Math.random() * 0.3).setTint(tint);
      this.fxLayer.add(p);
      const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 80;
      this.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, angle: 180, duration: 500 + Math.random() * 300, onComplete: () => p.destroy() });
    }
  }
  floatText(pos, txt) {
    const tx = this.add.bitmapText(pos.x, pos.y, 'font_num_gold', txt, 44).setOrigin(0.5);
    this.fxLayer.add(tx);
    this.tweens.add({ targets: tx, y: pos.y - 80, alpha: 0, duration: 800, delay: 150, ease: 'Quad.Out', onComplete: () => tx.destroy() });
  }
  comboText(level) {
    if (this.comboImg) this.comboImg.destroy();
    const n = Math.min(5, level - 1);
    const img = this.add.image(W / 2, (BOARD_TOP + this.boardBottom) / 2 - 120, `txt_combo_${n}`).setDepth(40).setScale(0);
    this.comboImg = img;
    this.tweens.add({ targets: img, scale: 0.9, duration: 260, ease: 'Back.Out' });
    this.tweens.add({ targets: img, alpha: 0, y: img.y - 60, delay: 700, duration: 300, onComplete: () => img.destroy() });
  }
  bigText(key, y = (BOARD_TOP + this.boardBottom) / 2) {
    const img = this.add.image(W / 2, y, key).setDepth(60).setScale(0);
    this.tweens.add({ targets: img, scale: 0.6, duration: 360, ease: 'Back.Out' });
    return img;
  }

  // ═══ 턴 종료 / 승패 ════════════════════════════════════════
  // 디버그: 애니메이션 결과가 엔진 상태와 같은지 확인 (window.__debug = true 일 때)
  verifySprites() {
    const bad = [];
    this.engine.each((cl, r, c) => {
      if (!cl.p) return;
      const sp = this.sprites.get(cl.p.id);
      const { x, y } = this.xy(r, c);
      if (!sp) bad.push(`missing ${cl.p.k}#${cl.p.id} @${r},${c}`);
      else {
        if (Math.abs(sp.x - x) > 2 || Math.abs(sp.y - y) > 2) bad.push(`pos #${cl.p.id} @${r},${c}`);
        if (sp.img.texture.key !== this.textureFor(cl.p)) bad.push(`tex #${cl.p.id} ${sp.img.texture.key}≠${this.textureFor(cl.p)}`);
        if (!!sp.cover !== !!cl.cover) bad.push(`cover #${cl.p.id} @${r},${c}`);
      }
    });
    const ids = new Set(); this.engine.each(cl => cl.p && ids.add(cl.p.id));
    for (const id of this.sprites.keys()) if (!ids.has(id)) bad.push(`stale #${id}`);
    if (bad.length) { (window.__mismatch = window.__mismatch || []).push({ level: this.levelId, turn: this.engine.s.turn, bad }); console.warn('sprite mismatch', bad.slice(0, 5)); }
    return bad;
  }

  afterTurn() {
    flush();
    if (window.__debug) this.verifySprites();
    this.syncAll();
    const s = this.engine.s;
    this.updateHUD({ score: s.score, moves: s.moves, goals: s.goals.map(g => g.progress) });
    // 남은 이동이 5수 이하면 긴장 레이어(빠른 셰이커·펄스)가 점점 커짐
    audio.intensity(s.status === 'play' && s.moves <= 5 ? Math.min(1, 0.45 + (5 - s.moves) * 0.15) : 0);
    if (s.status === 'win') return this.winSequence();
    if (s.status === 'lose') return this.loseSequence();
    if (this.pendingPause) { this.pendingPause = false; this.busy = false; this.pausePopup(); return; }
    if (s.moves === 5) { audio.play('sfx_moves_low'); this.tweens.add({ targets: this.movesBox, scale: 1.15, yoyo: true, repeat: 2, duration: 150 }); }
    this.busy = false;
    this.scheduleHint();
  }

  async winSequence() {
    this.busy = true; this.resetHint();
    const clear = this.bigText('txt_level_clear');
    audio.play('jingle_win');
    this.time.delayedCall(500, () => audio.voice('clear'));
    await wait(this, 1300);
    this.tweens.add({ targets: clear, alpha: 0, duration: 250, onComplete: () => clear.destroy() });
    if (this.engine.s.moves > 0) {
      const bonus = this.bigText('txt_bonus_time', BOARD_TOP + 60);
      audio.voice('bonus');
      this.tweens.add({ targets: bonus, alpha: 0, delay: 900, duration: 300, onComplete: () => bonus.destroy() });
      this.speed = 1.8;
      const skip = this.add.text(W / 2, this.boardBottom + 30, t('tapSkip'), { ...TXT.small, fontSize: '32px' }).setOrigin(0.5).setDepth(60);
      this.tweens.add({ targets: skip, alpha: 0.4, yoyo: true, repeat: -1, duration: 450 });
      const fast = () => { this.tweens.timeScale = 4; this.time.timeScale = 4; this.anims.globalTimeScale = 4; skip.setText('▶▶'); };
      this.input.once('pointerdown', fast);
      const steps = this.engine.bonusRound();
      await this.playSteps(steps);
      this.input.off('pointerdown', fast);
      this.tweens.timeScale = 1; this.time.timeScale = 1; this.anims.globalTimeScale = 1;
      skip.destroy();
      this.speed = 1;
      this.syncAll();
      this.updateHUD({ score: this.engine.s.score, moves: 0 });
    }
    await wait(this, 300);
    this.winPopup();
  }

  winPopup() {
    const e = this.engine;
    const score = e.s.score;
    const th = e.s.stars;
    const stars = Math.max(1, e.starsEarned());
    const d = load();
    const prevStars = d.stars[this.levelId] || 0;
    const prevBest = d.best[this.levelId] || 0;
    const firstClear = !prevStars;
    const first3 = stars === 3 && prevStars < 3;
    const coins = 20 + stars * 10 + (this.level.boss ? 30 : 0) + (first3 ? 30 : 0);
    recordWin(this.levelId, stars, score, LEVELS.length + 1);
    const streakNow = addStreak();
    track('win'); track('stars', stars); track('streak', streakNow); flush();
    addCoins(coins);
    // 진행 보상: 5레벨마다 처음 클리어하면 부스터 선물 (막혔을 때의 구제책이 아니라 진행에 대한 보상)
    const GIFTS = ['hammer', 'shuffle', 'swap', 'moves'];
    const gift = firstClear && this.levelId % 5 === 0 ? GIFTS[(this.levelId / 5 - 1) % GIFTS.length] : null;
    if (gift) addBooster(gift, 1);
    // 보스(10번째) 레벨을 처음 깨면 다음 화면 전환 때 월드 클리어 연출
    if (firstClear && this.levelId % 10 === 0) this.worldCleared = this.level.world;

    const p = popup(this, { title: t('levelClear'), width: 900, height: 1180, closeButton: false });
    const B = p.box;
    // 별 뒤에서 도는 빛줄기
    const rays = this.add.image(0, -380, 'ptc_rays').setScale(1.7).setAlpha(0).setTint(0xFFF1A8);
    B.add(rays);
    this.tweens.add({ targets: rays, alpha: 0.6, duration: 500, delay: 300 });
    this.tweens.add({ targets: rays, angle: 360, duration: 9000, repeat: -1 });
    // ① 별 자리 (빈 별) — 점수가 기준을 넘는 순간 하나씩 채워진다
    const slots = [0, 1, 2].map(i => {
      const x = (i - 1) * 220, y = -360 + (i === 1 ? -30 : 0), size = i === 1 ? 210 : 180;
      B.add(this.add.image(x, y, 'star_big_off').setDisplaySize(size, size));
      return { x, y, size };
    });
    // ② 점수 카운트 + 미니 점수 바
    B.add(this.add.text(0, -200, t('score'), { ...TXT.dark, fontSize: '36px' }).setOrigin(0.5));
    const sc = this.add.bitmapText(0, -130, 'font_num_gold', '0', 88).setOrigin(0.5);
    B.add(sc);
    const BW = 560, bx = -BW / 2, by = -50;
    B.add(this.add.image(0, by, 'hud_score_bar_bg').setDisplaySize(BW, 44));
    const fill = this.add.image(bx, by, 'hud_score_bar_fill').setOrigin(0, 0.5).setDisplaySize(BW, 44);
    const fw = fill.width; fill.setCrop(0, 0, 0, fill.height);
    B.add(fill);
    const marks = th.map((v, i) => {
      const x = bx + BW * STAR_POS[i];
      const off = this.add.image(x, by, 'hud_score_star_off').setScale(0.45);
      const on = this.add.image(x, by, 'hud_score_star_on').setScale(0.45).setVisible(false);
      B.add([off, on]);
      return on;
    });
    const popStar = i => {
      const sl = slots[i];
      const st = this.add.image(sl.x, sl.y, 'star_big_on').setDisplaySize(sl.size, sl.size);
      const target = st.scale; st.setScale(target * 2.6).setAlpha(0).setAngle(-25);
      B.add(st);
      marks[i].setVisible(true);
      audio.play(`sfx_star_${i + 1}`);
      const w = { x: W / 2 + sl.x, y: H / 2 + sl.y };
      // 하늘에서 쾅 박히는 별: 박히는 순간 흔들림·충격파·진동
      this.tweens.add({ targets: st, scale: target, alpha: 1, angle: 0, duration: 240, ease: 'Quad.In', onComplete: () => {
        audio.play('sfx_star_slam'); audio.buzz(30 + i * 15);
        this.cameras.main.shake(140 + i * 40, 0.005 + i * 0.003);
        const ring = this.add.image(w.x, w.y, 'ptc_ring').setScale(0.3).setTint(0xFFE14D).setDepth(1001);
        this.tweens.add({ targets: ring, scale: 1.6 + i * 0.3, alpha: 0, duration: 450, onComplete: () => ring.destroy() });
        this.tweens.add({ targets: st, scale: target * 1.12, yoyo: true, duration: 90 });
      } });
      for (let k = 0; k < 10; k++) {
        const pt = this.add.image(w.x, w.y, k % 2 ? 'ptc_star' : 'ptc_spark').setScale(0.35).setTint(0xFFD23F).setDepth(1001);
        const a = (k / 10) * Math.PI * 2;
        this.tweens.add({ targets: pt, x: w.x + Math.cos(a) * 170, y: w.y + Math.sin(a) * 170, alpha: 0, angle: 180, duration: 650, onComplete: () => pt.destroy() });
      }
    };
    let shown = 0;
    const DUR = 1600;
    this.time.delayedCall(350, () => {
      popStar(0); shown = 1;   // 클리어하면 별 1개는 항상
      this.tweens.addCounter({
        from: 0, to: score, duration: DUR, ease: 'Cubic.Out',
        onUpdate: tw => {
          const v = Math.round(tw.getValue());
          sc.setText(v.toLocaleString('en-US'));
          fill.setCrop(0, 0, fw * starProgress(v, th), fill.height);
          while (shown < stars && v >= th[shown]) { popStar(shown); shown++; }
        },
        onComplete: () => { while (shown < stars) { popStar(shown); shown++; } showRewards(); },
      });
    });
    // ③ 최고 기록 / 다음 별 안내
    const info = this.add.text(0, 10, '', { ...TXT.dark, fontSize: '32px', align: 'center' }).setOrigin(0.5);
    B.add(info);
    // ④ 보상 (코인 카운트 · 선물 · 3별 보너스)
    const rewardY = 150;
    const showRewards = () => {
      if (!firstClear && score > prevBest) {
        info.setText(t('newBest')).setColor('#FF6A1F');
        info.setScale(2).setAlpha(0).setAngle(-8);
        this.tweens.add({ targets: info, scale: 1, alpha: 1, duration: 300, ease: 'Back.Out' });
      } else if (stars < 3) {
        info.setText(t('nextStar', (th[stars] - score).toLocaleString('en-US')));
      } else {
        info.setText(t('perfect')).setColor('#FF6A1F');
      }
      if (stars > prevStars && prevStars > 0) {
        const up = this.add.text(0, info.y + info.height / 2 + 28, t('starUp', prevStars, stars), { ...TXT.small, fontSize: '30px', stroke: '#0B3E8A' }).setOrigin(0.5);
        B.add(up);
      }
      const items = [{ icon: 'ico_coin', scale: 0.42, label: `+${coins}`, stroke: '#7A3F00', count: coins }];
      if (gift) items.push({ icon: `boost_${gift}`, scale: 0.52, label: '+1', stroke: '#0B3E8A' });
      const gap = 230, x0 = -((items.length - 1) * gap) / 2;
      items.forEach((it, i) => {
        const x = x0 + i * gap;
        const ic = this.add.image(x - 45, rewardY, it.icon).setScale(0);
        const tx = this.add.text(x + 5, rewardY, it.count ? '+0' : it.label, { ...TXT.mid, stroke: it.stroke }).setOrigin(0, 0.5).setAlpha(0);
        B.add([ic, tx]);
        this.tweens.add({ targets: ic, scale: it.scale, duration: 300, delay: i * 200, ease: 'Back.Out' });
        this.tweens.add({ targets: tx, alpha: 1, duration: 200, delay: i * 200 });
        if (it.count) this.tweens.addCounter({ from: 0, to: it.count, duration: 600, delay: 150, onUpdate: tw => tx.setText(`+${Math.round(tw.getValue())}`) });
      });
      audio.play('sfx_coin');
      if (first3) B.add(this.add.text(0, rewardY + 70, t('first3Bonus'), { ...TXT.small, fontSize: '28px', stroke: '#7A3F00' }).setOrigin(0.5));
      if (stars === 3) this.confetti();
    };
    // ⑤ 버튼 + 마스코트
    const hasNext = this.levelId < LEVELS.length;
    B.add(button(this, 0, 400, hasNext ? t('next') : t('map'), () => this.goNext(), { width: 500, height: 160, size: 60 }));
    B.add(iconButton(this, -330, 400, 'ico_retry', () => this.restart(), { size: 130 }));
    B.add(iconButton(this, 330, 400, 'ico_map', () => this.toMap(), { size: 130 }));
    if (streakNow >= 2) {
      const chip = this.add.text(-300, -500, t('streakNow', streakNow), { ...TXT.small, fontSize: '30px', color: '#FFE14D', stroke: '#C2410C', strokeThickness: 8 }).setOrigin(0.5).setAngle(-8);
      B.add(chip);
      this.tweens.add({ targets: chip, scale: 1.1, yoyo: true, repeat: -1, duration: 450 });
    }
    const m = this.add.image(370, -420, stars === 3 ? 'mascot_happy' : 'mascot_idle').setScale(0.17);
    B.add(m);
    this.tweens.add({ targets: m, y: m.y - 14, yoyo: true, repeat: -1, duration: stars === 3 ? 300 : 700 });
  }

  confetti() {
    const colors = [0xFF4D6D, 0xFF9F1C, 0xFFD23F, 0x8CC63F, 0x3EC1F3, 0xA55CF0];
    for (let i = 0; i < 60; i++) {
      const c = this.add.image(Phaser.Math.Between(0, W), -40 - Math.random() * 300, 'ptc_confetti')
        .setTint(colors[i % 6]).setScale(0.8 + Math.random()).setAngle(Math.random() * 360).setDepth(1002);
      this.tweens.add({ targets: c, y: H + 60, angle: c.angle + Phaser.Math.Between(180, 720), x: c.x + Phaser.Math.Between(-120, 120),
        duration: 1800 + Math.random() * 1400, delay: Math.random() * 500, ease: 'Sine.In', onComplete: () => c.destroy() });
    }
  }

  loseSequence() {
    this.busy = true; this.resetHint();
    if (this.engine.s.loseReason === 'timer') return this.failPopup(t('timerBoom'));
    const img = this.bigText('txt_out_of_moves');
    audio.voice('almost');
    this.time.delayedCall(1000, () => { img.destroy(); this.extraMovesPopup(); });
  }

  extraMovesPopup() {
    const d = load();
    const p = popup(this, { title: t('outOfMoves'), width: 900, height: 1000, closeButton: false });
    p.box.add(this.add.image(0, -230, 'boost_moves').setScale(1.4));
    p.box.add(this.add.text(0, -60, t('plus5Ask'), TXT.body).setOrigin(0.5));
    this.goalSummary(p.box, 50);
    const owned = d.boosters.moves || 0;
    const label = owned > 0 ? `${t('plus5')} (${owned})` : `${t('plus5')}  ${BOOSTER_PRICE.moves}`;
    p.box.add(button(this, 0, 250, label, () => {
      if (owned > 0) useBooster('moves');
      else if (!spendCoins(BOOSTER_PRICE.moves)) { toast(this, t('notEnough')); return; }
      audio.play('sfx_booster');
      this.engine.addMoves(5);
      p.close();
      this.updateHUD({ moves: this.engine.s.moves });
      this.engine.ensurePlayable();
      this.syncAll();
      this.busy = false; this.scheduleHint();
    }, { width: 580, height: 150, size: 52 }));
    if (owned <= 0) {
      p.box.add(this.add.image(-70, 360, 'ico_coin').setScale(0.36));
      p.box.add(this.add.text(-35, 360, `${d.coins}`, { ...TXT.dark, fontSize: '36px' }).setOrigin(0, 0.5));
    }
    p.box.add(button(this, 0, 440, t('giveUp'), () => { p.close(true); this.failPopup(t('outOfMoves')); }, { kind: 'secondary', width: 380, height: 120, size: 42 }));
  }

  goalSummary(box, y) {
    const s = this.engine.s;
    s.goals.forEach((g, i) => {
      const st = Math.min(170, 720 / s.goals.length), x = (i - (s.goals.length - 1) / 2) * st;
      box.add(this.add.image(x, y + 30, this.goalIcon(g)).setScale((g.type === 'score' ? 1.4 : 0.7) * st / 170));
      const left = g.type === 'score' ? Math.max(0, g.target - s.score) : Math.max(0, g.target - g.progress);
      box.add(left <= 0 ? this.add.image(x + 40, y + 70, 'hud_goal_check').setScale(0.6) : this.add.text(x, y + 100, g.type === 'score' ? `${Math.ceil(left / 1000)}k` : `${left}`, { ...TXT.small }).setOrigin(0.5));
    });
  }

  failPopup(reason) {
    audio.play('jingle_lose');
    const s = this.engine.s;
    const lostStreak = breakStreak();
    const p = popup(this, { title: t('failed'), width: 900, height: 1160, closeButton: false });
    const B = p.box;
    B.add(this.add.image(0, -360, 'popup_deco_fail').setScale(0.45));
    B.add(this.add.text(0, -225, reason, TXT.body).setOrigin(0.5));
    B.add(this.add.text(0, -160, t('leftGoals'), { ...TXT.dark, fontSize: '32px' }).setOrigin(0.5));
    this.goalSummary(B, -120);
    // 아깝게 졌으면(남은 목표가 조금) 응원 문구, 아니면 TIP
    const near = s.goals.every(g => { const left = Math.max(0, g.target - g.progress); return left <= 3 || left / Math.max(1, g.target) <= 0.2; });
    const msg = this.add.text(0, 130, near ? t('almost') : pickTip(), near ? { ...TXT.mid, fontSize: '44px', color: '#FFE14D', stroke: '#C2410C', strokeThickness: 10 }
      : { ...TXT.body, fontSize: '28px', wordWrap: { width: 720, useAdvancedWrap: true } }).setOrigin(0.5);
    B.add(msg);
    if (near) this.tweens.add({ targets: msg, scale: 1.08, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.InOut' });
    if (lostStreak) B.add(this.add.text(0, 215, t('streakLost'), { ...TXT.small, fontSize: '28px', color: '#FFB0B0', stroke: '#7A1020', strokeThickness: 7 }).setOrigin(0.5));
    const retry = button(this, 0, 320, t('retry'), () => this.restart(), { width: 520, height: 160, size: 60 });
    B.add(retry);
    this.tweens.add({ targets: retry, scale: 1.05, yoyo: true, repeat: -1, duration: 600, delay: 800, ease: 'Sine.InOut' });
    B.add(button(this, 0, 470, t('map'), () => this.toMap(), { kind: 'secondary', width: 380, height: 120, size: 42 }));
  }

  pausePopup() {
    if (this.engine.s.status !== 'play') return;
    if (this.busy && !this.armed) { this.pendingPause = true; return; }   // 애니메이션이 끝나면 바로 연다
    this.resetHint();
    const wasBusy = this.busy; this.busy = true;
    const d = load();
    const p = popup(this, { title: t('paused'), width: 860, height: 1000, onClose: () => { this.busy = wasBusy; if (!wasBusy) this.scheduleHint(); } });
    const row = (y, label, getOn, toggle, on, off) => {
      p.box.add(this.add.text(-280, y, label, TXT.dark).setOrigin(0, 0.5));
      const b = iconButton(this, 220, y, getOn() ? on : off, () => { const v = toggle(); b.icon.setTexture(v ? on : off); });
      p.box.add(b);
    };
    row(-250, t('sound'), () => d.sfx, () => audio.toggleSfx(), 'ico_sound_on', 'ico_sound_off');
    row(-90, t('music'), () => d.music, () => audio.toggleMusic(), 'ico_music_on', 'ico_music_off');
    p.box.add(button(this, 0, 90, t('resume'), () => p.close(), { width: 520, height: 150, size: 56 }));
    const abandon = () => { if (this.engine.s.turn > 0) breakStreak(); };
    p.box.add(button(this, -150, 260, t('retry'), () => { abandon(); this.restart(); }, { kind: 'secondary', width: 280, height: 120, size: 40 }));
    p.box.add(button(this, 150, 260, t('quit'), () => { abandon(); this.toMap(); }, { kind: 'secondary', width: 280, height: 120, size: 40 }));
  }
  // 뒤로가기 (One a Day): 퍼즐 중이면 일시정지 창
  onBack() { if (this.engine.s.status === 'play') { this.pausePopup(); return true; } }

  levelStartPopup() {
    const lv = this.level;
    const s = this.engine.s;
    const p = popup(this, { title: `${t('level')} ${lv.id}`, width: 900, height: 1160, closeButton: false });
    const B = p.box;
    // 월드 이름 (+ 보스 경고)
    B.add(this.add.text(0, -405, `${lv.world}. ${t('worldName')[lv.world - 1]}`, { ...TXT.small, fontSize: '32px', stroke: '#0B3E8A' }).setOrigin(0.5));
    if (lv.boss) {
      const badge = this.add.text(330, -500, 'BOSS', { ...TXT.big, fontSize: '58px', color: '#FFE14D', stroke: '#8A1E00', strokeThickness: 14 }).setOrigin(0.5).setAngle(14);
      B.add(badge);
      this.tweens.add({ targets: badge, scale: 1.15, angle: 8, yoyo: true, repeat: -1, duration: 420, ease: 'Sine.InOut' });
      B.add(this.add.text(0, -350, t('bossWarn'), { ...TXT.small, fontSize: '30px', color: '#FF5A3A', stroke: '#FFFFFF', strokeThickness: 6 }).setOrigin(0.5));
      this.cameras.main.shake(200, 0.004);
    }
    B.add(this.add.text(0, -285, t('goal'), TXT.dark).setOrigin(0.5));
    // 목표 카드가 하나씩 튀어나옴
    s.goals.forEach((g, i) => {
      const st = Math.min(200, 760 / s.goals.length), x = (i - (s.goals.length - 1) / 2) * st;
      const card = this.add.container(x, -160);
      card.add(this.add.nineslice(0, 0, 'hud_goal_box', null, 170, 190, 40, 40, 40, 40));
      card.add(this.add.image(0, -22, this.goalIcon(g)).setScale(g.type === 'score' ? 1.5 : g.type === 'jelly' ? 0.78 : 0.7));
      card.add(this.add.text(0, 52, g.type === 'score' ? g.target.toLocaleString('en-US') : `${g.target}`, { ...TXT.small, fontSize: '40px' }).setOrigin(0.5));
      card.setScale(0); card.fullScale = st / 200;
      B.add(card);
      this.tweens.add({ targets: card, scale: card.fullScale, delay: 250 + i * 140, duration: 320, ease: 'Back.Out', onStart: () => audio.play('sfx_select') });
    });
    B.add(this.add.text(0, -20, `${t('moves')}  ${s.moves}`, TXT.dark).setOrigin(0.5));
    B.add(starsRow(this, 0, 70, load().stars[lv.id] || 0, { size: 76, gap: 92, key: 'small' }));
    // 연승 보너스: 연속 클리어 수만큼 특수 블록 칸이 채워짐
    const streak = Math.min(3, load().streak || 0);
    B.add(this.add.text(0, 150, streak ? t('streakOn', load().streak) : t('streakHint'), { ...TXT.small, fontSize: '28px', color: streak ? '#FFE14D' : '#FFFFFF', stroke: streak ? '#C2410C' : '#123A6E', strokeThickness: 7 }).setOrigin(0.5));
    ['tile_red_lineH', 'tile_blue_bomb', 'tile_rainbow'].forEach((k, i) => {
      const on = i < streak;
      const ic = this.add.image((i - 1) * 130, 222, k).setScale(0.72).setAlpha(on ? 1 : 0.35);
      if (!on) ic.setTint(0x8899AA);
      B.add(ic);
      if (on) this.tweens.add({ targets: ic, scale: 0.82, yoyo: true, repeat: -1, duration: 500, delay: i * 150, ease: 'Sine.InOut' });
    });
    // TIP 말풍선 + 몽이
    B.add(this.add.nineslice(30, 330, 'hud_goal_box', null, 760, 140, 40, 40, 40, 40));
    const m = this.add.image(-345, 335, 'mascot_talk').setScale(0.16);
    B.add(m);
    this.tweens.add({ targets: m, y: m.y - 8, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.InOut' });
    B.add(this.add.text(50, 330, pickTip(), { ...TXT.body, fontSize: '28px', align: 'left', wordWrap: { width: 600, useAdvancedWrap: true }, lineSpacing: 6 }).setOrigin(0.5));
    const go = button(this, 0, 475, t('start'), () => { p.close(); this.startPlay(); }, { width: 520, height: 160, size: 60 });
    B.add(go);
    this.tweens.add({ targets: go, scale: 1.05, yoyo: true, repeat: -1, duration: 600, delay: 900, ease: 'Sine.InOut' });
  }

  async startPlay() {
    await this.applyStreakBonus();
    const tut = this.level.tutorial;
    const d = load();
    if (tut && !d.seenTut[tut.key]) {
      d.seenTut[tut.key] = true; save();
      this.tutorialBubble(t(`tut.${tut.key}`), () => { this.busy = false; if (tut.hand) this.showTutorialHand(); this.scheduleHint(); });
    } else { this.busy = false; this.scheduleHint(); }
  }

  // 연승 보너스: 보드의 평범한 블록 몇 개를 특수 블록으로 바꿔서 시작 (1연승 줄 · 2연승 +폭탄 · 3연승 +진주)
  async applyStreakBonus() {
    const n = Math.min(3, load().streak || 0);
    if (!n) return;
    const e = this.engine;
    const cand = [];
    e.each((cl, r, c) => { if (cl.p && cl.p.k === 'tile' && !cl.p.sp && !cl.cover) cand.push([r, c]); });
    Phaser.Utils.Array.Shuffle(cand);
    const kinds = [Math.random() < 0.5 ? 'lineH' : 'lineV', 'bomb', 'rainbow'].slice(0, n);
    for (let i = 0; i < kinds.length && i < cand.length; i++) {
      const [r, c] = cand[i];
      const p = e.s.cells[r][c].p;
      p.sp = kinds[i];
      const s = this.sprites.get(p.id);
      this.setPieceTexture(p.id, { sp: p.sp });
      if (s) {
        const sc = s.scale; s.setScale(0);
        this.tweens.add({ targets: s, scale: sc, duration: 380, ease: 'Back.Out' });
        this.fx('fx_special_create', s.x, s.y, { scale: 1.2 });
        this.sparkles(s.x, s.y, 0xFFD23F, 8);
      }
      audio.play('sfx_special_create');
      await wait(this, 260);
    }
  }

  tutorialBubble(text, done) {
    const layer = this.add.container(0, 0).setDepth(900);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x06204A, 0.35).setInteractive();
    const m = this.add.image(170, H - 430, 'mascot_talk').setScale(0.3);
    const bubble = this.add.nineslice(W / 2 + 90, H - 600, 'popup_panel', null, 780, 300, 96, 96, 96, 96);
    const txt = this.add.text(bubble.x, bubble.y, text, { ...TXT.body, fontSize: '38px', wordWrap: { width: 680, useAdvancedWrap: true } }).setOrigin(0.5);
    const hint = this.add.text(bubble.x + 300, bubble.y + 120, '▶', { ...TXT.small, fontSize: '30px' }).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.3, yoyo: true, repeat: -1, duration: 400 });
    layer.add([dim, m, bubble, txt, hint]);
    layer.setAlpha(0); this.tweens.add({ targets: layer, alpha: 1, duration: 250 });
    this.tweens.add({ targets: m, y: m.y - 14, yoyo: true, repeat: -1, duration: 500 });
    dim.once('pointerup', () => { audio.play('sfx_click'); this.tweens.add({ targets: layer, alpha: 0, duration: 200, onComplete: () => { layer.destroy(); done(); } }); });
  }

  showTutorialHand() {
    const m = this.engine.possibleMoves(1)[0]; if (!m) return;
    const a = this.xy(...m[0]), b = this.xy(...m[1]);
    const hand = this.add.image(a.x + 30, a.y + 50, 'tutorial_hand').setScale(0.55).setOrigin(0.3, 0.1);
    this.overLayer.add(hand);
    this.tutorialHand = hand;
    this.tweens.add({ targets: hand, x: b.x + 30, y: b.y + 50, yoyo: true, repeat: -1, duration: 700, hold: 200, repeatDelay: 250, ease: 'Sine.InOut' });
  }

  // ═══ 화면 이동 ═════════════════════════════════════════════
  restart() { this.scene.restart({ levelId: this.levelId }); }
  toMap() {
    if (this.worldCleared) return this.scene.start('WorldClear', { world: this.worldCleared });
    this.scene.start('Map', { celebrate: true });
  }
  goNext() {
    if (this.worldCleared) return this.toMap();
    if (this.levelId < LEVELS.length) this.scene.restart({ levelId: this.levelId + 1 });
    else this.toMap();
  }
}
