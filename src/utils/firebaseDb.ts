import { db } from "./firebase";
import { collection, doc, setDoc, deleteDoc, getDocs } from "firebase/firestore";
import { CicloEstudo } from "../types";

/**
 * Recursively removes any object keys that are `undefined`
 * so Firestore setDoc does not throw "Unsupported field value: undefined"
 */
function sanitizeForFirestore(data: any): any {
  if (data === undefined) {
    return null;
  }
  if (data === null || typeof data !== "object") {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item));
  }
  const cleanObj: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (val !== undefined) {
      cleanObj[key] = sanitizeForFirestore(val);
    }
  }
  return cleanObj;
}

/**
 * Saves a single study cycle to Firestore for a specific user.
 */
export async function saveCicloToFirestore(userId: string, ciclo: CicloEstudo): Promise<void> {
  if (!userId || !ciclo || !ciclo.id) return;
  try {
    const docRef = doc(db, "users", userId, "ciclos", ciclo.id);
    const sanitizedData = sanitizeForFirestore({
      ...ciclo,
      userId // enforce relationship
    });
    await setDoc(docRef, sanitizedData);
  } catch (error) {
    console.error("Erro ao salvar ciclo no Firestore:", error);
    throw error;
  }
}

/**
 * Deletes a single study cycle from Firestore for a specific user.
 */
export async function deleteCicloFromFirestore(userId: string, cicloId: string): Promise<void> {
  if (!userId || !cicloId) return;
  try {
    const docRef = doc(db, "users", userId, "ciclos", cicloId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Erro ao deletar ciclo do Firestore:", error);
    throw error;
  }
}

/**
 * Retrieves all study cycles from Firestore for a specific user.
 */
export async function getCiclosFromFirestore(userId: string): Promise<CicloEstudo[]> {
  if (!userId) return [];
  try {
    const colRef = collection(db, "users", userId, "ciclos");
    const querySnapshot = await getDocs(colRef);
    const list: CicloEstudo[] = [];
    querySnapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        list.push(docSnap.data() as CicloEstudo);
      }
    });
    return list;
  } catch (error) {
    console.error("Erro ao carregar ciclos do Firestore:", error);
    throw error;
  }
}

/**
 * Saves multiple study cycles to Firestore for a specific user.
 */
export async function saveAllCiclosToFirestore(userId: string, ciclos: CicloEstudo[]): Promise<void> {
  if (!userId) return;
  try {
    for (const ciclo of ciclos) {
      await saveCicloToFirestore(userId, ciclo);
    }
  } catch (error) {
    console.error("Erro ao salvar todos os ciclos no Firestore:", error);
    throw error;
  }
}
