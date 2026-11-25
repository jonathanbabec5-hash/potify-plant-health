import {sampleWorkspace} from "./model.js";

const DB_NAME = "potify-plant-health";
const STORE = "grow-record";
const RECORD = "workspace";
let database;

function openDatabase() {
  if (database) return database;
  database = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        database = null;
      };
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Close the other Plant Health tab and refresh."));
  });
  database.catch(() => { database = null; });
  return database;
}

export async function loadWorkspace() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readonly");
    const request = transaction.objectStore(STORE).get(RECORD);
    request.onsuccess = () => resolve(request.result ?? sampleWorkspace());
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function updateWorkspace(edit) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    const request = store.get(RECORD);
    let value;
    let editError;
    request.onsuccess = () => {
      try {
        value = request.result ?? sampleWorkspace();
        edit(value);
        store.put(value, RECORD);
      } catch (error) {
        editError = error;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => resolve(value);
    transaction.onabort = () => reject(editError ?? transaction.error ?? new Error("Could not save the grow record."));
  });
}

export function selectedPlantId() {
  try { return localStorage.getItem("potify-selected-plant"); }
  catch { return null; }
}

export function rememberPlant(plantId) {
  try { localStorage.setItem("potify-selected-plant", plantId); }
  catch { /* Keep the selection in memory when browser storage is restricted. */ }
}
