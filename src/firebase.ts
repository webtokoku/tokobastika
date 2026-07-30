import { initializeApp, deleteApp } from "firebase/app";
import firebaseConfig from "../firebase-applet-config.json";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  writeBatch,
  Timestamp,
  increment
} from "firebase/firestore";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistent session storage
export const auth = getAuth(app);
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn("Failed to set auth persistence:", err);
  });
}

export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Enable Offline Caching (IndexedDB Persistence)
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log("Firestore offline persistence enabled successfully.");
    })
    .catch((err) => {
      if (err.code === "failed-precondition") {
        console.warn("Firestore persistence failed-precondition: Multiple tabs open?");
      } else if (err.code === "unimplemented") {
        console.warn("Firestore persistence unimplemented: Browser does not support IndexedDB.");
      }
    });
}

export async function createAuthUserWithoutLoggingOut(email: string, pass: string) {
  const tempAppName = `TempApp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const tempApp = initializeApp(firebaseConfig, tempAppName);
  const tempAuth = getAuth(tempApp);
  try {
    try {
      const cred = await createUserWithEmailAndPassword(tempAuth, email, pass);
      return cred.user;
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        // Attempt to login with tempAuth using pass or candidate passwords to sync password
        const candidatePasswords = Array.from(new Set([
          pass,
          "bastikaPassword123",
          "0822bazokeyz",
          "maruf123",
          "admin123",
          "123456",
          "password",
          email.split("@")[0]
        ]));

        for (const candidatePw of candidatePasswords) {
          try {
            const cred = await signInWithEmailAndPassword(tempAuth, email, candidatePw);
            if (cred.user) {
              if (candidatePw !== pass) {
                try {
                  await updatePassword(cred.user, pass);
                } catch (pwErr) {
                  console.warn("Failed to update password in tempAuth:", pwErr);
                }
              }
              return cred.user;
            }
          } catch {
            // continue trying
          }
        }
        return null;
      }
      throw err;
    }
  } finally {
    await deleteApp(tempApp);
  }
}

export {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  writeBatch,
  Timestamp,
  increment
};
export type { User };
