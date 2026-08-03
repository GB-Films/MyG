import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDrt2hRutEbkHywC_0fMCn1lWaqNC1WLK8",
  authDomain: "casamiento-mg.firebaseapp.com",
  projectId: "casamiento-mg",
  storageBucket: "casamiento-mg.firebasestorage.app",
  messagingSenderId: "720903321979",
  appId: "1:720903321979:web:a3229e7bc94bacc2df25de",
};

const firebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
export const FIREBASE_ADMIN_EMAIL = "guidoymaria@casamiento-mg.web.app";
