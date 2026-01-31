
// Fix: Use standard modular imports from firebase packages and avoid export-from shorthand if it causes resolution issues
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { FIREBASE_CONFIG } from '../constants';

// Inicialização
const app = initializeApp(FIREBASE_CONFIG);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Helpers para Firestore
export const saveDoc = async (collectionName: string, id: string, data: any) => {
  await setDoc(doc(db, collectionName, id), data, { merge: true });
};

export const addDocument = async (collectionName: string, data: any) => {
  return await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: new Date().toISOString()
  });
};

export const getCollection = async (collectionName: string) => {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateDocument = async (collectionName: string, id: string, data: any) => {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, data);
};

// Fix: Export the named functions that were imported above to ensure they are available to the Context
export { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail 
};
