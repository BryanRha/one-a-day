// 시작: 엔진 · 아이콘 · 저장 불러오기 → 타이틀 (시험: ?test=1-1 바로 전투, &auto=1 자동)
import { initEngine, E } from './engine.js?v=0.57.0';
import { bindKeys } from './input.js?v=0.57.0';
import { makeIcons } from './icons.js?v=0.57.0';
import { load } from './assets.js?v=0.57.0';
import { STAGES, CHAPTERS } from './data.js?v=0.57.0';
import { Battle } from './battle.js?v=0.57.0';
import { preloadSfx } from './audio.js?v=0.57.0';
import { G, heroStats } from './state.js?v=0.57.0';
import { startUI } from './ui.js?v=0.57.0';

const q = new URLSearchParams(location.search);
const bar = document.getElementById('bootbar'), boot = document.getElementById('boot');
const prog = v => { if (bar) bar.style.width = Math.round(v * 100) + '%'; };
async function main() {
  initEngine(document.getElementById('view')); bindKeys(); preloadSfx(); prog(0.1);
  await load('warrior'); prog(0.4); await makeIcons(); prog(0.7);
  window.__E = E;
  if (q.get('test')) {
    const S = STAGES.find(s => s.id === q.get('test')) || STAGES[0]; S.chapterName = CHAPTERS[0].name;
    if (q.get('speed')) E.timeScale = +q.get('speed'); const ps = q.get('ps') ? { ...heroStats(), ...JSON.parse(atob(q.get('ps'))) } : heroStats();
    const B = new Battle(S, ps, { auto: q.get('auto') === '1', end: (b, r) => { window.result = r; console.log('#result', JSON.stringify(r)); }, died: () => { window.result = { died: 1 }; console.log('#died'); }, pause: () => {} });
    window.__B = B; await B.start(prog); boot.classList.add('off'); window.done = 1; return;
  }
  await startUI(prog); boot.classList.add('off'); window.done = 1;
}
main().catch(e => { console.error(e); const t = document.getElementById('boottip'); if (t) t.textContent = '불러오기에 실패했어요. 다시 열어 주세요.'; });
