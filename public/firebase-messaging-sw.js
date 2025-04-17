// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBT_MX9X4dB9S66ljB8J7uw2T_H4C9UvUk",
  authDomain: "beheardqueue.firebaseapp.com",
  projectId: "beheardqueue",
  storageBucket: "beheardqueue.firebasestorage.app",
  messagingSenderId: "51101708802",
  appId: "1:51101708802:web:70feb88e6551a449c1ed1b"
});

const messaging = firebase.messaging();

// Optional: Customize background message handling
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});