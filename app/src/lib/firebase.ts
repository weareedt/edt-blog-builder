import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

// A `demo-`-prefixed project ID tells the Firebase SDKs (and the emulator
// suite) to run fully offline — no real project, no billing, no API key
// needed for local development. Production builds (served via Firebase
// Hosting) use the real project instead; its apiKey is not a secret —
// it's scoped by the project's security rules, same as any Firebase web
// app config.
const firebaseConfig = import.meta.env.DEV
  ? {
      apiKey: 'demo-key',
      projectId: 'demo-edt-blog-builder',
      authDomain: 'demo-edt-blog-builder.firebaseapp.com',
      storageBucket: 'demo-edt-blog-builder.appspot.com',
    }
  : {
      apiKey: 'AIzaSyAf4Jw0at5jGZbCr8CnxJ7x_J5cTFJ5ujU',
      projectId: 'edt-blog-builder',
      authDomain: 'edt-blog-builder.firebaseapp.com',
      storageBucket: 'edt-blog-builder.firebasestorage.app',
      messagingSenderId: '64124708364',
      appId: '1:64124708364:web:f137598694121b3d0af029',
      measurementId: 'G-TRM758L7HW',
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
