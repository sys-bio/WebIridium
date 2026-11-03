/**
 * Handles interacting with IndexedDB database.
 */

import {
  openDB,
  type IDBPDatabase,
  type IDBPTransaction,
  type OpenDBCallbacks,
} from "idb";
import {
  type ProjectId,
  type Metadata,
  type UnknownMetadata,
  type UnknownResultsData,
  type UnknownIridiumData,
  type ProjectData,
  migrateMetadata,
  migrateIridiumData,
  migrateResultsData,
  getNewProjectId,
  getNewProjectData,
} from "./savedData";

const MAIN_DB_NAME = "main";
const METADATA_STORE = "metadata";
const IRIDIUM_STORE = "iridium";
const RESULTS_STORE = "results";
const CODE_STORE = "code";

let mainDb: IDBPDatabase | undefined;
let projectHandle:
  | {
      id: ProjectId;
      release: () => void;
    }
  | undefined;

// Whenever you need to add a new object store/modify schema, add a migration here.
const schemaMigrations: ((
  db: IDBPDatabase,
  tx: IDBPTransaction<unknown, string[], "versionchange">,
) => void)[] = [
  // version 1
  (db, _tx) => {
    db.createObjectStore(METADATA_STORE);
    db.createObjectStore(IRIDIUM_STORE);
    db.createObjectStore(RESULTS_STORE);
    db.createObjectStore(CODE_STORE);
  },
];

export const openMainDb = async (
  callbacks?: OpenDBCallbacks<unknown>,
): Promise<IDBPDatabase> => {
  mainDb = await openDB(MAIN_DB_NAME, schemaMigrations.length, {
    ...callbacks,
    upgrade(db, oldVersion, _newVersion, tx) {
      for (let i = oldVersion; i < schemaMigrations.length; i++) {
        schemaMigrations[i](db, tx);
      }
    },
  });

  return mainDb;
};

const checkMainDb = (): IDBPDatabase => {
  if (!mainDb) throw new Error("Database not initialized.");
  return mainDb;
};

export const listProjectsRaw = async (): Promise<Map<ProjectId, Metadata>> => {
  const db = checkMainDb();

  const tx = db.transaction(METADATA_STORE, "readonly");
  const metadataStore = tx.objectStore(METADATA_STORE);

  const map = new Map<ProjectId, Metadata>();
  for await (const cursor of metadataStore) {
    const metadata = cursor.value as UnknownMetadata;
    map.set(cursor.key as ProjectId, migrateMetadata(metadata));
  }

  await tx.done;

  return map;
};

/**
 * Opens a project and acquires a lock for it.
 *
 * Prefer to use the one in `useProjectActions`
 *
 * @returns the data associated with the project
 */
export const openProjectRaw = (id: ProjectId): Promise<ProjectData> =>
  new Promise((resolve, reject) => {
    if (projectHandle) {
      throw new Error("Another project is already open.");
    }

    const db = checkMainDb();

    void navigator.locks.request(id, { ifAvailable: true }, async (lock) => {
      if (lock === null) {
        // someone else had it, abort
        reject(new Error("Project open in another tab."));
      } else {
        const tx = db.transaction(
          [METADATA_STORE, IRIDIUM_STORE, RESULTS_STORE, CODE_STORE],
          "readonly",
        );

        const metadataStore = tx.objectStore(METADATA_STORE);
        const iridiumStore = tx.objectStore(IRIDIUM_STORE);
        const resultsStore = tx.objectStore(RESULTS_STORE);
        const codeStore = tx.objectStore(CODE_STORE);

        const metadata = (await metadataStore.get(id)) as UnknownMetadata;
        const iridium = (await iridiumStore.get(id)) as UnknownIridiumData;
        const results = (await resultsStore.get(id)) as UnknownResultsData;
        const code = (await codeStore.get(id)) as string;

        await tx.done;

        if (!metadata || !iridium || !results || code === undefined) {
          throw new Error("Project has been deleted.");
        }

        resolve({
          metadata: migrateMetadata(metadata),
          iridium: migrateIridiumData(iridium),
          results: migrateResultsData(results),
          code: code,
        });

        return new Promise<void>((resolveLock) => {
          projectHandle = {
            id: id,
            release: () => {
              projectHandle = undefined;
              resolveLock();
            },
          };
        });
      }
    });
  });

export const closeCurrentProjectRaw = (): void => {
  if (projectHandle) {
    projectHandle.release();
  }
};

export const newProjectRaw = async (
  name?: string,
  code?: string,
): Promise<[ProjectId, ProjectData]> =>
  new Promise((resolve, reject) => {
    const db = checkMainDb();

    const id = getNewProjectId();
    const data = getNewProjectData();

    if (name !== undefined) {
      data.metadata.name = name;
    }

    if (code !== undefined) {
      data.code = code;
    }

    void navigator.locks.request(id, { ifAvailable: true }, async (lock) => {
      if (lock === null) {
        // someone else had it, abort
        reject(new Error("Project already exists."));
      } else {
        const tx = db.transaction(
          [METADATA_STORE, IRIDIUM_STORE, RESULTS_STORE, CODE_STORE],
          "readwrite",
        );
        const metadataStore = tx.objectStore(METADATA_STORE);
        const iridiumStore = tx.objectStore(IRIDIUM_STORE);
        const resultsStore = tx.objectStore(RESULTS_STORE);
        const codeStore = tx.objectStore(CODE_STORE);

        await metadataStore.add(data.metadata, id);
        await iridiumStore.add(data.iridium, id);
        await resultsStore.add(data.results, id);
        await codeStore.add(data.code, id);

        await tx.done;

        resolve([id, data]);

        return new Promise<void>((resolveLock) => {
          projectHandle = {
            id: id,
            release: () => {
              projectHandle = undefined;
              resolveLock();
            },
          };
        });
      }
    });
  });

export const saveProjectRaw = async (
  data: Partial<ProjectData>,
): Promise<void> => {
  if (!projectHandle) throw new Error("No project open.");

  const db = checkMainDb();

  const writing: Record<string, unknown> = {};
  if (data.metadata) {
    writing[METADATA_STORE] = data.metadata;
  }

  if (data.iridium) {
    writing[IRIDIUM_STORE] = data.iridium;
  }

  if (data.results) {
    writing[RESULTS_STORE] = data.results;
  }

  if (data.code !== undefined) {
    writing[CODE_STORE] = data.code;
  }

  const tx = db.transaction(Array.from(Object.keys(writing)), "readwrite");
  for (const [storeName, value] of Object.entries(writing)) {
    await tx.objectStore(storeName).put(value, projectHandle.id);
  }

  await tx.done;
};

export const deleteProjectRaw = async (id: ProjectId): Promise<void> => {
  if (projectHandle?.id === id) {
    throw new Error("Cannot delete current project.");
  }

  const db = checkMainDb();

  await navigator.locks.request(id, { ifAvailable: true }, async (lock) => {
    if (lock === null) {
      // someone else had it, abort
      throw new Error("Project open in another tab.");
    } else {
      const tx = db.transaction(
        [METADATA_STORE, IRIDIUM_STORE, RESULTS_STORE, CODE_STORE],
        "readwrite",
      );
      const metadataStore = tx.objectStore(METADATA_STORE);
      const iridiumStore = tx.objectStore(IRIDIUM_STORE);
      const resultsStore = tx.objectStore(RESULTS_STORE);
      const codeStore = tx.objectStore(CODE_STORE);

      await metadataStore.delete(id);
      await iridiumStore.delete(id);
      await resultsStore.delete(id);
      await codeStore.delete(id);

      await tx.done;
    }
  });
};
