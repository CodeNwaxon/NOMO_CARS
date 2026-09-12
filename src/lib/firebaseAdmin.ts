import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let initializationError: unknown = null;

/**
 * Normalizes a PEM private key string to ensure proper newlines.
 * Handles all Vercel environment variable escaping edge cases:
 * - Literal \n characters (from JSON-encoded strings)
 * - Double-escaped \\n (from some env var UIs)
 * - Already-correct real newlines (from Vercel multi-line paste)
 */
function normalizePrivateKey(key: string): string {
  // First, replace any double-escaped newlines (\\n -> \n)
  let normalized = key.replace(/\\\\n/g, '\n');
  // Then, replace any remaining literal \n text with real newlines
  normalized = normalized.replace(/\\n/g, '\n');
  return normalized;
}

if (!getApps().length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (serviceAccountJson) {
      initializeApp({
        credential: cert(JSON.parse(serviceAccountJson)),
      });
      console.log('Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT_JSON');
    } else if (privateKey && clientEmail && projectId) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: normalizePrivateKey(privateKey),
        }),
      });
      console.log('Firebase Admin initialized via individual credentials');
    } else {
      // Log exactly which variables are missing so Vercel Function Logs show the problem
      const missing: string[] = [];
      if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
      if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
      if (!projectId) missing.push('FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID)');
      throw new Error(
        `Missing Firebase Admin credentials. Missing variables: ${missing.join(', ')}. ` +
        'Set FIREBASE_SERVICE_ACCOUNT_JSON or provide all three individual variables.'
      );
    }
  } catch (error) {
    initializationError = error;
    console.error('Firebase Admin initialization error:', error);
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
