importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAvAsDpGMaPHD3yZVwu5NM5exjmEJWxK7w",
  authDomain: "gen-lang-client-0777100836.firebaseapp.com",
  projectId: "gen-lang-client-0777100836",
  storageBucket: "gen-lang-client-0777100836.firebasestorage.app",
  messagingSenderId: "812848601619",
  appId: "1:812848601619:web:437b098a70a186eda23de6"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  const notificationTitle = payload.notification ? payload.notification.title : (payload.data ? payload.data.title : 'BINISTA Notification');
  const notificationOptions = {
    body: payload.notification ? payload.notification.body : (payload.data ? payload.data.body : 'You have a new update in BINISTA!'),
    icon: payload.notification ? payload.notification.icon : '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
