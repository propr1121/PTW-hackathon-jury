import { judgeByKey, getJudgeDoc, writeDoc, getEntries, total, body, send } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    const b = await body(req);
    const judge = judgeByKey(b.k);
    if (!judge) return send(res, 401, { error: 'Invalid link' });

    const [doc, entries] = await Promise.all([getJudgeDoc(judge.id), getEntries()]);
    if (doc.submitted) return send(res, 200, { ok: true, already: true });
    if (!entries.length) return send(res, 400, { error: 'There are no entries to score yet.' });

    const missing = entries.filter(e => total(doc.scores?.[e.id]?.final) === null).map(e => e.project || e.team);
    if (missing.length) return send(res, 400, { error: 'Final scores are missing for: ' + missing.join(', ') });

    doc.submitted = true;
    doc.submittedAt = new Date().toISOString();
    await writeDoc('judge-' + judge.id, doc);
    send(res, 200, { ok: true, submittedAt: doc.submittedAt });
  } catch (e) {
    send(res, 500, { error: 'Server error', detail: String(e.message || e) });
  }
}
