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
  }
})();
