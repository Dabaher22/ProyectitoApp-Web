importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCl09N_sw7jueCeTotzW_9G3AMBf9SEabk',
  authDomain: 'proyectito-50262.firebaseapp.com',
  projectId: 'proyectito-50262',
  storageBucket: 'proyectito-50262.firebasestorage.app',
  messagingSenderId: '1084048549320',
  appId: '1:1084048549320:web:2d67feaa3910386208ccfd',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? payload.data?.title ?? 'Proyectito';
  const body = payload.notification?.body ?? payload.data?.body ?? '';
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data,
  });
});
