import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCiERG5A3IxKZAwPtS33Np0ZIx9rtd9b0U",
  authDomain: "amar-printers.firebaseapp.com",
  projectId: "amar-printers",
  storageBucket: "amar-printers.firebasestorage.app",
  messagingSenderId: "19558850176",
  appId: "1:19558850176:web:27982a20e584272556d065",
  measurementId: "G-E6EGLZQJ38",
};

const requiredConfig = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.storageBucket,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId,
];

export const isFirebaseConfigured = requiredConfig.every(Boolean);
export const firebaseApp = isFirebaseConfigured ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
export const firebaseDb = firebaseApp ? getFirestore(firebaseApp) : null;
export const firebaseStorage = firebaseApp ? getStorage(firebaseApp) : null;
export const firebaseAnalytics = firebaseApp ? getAnalytics(firebaseApp) : null;