import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDUL-l3NSmhJLgGwZK2Q-7dAINa616e_OU",
  authDomain: "backyardcheckin-5cfff.firebaseapp.com",
  projectId: "backyardcheckin-5cfff",
  storageBucket: "backyardcheckin-5cfff.firebasestorage.app",
  messagingSenderId: "2161889243",
  appId: "1:2161889243:web:dafd0d4068a6b20e9e21fe",
  measurementId: "G-7K6RH8SJ27"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
