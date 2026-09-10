import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let initializationError: unknown = null;

if (!getApps().length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (serviceAccountJson) {
      initializeApp({
        credential: cert(JSON.parse(serviceAccountJson)),
      });
    } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && projectId) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Handle newline characters in the private key
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      throw new Error(
        'Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
      );
    }
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    initializationError = error;
    console.error('Firebase Admin initialization error', error);
  }
}

function ensureAdminInitialized() {
  if (initializationError) {
    throw initializationError;
  }
  if (!getApps().length) {
    throw new Error('Firebase Admin app is not initialized. Check the server environment variables.');
  }
}

export const getAdminDb = () => {
  ensureAdminInitialized();
  return getFirestore();
};

export const getAdminAuth = () => {
  ensureAdminInitialized();
  return getAuth();
};
