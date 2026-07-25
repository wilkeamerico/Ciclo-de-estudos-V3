import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  deleteUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  getDoc,
  query,
  getDocFromServer
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAroajeMrDGIhPIq7df4KUMKzzi63HMUIc",
  authDomain: "distributed-relic-55w43.firebaseapp.com",
  projectId: "distributed-relic-55w43",
  storageBucket: "distributed-relic-55w43.firebasestorage.app",
  messagingSenderId: "895964341876",
  appId: "1:895964341876:web:301358129cbac18a575321"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-remixciclosdeest-3c645463-03f7-4ad5-b30b-5830155b6d65");
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider options if needed
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Test Connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
