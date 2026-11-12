# PTW Hackathon for a Cause · Jury Room

Private scoring site for the five-person jury (Brainstorm criteria, 0–5 × 4).

- `public/index.html`: the whole front end (judge, organiser and view-only views)
- `api/*.js`: Vercel functions; data lives in a **private Vercel Blob store** connected to the project
- `api/_config.js`: judges, organisers and view-only users. Access keys are stored only as SHA-256 fingerprints.

Links: `/?k=<judge key>` for a judge, `/?admin=<key>` for the organiser or a view-only user.
Setup: import into Vercel, add a **Private** Blob store under Storage and connect it, then redeploy.
