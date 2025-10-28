import type { GraphSettings, VariableSettings } from "@/globals/settings";
import type { HistoryRecord } from "@/globals/history";
import type { ThemeOption } from "@/globals/appearance";

const DATABASE_NAME = "testing_database4";
const DATABASE_VERSION = 1;
const MAIN_STORE_NAME = "main";
const MAIN_KEY_NAME = "main";

export interface SavedDataV1 {
  theme: ThemeOption;
  editorFontSize: number;
  workspace: {
    name: string;
    content: string;
    variableSettingss: Record<string, VariableSettings>;
    graphSettings: GraphSettings;
    history: HistoryRecord[];
    // optional API key persisted with the workspace
    apiKey?: string | null;
  };
}

const handleDatabaseUpgrade = (event: Event) => {
  const db = (event.target as IDBOpenDBRequest).result;

  db.createObjectStore(MAIN_STORE_NAME);
};

/**
 * Try to get any saved data from IndexedDB.
 */
export const requestSavedData = (): Promise<SavedDataV1 | null> => {
  return new Promise((resolve, reject) => {
    if (typeof window.indexedDB === "undefined") {
      resolve(null);
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onerror = (event) => {
      const req = event.target as IDBRequest;
      console.error(`Open error: ${req.error?.message}`);
      reject(new Error(req.error?.message));
    };

    request.onupgradeneeded = handleDatabaseUpgrade;

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction([MAIN_STORE_NAME], "readwrite");

      transaction.onerror = (event) => {
        const tx = event.target as IDBTransaction;
        console.error(`Transaction error: ${tx.error?.message}`);
        reject(new Error(tx.error?.message));
      };

      const mainStore = transaction.objectStore(MAIN_STORE_NAME);
      const getRequest = mainStore.get(MAIN_KEY_NAME);

      getRequest.onerror = (event) => {
        const req = event.target as IDBRequest;
        console.error(`Get error: ${req.error?.message}`);
        reject(new Error(req.error?.message));
      };

      getRequest.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result as SavedDataV1);
      };
    };
  });
};

/**
 * Saves data to IndexedDB.
 */
export const commitSavedData = (data: SavedDataV1): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window.indexedDB === "undefined") {
      resolve();
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onerror = (event) => {
      const req = event.target as IDBRequest;
      console.error(`Open error: ${req.error?.message}`);
      reject(new Error(req.error?.message));
    };

    request.onupgradeneeded = handleDatabaseUpgrade;
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction([MAIN_STORE_NAME], "readwrite");

      transaction.onerror = (event) => {
        const tx = event.target as IDBTransaction;
        console.error(`Transaction error: ${tx.error?.message}`);
        reject(new Error(tx.error?.message));
      };

      const mainStore = transaction.objectStore(MAIN_STORE_NAME);
      const updateRequest = mainStore.put(data, MAIN_KEY_NAME);

      updateRequest.onerror = (event) => {
        const req = event.target as IDBRequest;
        console.error(`Put error: ${req.error?.message}`);
        reject(new Error(req.error?.message));
      };

      updateRequest.onsuccess = () => {
        resolve();
      };
    };
  });
};
