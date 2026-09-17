import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

// SERVER ONLY. Mirrors the shape of lib/supabase/admin.ts: a privileged
// client that never reaches the browser.
//
// The blog lives in Firebase (the blog builder writes it); everything else on
// this site stays on Supabase. The browser never talks to Firebase at all —
// pages read through this admin client on the server, so drafts stay private
// and no Firebase config is exposed to visitors.
//
// Env (Vercel → Project → Settings → Environment Variables):
//   FIREBASE_SERVICE_ACCOUNT   the service account JSON, as one line
//
// Generate it in the Firebase console: Project settings → Service accounts →
// Generate new private key. Treat it like SUPABASE_SERVICE_ROLE_KEY.

let app: App | null = null

function getBlogApp(): App {
  if (app) return app

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT is not set. The blog reads from Firebase; add the service account JSON to the environment.'
    )
  }

  // Accept either raw JSON or base64 — some shells mangle multi-line JSON.
  const json = raw.trim().startsWith('{')
    ? raw
    : Buffer.from(raw, 'base64').toString('utf8')
  const credentials = JSON.parse(json)

  app =
    getApps().find((a) => a.name === 'blog') ??
    initializeApp(
      {
        credential: cert({
          projectId: credentials.project_id,
          clientEmail: credentials.client_email,
          // Vercel stores newlines escaped.
          privateKey: String(credentials.private_key).replace(/\\n/g, '\n'),
        }),
      },
      'blog'
    )

  return app
}

export function blogDb(): Firestore {
  return getFirestore(getBlogApp())
}
