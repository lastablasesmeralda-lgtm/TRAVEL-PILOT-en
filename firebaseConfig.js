import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDSkD6Z9Stj-Y0bNbKAwyzHH-M6i0o9Io0",
  authDomain: "travel-pilot-a588c.firebaseapp.com",
  projectId: "travel-pilot-a588c",
  storageBucket: "travel-pilot-a588c.firebasestorage.app",
  messagingSenderId: "240077613462",
  appId: "1:240077613462:web:6ae04ea117175d6dad15b7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);