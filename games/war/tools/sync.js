// 리소스 동기화: war/assets(png·오디오) + 고양이와 마녀 공용 이펙트 → game/assets + manifest.json
// node tools/sync.js [--mirror]   (--mirror: ~/war-dist 로 복사 — OneDrive 폴더는 개발 서버가 직접 읽지 못함)
import { cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const GAME = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(GAME, '..', 'assets');
const WITCH = join(GAME, '..', '..', 'witch', 'assets');
const OUT = join(GAME, 'assets');
// 냥냥 마녀에서 빌려 쓰는 공용 UI·이펙트
const SHARED = /^(panel|card|ribbon|btn_(gold|purple|pink|icon)(_pressed)?|ico_(pause|home|retry|close|sound|sound_off|music|music_off|back|next|up|lock|check|play|settings|trophy)|cur_coin|star_on|sheet_(hit|poof|boom|pick|ring|dash))$/;
const WEBP = /^(bg_|co_|key_)/;

rmSync(OUT, { recursive: true, force: true });
for (const d of ['img', 'fx', 'audio']) mkdirSync(join(OUT, d), { recursive: true });
const fx = JSON.parse(readFileSync(join(WITCH, 'fx_manifest.json'), 'utf8'));
const images = [], sheets = {}, webpTodo = [];
for (const f of readdirSync(join(WITCH, 'png')).filter(f => f.endsWith('.png'))) {
  const key = basename(f, '.png');
  if (!SHARED.test(key)) continue;
  const m = key.match(/^sheet_(\w+)$/);
  if (m) { cpSync(join(WITCH, 'png', f), join(OUT, 'fx', f)); sheets[key] = fx[m[1]]; continue; }
  cpSync(join(WITCH, 'png', f), join(OUT, 'img', f)); images.push(key);
}
const own = readdirSync(join(SRC, 'png')).filter(f => f.endsWith('.png'));
if (existsSync(join(SRC, 'keyart', 'key_art.png'))) { cpSync(join(SRC, 'keyart', 'key_art.png'), join(SRC, 'png', 'key_art.png')); if (!own.includes('key_art.png')) own.push('key_art.png'); }
for (const f of own) {
  const key = basename(f, '.png');
  if (WEBP.test(key)) { webpTodo.push(key); images.push([key, 'webp']); continue; }
  cpSync(join(SRC, 'png', f), join(OUT, 'img', f)); images.push(key);
}
// 큰 그림은 WebP 로 압축 (assets/webp 캐시)
const CACHE = join(SRC, 'webp');
mkdirSync(CACHE, { recursive: true });
const stale = webpTodo.filter(k => !existsSync(join(CACHE, `${k}.webp`)) || statSync(join(CACHE, `${k}.webp`)).mtimeMs < statSync(join(SRC, 'png', `${k}.png`)).mtimeMs);
if (stale.length) {
  const require = createRequire(join(homedir(), 'witch-tools', 'package.json'));
  const puppeteer = require('puppeteer-core');
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
  const page = await browser.newPage();
  for (const k of stale) {
    const b64 = await page.evaluate(async src => { const i = new Image(); i.src = src; await i.decode(); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; c.getContext('2d').drawImage(i, 0, 0); return c.toDataURL('image/webp', 0.9).split(',')[1]; }, `data:image/png;base64,${readFileSync(join(SRC, 'png', `${k}.png`)).toString('base64')}`);
    writeFileSync(join(CACHE, `${k}.webp`), Buffer.from(b64, 'base64'));
  }
  await browser.close();
}
for (const k of webpTodo) cpSync(join(CACHE, `${k}.webp`), join(OUT, 'img', `${k}.webp`));
let audio = 0;
for (const sub of ['sfx', 'bgm']) for (const f of readdirSync(join(SRC, 'audio', sub)).filter(f => f.endsWith('.m4a'))) { cpSync(join(SRC, 'audio', sub, f), join(OUT, 'audio', f)); audio++; }
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ images, sheets }));
console.log(`images ${images.length} · sheets ${Object.keys(sheets).length} · audio ${audio}`);

if (process.argv.includes('--mirror')) {
  const DIST = join(homedir(), 'war-dist');
  mkdirSync(DIST, { recursive: true });
  for (const f of readdirSync(DIST)) rmSync(join(DIST, f), { recursive: true, force: true });
  for (const f of ['index.html', 'manifest.webmanifest', 'sw.js', 'lib', 'fonts', 'icons', 'assets', 'src']) if (existsSync(join(GAME, f))) cpSync(join(GAME, f), join(DIST, f), { recursive: true });
  console.log(`mirror → ${DIST}`);
}
