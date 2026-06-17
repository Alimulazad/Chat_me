import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA2bXtRTVsCX4fb2YbWMb7NOomviRYBpfw",
  authDomain: "release-hub-5ggg7.firebaseapp.com",
  projectId: "release-hub-5ggg7",
  storageBucket: "release-hub-5ggg7.firebasestorage.app",
  messagingSenderId: "80647393115",
  appId: "1:80647393115:web:a6a5a1b2aabc79d141d47e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
