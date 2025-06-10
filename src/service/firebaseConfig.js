// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.FIREBASE_API_KEY,
  authDomain: "ai-travel-planner-33fa3.firebaseapp.com",
  projectId: "ai-travel-planner-33fa3",
  storageBucket: "ai-travel-planner-33fa3.firebasestorage.app",
  messagingSenderId: "1011512880187",
  appId: "1:1011512880187:web:dfc9a53e0d98fdff13001e"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

 

