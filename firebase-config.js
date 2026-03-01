'use strict';

(function () {
  const firebaseConfig = {
    apiKey: 'AIzaSyDhCB7FSHmOwlNMt2NEUige0z7DnTarU4Y',
    authDomain: 'b-bling-coffee.firebaseapp.com',
    projectId: 'b-bling-coffee',
    storageBucket: 'b-bling-coffee.firebasestorage.app',
    messagingSenderId: '819075711200',
    appId: '1:819075711200:web:51e9be20b6dd0931101085',
    measurementId: 'G-SK7Y478CNQ'
  };

  if (typeof firebase !== 'undefined') {
    window.bbApp = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
    window.bbDb = firebase.firestore();
    window.bbStorage = firebase.storage();
    
    // Debug logging
    console.log('🔥 Firebase initialized:', {
      projectId: firebaseConfig.projectId,
      hasApp: !!window.bbApp,
      hasDb: !!window.bbDb,
      hasStorage: !!window.bbStorage
    });
    
    // Test connection immediately
    if (window.bbDb) {
      window.bbDb.enableNetwork().then(() => {
        console.log('✅ Firestore network enabled');
      }).catch(err => {
        console.error('❌ Firestore network error:', err);
      });
    }
  } else {
    console.error('❌ Firebase SDK not loaded');
  }
})();
