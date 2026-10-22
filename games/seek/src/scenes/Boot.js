// 로딩: 인물 · 단서 · 서재 썸네일 · 효과음 · 코드 텍스처 (화별 그림은 loadEp)
import { W, H, TITLE } from '../config.js?v=0.25.0';
import { SFX } from '../audio.js?v=0.25.0';
import { makeTextures } from '../ui.js?v=0.25.0';
import { EPISODES } from '../episodes.js?v=0.25.0';
// 처음엔 공통(인물 · 단서 · 서재 썸네일)만 · 화별 그림(맵 · 증거 · 웹툰)은 그 화를 열 때 loadEp 로
const WEBP = ['bg_flower', 'bg_office', 't1_2', 'c_seoyun_smile', 'c_seoyun_doubt', 'c_seoyun_shock', 'c_dohyun_smile', 'c_dohyun_nervous', 'c_dohyun_serious', 'c_jia', 'c_jia_smile', 'c_jia_sad', 'c_mother', 'c_hana', 'c_taejun'];
for (const e of EPISODES) { WEBP.push(e.toon[2].img); for (const it of e.hunt.items) if (it.clue && !WEBP.includes(it.clue)) WEBP.push(it.clue); }
export const epKeys = ep => { const n = ep.no; return [`map${n}`, `ev${n}_a`, `ev${n}_b`, `t${n}_1`, `t${n}_2`, `t${n}_3`, `t${n}_4`].concat(n > 1 ? [`bg${n}`] : []); };
// 화 그림을 불러온 뒤 done() · 이미 있으면 바로
export function loadEp(scene, ep, done) {
  // 다른 화의 큰 그림(맵 · 증거 · 웹툰 · 물건 확대 조각)은 내려서 메모리를 비움 (서재 썸네일은 남김)
  const tx = scene.textures;
  for (const o of EPISODES) if (o !== ep) for (const k of epKeys(o)) if (!WEBP.includes(k) && tx.exists(k)) tx.remove(k);
  for (const k of tx.getTextureKeys()) if (/^(f_|n\d|cafe_hunt)/.test(k)) tx.remove(k);   // 냥카페 그림도 내림
  for (const k of tx.getTextureKeys()) if (k.startsWith('hm_') && !k.startsWith(`hm_${ep.id}_`)) tx.remove(k);
  const need = epKeys(ep).filter(k => !scene.textures.exists(k)); if (!need.length) return done();
  for (const k of need) scene.load.image(k, `assets/v2/${k}.webp`);
  scene.load.once('complete', () => done()); scene.load.start();
}
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x2E1A2A);
    this.add.rectangle(W / 2, H / 2 + 90, 480, 8, 0xFFFFFF, 0.15);
    const bar = this.add.rectangle(W / 2 - 240, H / 2 + 90, 4, 8, 0xFF9DB6).setOrigin(0, 0.5);
    this.add.text(W / 2, H / 2, TITLE, { fontFamily: 'Pretendard', fontStyle: '900', fontSize: '84px', color: '#FFF6F8' }).setOrigin(0.5);
    this.load.on('progress', v => { bar.width = 480 * v; });
    for (const k of WEBP) this.load.image(k, `assets/v2/${k}.webp`);
    this.load.image('cafe_room', 'assets/cafe/room.webp');
    for (const n of SFX) this.load.audio(n, [`assets/audio/${n}.m4a`]);
    this.load.on('loaderror', () => {});
  }
  create() { makeTextures(this); this.scene.start('Library'); }
}
