(function() {
  const firebaseConfig = {
    apiKey: "AIzaSyCJZ7RMtnaPr56AMkJRpTneh21iSS6r5z8",
    authDomain: "learning-os-c8be8.firebaseapp.com",
    projectId: "learning-os-c8be8",
    storageBucket: "learning-os-c8be8.firebasestorage.app",
    messagingSenderId: "177429992332",
    appId: "1:177429992332:web:7149cb46f6f73f180bfca9"
  };

  const fbApp  = firebase.initializeApp(firebaseConfig);
  const auth   = firebase.auth();
  const db     = firebase.firestore();

  // Enable offline persistence so local file usage works even with bad connectivity
  db.enablePersistence({ synchronizeTabs: false }).catch(() => {});

  window._db   = db;
  window._auth = auth;

  // Compat API shims so our helper functions work unchanged
  window._fbApi = {
    doc: (db, ...path) => {
      // path can be ('users', uid) or ('users', uid, 'data', key) etc.
      let ref = db;
      for (let i = 0; i < path.length; i++) {
        ref = (i % 2 === 0) ? ref.collection(path[i]) : ref.doc(path[i]);
      }
      return ref;
    },
    getDoc: ref => ref.get(),
    setDoc: (ref, data, opts) => opts && opts.merge ? ref.set(data, { merge: true }) : ref.set(data),
    collection: (db, name) => db.collection(name),
    getDocs: ref => ref.get(),
    serverTimestamp: () => firebase.firestore.FieldValue.serverTimestamp(),
    signInWithEmailAndPassword: (auth, email, pass) => auth.signInWithEmailAndPassword(email, pass),
    createUserWithEmailAndPassword: (auth, email, pass) => auth.createUserWithEmailAndPassword(email, pass),
    signOut: (auth) => auth.signOut()
  };

  auth.onAuthStateChanged(user => {
    // Enable login button
    const btn = document.getElementById('login-btn');
    if (btn && btn.disabled) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.textContent = 'Sign In / Create Account';
    }

    if (user) {
      window._fbUser = user;
      window._fbUid  = user.uid;
      setLoaderStatus('Loading your data…');

      if (window._onFirebaseLogin) {
        // Callbacks ready — fire immediately
        window._onFirebaseLogin(user);
      } else {
        // init() not run yet — queue and retry after DOM ready
        window._pendingAuthUser = user;
        const waitForInit = setInterval(() => {
          if (window._onFirebaseLogin) {
            clearInterval(waitForInit);
            window._onFirebaseLogin(window._pendingAuthUser);
            window._pendingAuthUser = null;
          }
        }, 50);
        // Give up after 5s if still no init
        setTimeout(() => clearInterval(waitForInit), 5000);
      }
    } else {
      window._fbUser = null;
      window._fbUid  = null;
      setLoaderStatus('Ready to sign in');
      if (window._onFirebaseLogout) {
        window._onFirebaseLogout();
      } else {
        // Show login screen immediately if no callback yet
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) loginScreen.style.display = 'flex';
        hideAppLoader();
      }
    }
  });
})();