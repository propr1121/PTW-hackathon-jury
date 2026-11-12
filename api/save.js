import { judgeByKey, getJudgeDoc, writeDoc, getEntries, CRITERIA, PHASES, validScore, body, send } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    const b = await body(req);
    const judge = judgeByKey(b.k);
    if (!judge) return send(res, 401, { error: 'Invalid link' });

    const doc = await getJudgeDoc(judge.id);
    if (doc.submitted) return send(res, 409, { error: 'Your scores are already submitted and locked. Ask the organiser to reopen them if you need to change something.' });

    const entries = await getEntries();
    const ids = new Set(entries.map(e => e.id));
    const updates = Array.isArray(b.updates) ? b.updates : [];
    doc.scores = doc.scores || {};

    for (const u of updates) {
      if (!ids.has(u.entryId)) continue;
      const cur = doc.scores[u.entryId] || {};
      if (u.phase && PHASES.includes(u.phase) && u.scores && typeof u.scores === 'object') {
        const ph = { ...(cur[u.phase] || {}) };
        for (const c of CRITERIA) {
          if (c in u.scores) {
            const v = u.scores[c];
            if (!validScore(v)) return send(res, 400, { error: 'Scores must be whole numbers from 0 to 5' });
            if (v === null) delete ph[c]; else ph[c] = v;
          }
        }
        cur[u.phase] = ph;
      }
      if (typeof u.notes === 'string') cur.notes = u.notes.slice(0, 4000);
      doc.scores[u.entryId] = cur;
    }
    doc.updatedAt = new Date().toISOString();
    await writeDoc('judge-' + judge.id, doc);
    send(res, 200, { ok: true, scores: doc.scores });
  } catch (e) {
    send(res, 500, { error: 'Server error', detail: String(e.message || e) });
  }
}
