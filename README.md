# EDT Blog Builder

Internal tool: fill in a topic/brief, pick a template and (optionally) a
gallery component, upload photos, and Claude generates a complete,
ready-to-publish, self-contained `.html` article on-brand for EDT.

This is a local-first build: day-to-day development runs entirely against
the Firebase Emulator Suite (see `.firebaserc`'s `default` alias,
`demo-edt-blog-builder` — no real project, no cost, fully disposable). A
real Firebase project (`edt-blog-builder`, aliased as `production` in
`.firebaserc`) exists and is reserved for an eventual `firebase deploy`,
but nothing in the normal dev loop below touches it. See
[`.claude/plans/`](.) or the project's plan document for the full design.

## One-time setup

1. `npm install` at the repo root (installs the `app` and `functions`
   workspaces too).
2. Java is required for the Firestore/Storage emulators. If `java -version`
   fails, install a JDK (e.g. `brew install openjdk`) and either symlink it
   system-wide or put it on `PATH` for your shell:
   ```bash
   export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
   ```
3. Copy `functions/.env.local.example` to `functions/.env.local` and fill in
   `ANTHROPIC_API_KEY` once Phase 3 (real generation) is in place. Not
   needed yet for Phases 0–2.

## Daily dev loop

```bash
npm run dev
```

This runs the emulators (Auth 9099, Firestore 8080, Storage 9199, Functions
5001, Emulator UI 4000), `tsc --watch` for `functions/`, and the Vite dev
server for `app/`, all together via `concurrently`. Emulator data is
imported from and exported back to `.emulator-data/` (gitignored)
automatically, so Firestore/Storage/Auth-account data survives a restart.

Useful individual scripts:

- `npm run templates:clean` — re-strip base64 out of a changed source
  template under `Blog Templates/`.
- `npm run templates:build` — re-embed `templates/annotated/**` into the
  generated, committed `functions/src/templates/generated/registry.ts`.
- `npm run templates:check` — fails loudly (with a diff) if a source
  template changed without the above two being re-run and committed.
- `npm test` — runs the `functions` test suite (golden round-trip tests,
  bound tests, registry smoke tests).

## Troubleshooting

### "The dashboard is empty" after restarting the emulators

This is expected, not a bug, if a browser tab was already open and signed
in *before* you restarted the emulators. What's actually happening:

- Firestore/Storage data and Auth **account records** genuinely round-trip
  correctly via `--import`/`--export-on-exit` — you can confirm this in the
  Emulator UI's Auth tab: the same uid, with its original creation
  timestamp, is still there after a restart.
- What does **not** survive a restart is the Auth emulator's JWT signing
  key. It's generated fresh in memory on every process start and is never
  part of the export (`auth_export/config.json` only holds sign-in policy,
  not key material). So a browser tab's already-cached session token is
  signed by a key the new process doesn't recognize.
- When that happens, the Firebase SDK's own token-refresh logic silently
  treats the session as invalid and calls `signInAnonymously` again — which
  mints a **brand-new anonymous uid**, not the one your existing articles
  are owned by. The old articles are still there (verify in the Emulator
  UI), just no longer visible to the new session.

**Recovery:** there isn't a way to get the old session back — an anonymous
account has no credential to "log back in" with once its token is invalid.
In practice this only matters if you restart the emulators while continuing
to use an already-open tab. Avoid it by starting the emulators once per dev
session (`npm run dev`) and leaving them running; if you do need to
restart, expect a fresh anonymous uid and treat any articles created under
the previous one as scratch data.

### Java not found

`Error: Process 'java -version' has exited with code 1` — the Firestore and
Storage emulators need a JVM. See step 2 under One-time setup above.
