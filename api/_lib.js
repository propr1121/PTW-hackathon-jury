import { put, get } from '@vercel/blob';

export const CRITERIA = ['up', 'ld', 'pu', 'vn'];
export const PHASES = ['pre', 'live', 'final'];

const PREFIX = () => (process.env.DATA_PREFIX || 'ptw-jury-2026').replace(/[^a-zA-Z0-9_-]/g, '');

import { createHash } from 'node:crypto';
import { CONFIG } from './_config.js';

const fp = k => createHash('sha256').update(String(k)).digest('hex');
function match(list, k) {
  if (!k || typeof k !== 'string' || k.length < 16) return null;
  const h = fp(k);
  return list.find(x => x.hash === h) || null;
}
export function judges() { return CONFIG.judges; }
export function judgeByKey(k) { return match(CONFIG.judges, k); }
export function viewerByKey(k) { return match(CONFIG.viewers, k); }
export function isAdmin(k) { return !!match(CONFIG.admins, k); }
export function publicJudge(j) { return { id: j.id, name: j.name, org: j.org }; }

// ---- JSON documents in a private Blob store (one file per document, overwritten in place) ----
const MEM = process.env.LOCAL_MEMORY === '1' ? new Map() : null;

export async function readDoc(name) {
  if (MEM) return MEM.has(name) ? JSON.parse(MEM.get(name)) : null;
  const path = `${PREFIX()}/${name}.json`;
  let r;
  try {
    r = await get(path, { access: 'private', useCache: false });
  } catch (e) {
    if (e && (e.name === 'BlobNotFoundError' || /not.?found/i.test(String(e.message)))) return null;
    throw e;
  }
  if (!r || r.statusCode !== 200 || !r.stream) return null;
  const text = await new Response(r.stream).text();
  return text ? JSON.parse(text) : null;
}

export async function writeDoc(name, data) {
  if (MEM) { MEM.set(name, JSON.stringify(data)); return name; }
  const path = `${PREFIX()}/${name}.json`;
  await put(path, JSON.stringify(data), {
    access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json',
  });
  return path;
}

// ---- domain helpers ----
export async function getEntries() {
  const d = await readDoc('entries');
  return (d && Array.isArray(d.entries)) ? d.entries : [];
}

export async function getJudgeDoc(id) {
  const d = await readDoc('judge-' + id);
  return d || { scores: {}, submitted: false, submittedAt: null };
}

export function total(sc) {
  if (!sc) return null;
  let s = 0;
  for (const c of CRITERIA) {
    if (typeof sc[c] !== 'number') return null;
    s += sc[c];
  }
  return s;
}

export function validScore(v) {
  return v === null || (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 5);
}

export async function statusAll() {
  const js = judges();
  const docs = await Promise.all(js.map(j => getJudgeDoc(j.id)));
  return js.map((j, i) => ({ ...publicJudge(j), submitted: !!docs[i].submitted, submittedAt: docs[i].submittedAt || null, _doc: docs[i] }));
}

export function computeResults(entries, status, onlySubmitted = true) {
  const counted = status.filter(s => !onlySubmitted || s.submitted);
  const rows = entries.map(e => {
    const perJudge = {};
    const totals = [];
    const crit = { up: [], ld: [], pu: [], vn: [] };
    for (const s of counted) {
      const f = s._doc.scores?.[e.id]?.final;
      const t = total(f);
      perJudge[s.id] = t === null ? null : { total: t, ...f };
      if (t !== null) {
        totals.push(t);
        for (const c of CRITERIA) crit[c].push(f[c]);
      }
    }
    const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    return {
      id: e.id, team: e.team, project: e.project,
      average: avg(totals), judgesCounted: totals.length,
      criteria: { up: avg(crit.up), ld: avg(crit.ld), pu: avg(crit.pu), vn: avg(crit.vn) },
      perJudge,
    };
  });
  const scored = rows.filter(r => r.average !== null);
  const key = r => [r.average, r.criteria.pu ?? -1, r.criteria.up ?? -1];
  scored.sort((a, b) => {
    const ka = key(a), kb = key(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return kb[i] - ka[i];
    return 0;
  });
  let rank = 0;
  scored.forEach((r, i) => {
    const prev = scored[i - 1];
    const same = prev && key(prev).every((v, k) => Math.abs(v - key(r)[k]) < 1e-9);
    rank = same ? rank : i + 1;
    r.rank = rank;
    r.tiedOnAverage = scored.some(o => o !== r && Math.abs(o.average - r.average) < 1e-9);
    r.exactTie = scored.some(o => o !== r && key(o).every((v, k) => Math.abs(v - key(r)[k]) < 1e-9));
  });
  return {
    judges: counted.map(publicJudge),
    ranking: scored,
    unscored: rows.filter(r => r.average === null).map(r => ({ id: r.id, team: r.team, project: r.project })),
  };
}

export async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}

export function send(res, code, data) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.statusCode = code;
  res.end(JSON.stringify(data));
}
