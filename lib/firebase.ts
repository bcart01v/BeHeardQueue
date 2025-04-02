// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

// Get Firebase config from environment or use default config
const getFirebaseConfig = () => {
  if (typeof window !== 'undefined') {
    // Client-side: Use environment variables
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };
  } else {
    // Server-side: Use FIREBASE_WEBAPP_CONFIG
    try {
      return JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG || '{}');
    } catch (e) {
      console.error('Error parsing FIREBASE_WEBAPP_CONFIG:', e);
      return {};
    }
  }
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services for use in your app
export const auth = getAuth(app);
export const db = getFirestore(app);

// This should only ever run in the client.
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;