import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCo4ibWtVXjR-diTFph0oEkbOayQy2J58k",
  authDomain: "fir-a2d21.firebaseapp.com",
  projectId: "fir-a2d21",
  storageBucket: "fir-a2d21.firebasestorage.app",
  messagingSenderId: "449023644633",
  appId: "1:449023644633:web:331ee2f7abc5619f3affc8",
  measurementId: "G-YLDPNW1JJM"
  };

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };

export async function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logoutFirebase() {
  return signOut(auth);
}

export function onAuthStateChangedFirebase(callback) {
  return onAuthStateChanged(auth, callback);
}

// Subir clientes iniciales a Firestore
export async function uploadInitialClientes(clientes) {
  const snapshot = await getDocs(collection(db, "clientes"));
  if (!snapshot.empty) return; // Ya existen clientes
  for (const cliente of clientes) {
    await addDoc(collection(db, "clientes"), cliente);
  }
} 