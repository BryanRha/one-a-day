// 온라인 순위표 (Supabase 무료 프로젝트) — RANK.url · RANK.key 를 넣으면 켜짐, 비어 있으면 화면에 순위 버튼이 나오지 않음
// 표: scores(board 문자, name 별명, score 높을수록 위, extra 기록) · 공개 읽기·쓰기 (anon 키는 공개용)
// 판: 'war:w1'…'war:w15' (전쟁실 점수) · 'daily:YYYY-MM-DD' (오늘의 작전: 빠른 날 · 적은 손실)
import { load, save } from './save.js?v=0.17.3';

export const RANK = { url: '', key: '' };
export const rankOn = () => !!(RANK.url && RANK.key);
const H = () => ({ apikey: RANK.key, Authorization: `Bearer ${RANK.key}`, 'Content-Type': 'application/json' });
const clean = s => String(s || '').replace(/[<>"'`\\]/g, '').trim().slice(0, 12);

export function nick() { return load().nick || ''; }
export function setNick(n) { const d = load(); d.nick = clean(n); save(); return d.nick; }

export async function submit(board, score, extra = {}) {
  if (!rankOn() || !nick()) return false;
  try { const r = await fetch(`${RANK.url}/rest/v1/scores`, { method: 'POST', headers: { ...H(), Prefer: 'return=minimal' }, body: JSON.stringify({ board, name: nick(), score: Math.round(score), extra }) }); return r.ok; } catch { return false; }
}
// 위에서부터 (같은 별명은 최고 기록 하나만)
export async function top(board, n = 20) {
  if (!rankOn()) return null;
  try {
    const r = await fetch(`${RANK.url}/rest/v1/scores?board=eq.${encodeURIComponent(board)}&order=score.desc,created_at.asc&limit=200&select=name,score,extra`, { headers: H() });
    if (!r.ok) return null;
    const seen = new Set(), out = [];
    for (const row of await r.json()) { if (seen.has(row.name)) continue; seen.add(row.name); out.push(row); if (out.length >= n) break; }
    return out;
  } catch { return null; }
}
// 별명 입력 (Phaser 위에 잠깐 띄우는 입력칸)
export function askNick(done) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;background:rgba(10,12,6,.75);display:flex;align-items:center;justify-content:center;z-index:9999;font-family:Pretendard,sans-serif';
  wrap.innerHTML = `<div style="background:#3B4220;border:2px solid #FFD45A;border-radius:18px;padding:22px;width:min(320px,86vw);color:#FFF8E6;text-align:center">
    <div style="font-size:18px;font-weight:800;margin-bottom:6px">순위표 별명</div><div style="font-size:13px;color:#C8C0A0;margin-bottom:12px">최대 12자 · 다른 사람에게 보여요</div>
    <input maxlength="12" style="width:100%;box-sizing:border-box;font-size:18px;padding:10px;border-radius:10px;border:0;text-align:center" value="${nick()}">
    <div style="display:flex;gap:10px;margin-top:14px"><button data-k="0" style="flex:1;padding:10px;border-radius:12px;border:0;background:#55603A;color:#FFF8E6;font-weight:800">취소</button><button data-k="1" style="flex:1;padding:10px;border-radius:12px;border:0;background:#FFD45A;color:#2B2416;font-weight:800">확인</button></div></div>`;
  document.body.appendChild(wrap);
  const inp = wrap.querySelector('input'); setTimeout(() => inp.focus(), 50);
  const close = ok => { const v = clean(inp.value); wrap.remove(); if (ok && v) { setNick(v); done && done(v); } };
  wrap.querySelectorAll('button').forEach(b => b.onclick = () => close(b.dataset.k === '1'));
  inp.onkeydown = e => { if (e.key === 'Enter') close(true); };
}
