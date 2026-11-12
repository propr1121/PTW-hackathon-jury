import { isAdmin, viewerByKey, getEntries, writeDoc, statusAll, computeResults, getJudgeDoc, body, send } from './_lib.js';

function cleanEntry(e, i) {
  const s = v => (typeof v === 'string' ? v.trim().slice(0, 6000) : '');
  const id = s(e.id) || ('e' + Date.now().toString(36) + i);
  return {
    id: id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || ('e' + i),
    team: s(e.team), project: s(e.project), link: s(e.link), access: s(e.access),
    q1: s(e.q1), q2: s(e.q2), q3: s(e.q3), q4: s(e.q4), comments: s(e.comments),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    const b = await body(req);
    const admin = isAdmin(b.k);
    const viewer = admin ? null : viewerByKey(b.k);
    if (!admin && !viewer) return send(res, 401, { error: 'Invalid organiser link' });
    const role = admin ? 'admin' : 'viewer';
    if (b.action !== 'state' && !admin) return send(res, 403, { error: 'This link is view-only.' });

    if (b.action === 'state') {
      const [entries, status] = await Promise.all([getEntries(), statusAll()]);
      const allIn = status.length > 0 && status.every(s => s.submitted);
      return send(res, 200, {
        role, viewerName: viewer ? viewer.name : 'John McCoy',
        entries,
        jury: status.map(({ _doc, ...s }) => s),
        allIn,
        results: allIn ? computeResults(entries, status) : null,
      });
    }

    if (b.action === 'setEntries') {
      if (!Array.isArray(b.entries)) return send(res, 400, { error: 'entries must be a list' });
      const entries = b.entries.slice(0, 200).map(cleanEntry);
      const seen = new Set();
      for (const e of entries) { while (seen.has(e.id)) e.id += 'x'; seen.add(e.id); }
      await writeDoc('entries', { entries, updatedAt: new Date().toISOString() });
      return send(res, 200, { ok: true, entries });
    }

    if (b.action === 'reopen') {
      const doc = await getJudgeDoc(String(b.judgeId || ''));
      doc.submitted = false;
      doc.submittedAt = null;
      await writeDoc('judge-' + String(b.judgeId).replace(/[^a-z0-9_-]/gi, ''), doc);
      return send(res, 200, { ok: true });
    }

    if (b.action === 'forceResults') {
      const [entries, status] = await Promise.all([getEntries(), statusAll()]);
      return send(res, 200, { results: computeResults(entries, status, true) });
    }

    send(res, 400, { error: 'Unknown action' });
  } catch (e) {
    send(res, 500, { error: 'Server error', detail: String(e.message || e) });
  }
}
