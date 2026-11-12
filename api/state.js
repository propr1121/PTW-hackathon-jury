import { IS_DEMO, judgeByKey, getEntries, statusAll, computeResults, publicJudge, send } from './_lib.js';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x');
    const k = url.searchParams.get('k');
    const judge = judgeByKey(k);
    if (!judge) return send(res, 401, { error: 'This link is not valid. Please use the personal link from your email.' });

    const [entries, status] = await Promise.all([getEntries(), statusAll()]);
    const me = status.find(s => s.id === judge.id);
    const allIn = status.length > 0 && status.every(s => s.submitted);

    send(res, 200, {
      judge: publicJudge(judge),
      entries,
      mine: { scores: me._doc.scores || {}, submitted: !!me._doc.submitted, submittedAt: me._doc.submittedAt || null },
      jury: status.map(({ _doc, ...s }) => s),
      allIn,
      demo: IS_DEMO,
      results: allIn ? computeResults(entries, status) : null,
    });
  } catch (e) {
    send(res, 500, { error: 'Server error', detail: String(e.message || e) });
  }
}
