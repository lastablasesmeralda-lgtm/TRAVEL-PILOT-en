import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDbRrjcx7_rjeEIq0-up_zQ-kmNIDDNjqA",
  authDomain: "travel-pilot-en.firebaseapp.com",
  projectId: "travel-pilot-en",
  storageBucket: "travel-pilot-en.firebasestorage.app",
  messagingSenderId: "854075271996",
  appId: "1:854075271996:web:80a109ecaffe5e68b0cc39"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);