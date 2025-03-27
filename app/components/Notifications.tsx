// components/Notifications.tsx
'use client';
import { useEffect } from 'react';
import { messaging } from '@/lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';

export default function Notifications() {
  useEffect(() => {
    // Request permission for notifications
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted' && messaging) {
        getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' })
          .then((currentToken) => {
            if (currentToken) {
              console.log('Current token:', currentToken);
              // Send token to server for further processing if needed
            }
          })
          .catch((err) => {
            console.error('An error occurred while retrieving token. ', err);
          });
      }
    });

    // Listen for incoming messages
    if (messaging) {
      onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        // Need to figure out how we should display these.
      });
    }
  }, []);

  return null;
}