import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

// A `demo-`-prefixed project ID tells the Firebase SDKs (and the emulator
// suite) to run fully offline — no real project, no billing, no API key
// needed for local development.
const firebaseConfig = {
  apiKey: 'demo-key',
  projectId: 'demo-edt-blog-builder',
  authDomain: 'demo-edt-blog-builder.firebaseapp.com',
  storageBucket: 'demo-edt-blog-builder.appspot.com',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Guarded so React Fast Refresh (which re-executes this module) doesn't
// attempt to reconnect an already-connected emulator instance, which
// throws. Uses 127.0.0.1, not localhost — on macOS, localhost's IPv6
// (::1) resolution is a recurring source of emulator connection failures.
let emulatorsConnected = false;

if (import.meta.env.DEV && !emulatorsConnected) {
  emulatorsConnected = true;
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
