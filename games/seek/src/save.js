// 저장 (localStorage)
const KEY = 'his_secret_v1';
let data = null;
const fresh = () => ({ v: 1, sfx: true, coins: 30, ep: {}, choices: {} });   // ep: 화 id → { step: 'intro'|'hunt'|'mid'|'evidence'|'after'|'toon'|'done', found: [] }
export function load() {
  if (data) return data;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { data = null; }
  const f = fresh(); if (!data || data.v !== 1) data = f;
  for (const k of Object.keys(f)) if (data[k] === undefined) data[k] = f[k];
  return data;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(load())); } catch { /* */ } }
