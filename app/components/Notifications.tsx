'use client';
import { useEffect } from 'react';
import { messaging } from '@/lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

export default function Notifications() {
  useEffect(() => {
    const registerToken = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn('Notification permission not granted');
          return;
        }

        if (!messaging) {
          console.warn('Messaging not initialized');
          return;
        }

        const currentToken = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_VAPID_KEY,
        });

        if (currentToken && auth.currentUser) {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await setDoc(userRef, { fcmToken: currentToken }, { merge: true });
          console.log('Token saved to Firestore:', currentToken);
        } else {
          console.warn('No token or unauthenticated user');
        }
      } catch (err) {
        console.error('Failed to get/save token:', err);
      }
    };

    registerToken();

    if (messaging) {
      onMessage(messaging, (payload) => {
        console.log('Message received', payload);
        toast(payload.notification?.body || 'New notification received');
      });
    }
  }, []);

  return null;
}
