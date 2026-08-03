import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyA2-9mZ2ZJ1uNsjBmjZZEmnKYdjhMQf9Qw",
  authDomain: "casamientomyg-e3340.firebaseapp.com",
  projectId: "casamientomyg-e3340",
  storageBucket: "casamientomyg-e3340.firebasestorage.app",
  messagingSenderId: "258323397237",
  appId: "1:258323397237:web:8d70539334e1af8c39d63c",
};

const firebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
export const firebaseFunctions = getFunctions(firebaseApp, "us-central1");
export const FIREBASE_ADMIN_EMAIL = "guidoymaria@casamiento-mg.web.app";
