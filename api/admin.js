import { IS_DEMO, isAdmin, viewerByKey, getEntries, writeDoc, statusAll, computeResults, getJudgeDoc, body, send } from './_lib.js';

const FIELDS = ['team', 'project', 'link', 'access', 'q1', 'q2', 'q3', 'q4', 'comments', 'submittedAt', 'extra'];

function cleanEntry(e, i) {
  const s = v => (typeof v === 'string' ? v.trim().slice(0, 8000) : (v == null ? '' : String(v).slice(0, 8000)));
  const out = {};
  for (const f of FIELDS) out[f] = s(e[f]);
  const id = s(e.id) || ('e' + Date.now().toString(36) + i);
  out.id = id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || ('e' + i);
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    const b = await body(req);
    const admin = isAdmin(b.k);
    const organiser = admin ? null : viewerByKey(b.k);
    if (!admin && !organiser) return send(res, 401, { error: 'Invalid organiser link' });
    const role = admin ? 'admin' : 'organiser';

    if (b.action === 'state') {
      const [entries, status] = await Promise.all([getEntries(), statusAll()]);
      const allIn = status.length > 0 && status.every(s => s.submitted);
      return send(res, 200, {
        role, viewerName: organiser ? organiser.name : 'John McCoy',
        entries,
        jury: status.map(({ _doc, ...s }) => s),
        allIn,
        demo: IS_DEMO,
        results: allIn ? computeResults(entries, status) : null,
      });
    }

    // Organisers (PTW) and the admin can import the submissions file. Rows are matched by id,
    // so uploading an updated export adds new teams and updates existing ones without losing scores.
    if (b.action === 'importEntries') {
      if (!Array.isArray(b.entries) || !b.entries.length) return send(res, 400, { error: 'No submissions found in the file' });
      const current = await getEntries();
      const byId = new Map(current.map(e => [e.id, e]));
      let added = 0, updated = 0;
      b.entries.slice(0, 300).map(cleanEntry).forEach(e => {
        if (byId.has(e.id)) { byId.set(e.id, { ...byId.get(e.id), ...e }); updated++; }
        else { byId.set(e.id, e); added++; }
      });
      const entries = [...byId.values()];
      await writeDoc('entries', { entries, updatedAt: new Date().toISOString() });
      return send(res, 200, { ok: true, entries, added, updated });
    }

    if (!admin) return send(res, 403, { error: 'Only the admin can do that.' });

    if (b.action === 'setEntries') {
      if (!Array.isArray(b.entries)) return send(res, 400, { error: 'entries must be a list' });
      const entries = b.entries.slice(0, 300).map(cleanEntry);
      const seen = new Set();
      for (const e of entries) { while (seen.has(e.id)) e.id += 'x'; seen.add(e.id); }
      await writeDoc('entries', { entries, updatedAt: new Date().toISOString() });
      return send(res, 200, { ok: true, entries });
    }

    if (b.action === 'reopen') {
      const id = String(b.judgeId || '').replace(/[^a-z0-9_-]/gi, '');
      const doc = await getJudgeDoc(id);
      doc.submitted = false;
      doc.submittedAt = null;
      await writeDoc('judge-' + id, doc);
      return send(res, 200, { ok: true });
    }

    if (b.action === 'resetDemo') {
      if (!IS_DEMO) return send(res, 403, { error: 'Reset is only available on the demo site.' });
      const { judges } = await import('./_lib.js');
      await writeDoc('entries', { entries: [], updatedAt: new Date().toISOString() });
      for (const j of judges()) await writeDoc('judge-' + j.id, { scores: {}, submitted: false, submittedAt: null });
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
