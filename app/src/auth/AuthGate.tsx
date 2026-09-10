import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '../lib/firebase';

interface AuthContextValue {
  uid: string;
  user: User;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Throws if called outside a ready <AuthGate> — no component ever has to handle a null uid. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() called outside <AuthGate>');
  return ctx;
}

type GateState =
  | { status: 'loading' }
  | { status: 'ready'; user: User }
  | { status: 'error'; message: string };

/**
 * Silently signs the client in via Firebase Anonymous Authentication before
 * rendering children, so no page/hook/Firestore query ever runs with a
 * missing uid.
 *
 * The one subtlety that matters: do NOT call signInAnonymously()
 * unconditionally on mount. That races the SDK's own session-restoration
 * and can mint a second anonymous account, orphaning the first one's
 * articles. Instead: wait for the FIRST onAuthStateChanged callback (Firebase
 * always fires it once, after restoration completes); only sign in if that
 * first callback delivered `user === null`.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>({ status: 'loading' });

  useEffect(() => {
    let resolvedFirstCallback = false;

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (!resolvedFirstCallback) {
          resolvedFirstCallback = true;
          if (!user) {
            signInAnonymously(auth).catch((err: unknown) => {
              setState({
                status: 'error',
                message: err instanceof Error ? err.message : 'Sign-in failed.',
              });
            });
            return; // the resulting sign-in fires another onAuthStateChanged callback
          }
        }
        if (user) setState({ status: 'ready', user });
      },
      (err) => {
        setState({ status: 'error', message: err.message });
      }
    );

    return unsubscribe;
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="auth-gate-splash" role="status" aria-live="polite">
        <span className="auth-gate-dot" aria-hidden="true" />
        EDT Blog Builder
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="auth-gate-splash auth-gate-error" role="alert">
        <p>Couldn't sign in: {state.message}</p>
        <p className="auth-gate-hint">
          If you're developing locally, make sure the Firebase Auth emulator is running
          (<code>npm run dev</code> at the repo root).
        </p>
        <button type="button" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ uid: state.user.uid, user: state.user }}>
      {children}
    </AuthContext.Provider>
  );
}
