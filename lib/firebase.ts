// Import the functions you need from the SDKs you need
import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";
// import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCUwSlqGfisUtejDfF8Snv-EzI374vcuus",
  authDomain: "ai-assistant-22f53.firebaseapp.com",
  projectId: "ai-assistant-22f53",
  storageBucket: "ai-assistant-22f53.firebasestorage.app",
  messagingSenderId: "249932268224",
  appId: "1:249932268224:web:559d39b570c1dc18082325",
  measurementId: "G-97SQS8BW2W"
};

// Initialize Firebase
const app = getApps().find(a => a.name === '[DEFAULT]') || initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
// const analytics = getAnalytics(app);

// Initialize Providers
const googleProvider = new GoogleAuthProvider();
const microsoftProvider = new OAuthProvider('microsoft.com');
const appleProvider = new OAuthProvider('apple.com');

export { app, db, auth, storage, googleProvider, microsoftProvider, appleProvider, firebaseConfig };
