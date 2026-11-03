import { useEffect, useState } from "react";
import type { IDBPDatabase } from "idb";
import styles from "./DatabaseInitializer.module.css";
import { openMainDb } from "@/features/db";

export interface DatabaseInitializerProps {
  children: React.ReactNode;
}

/**
 * Initializes database.
 * Will also show a screen if database connection is blocking another tab.
 */
export const DatabaseInitializer = ({ children }: DatabaseInitializerProps) => {
  const [hasLoaded, setLoaded] = useState(false);
  const [error, setError] = useState<unknown>();
  const [outOfSync, setOutOfSync] = useState(false);

  useEffect(() => {
    let db: IDBPDatabase | undefined;
    let done = false;

    const run = async () => {
      try {
        db = await openMainDb({
          blocked() {
            setOutOfSync(true);
          },
          blocking() {
            if (db) db.close();

            setOutOfSync(true);
          },
        });

        if (done) {
          db.close();
        }
      } catch (err) {
        setError(err);
      }

      if (!done) {
        setLoaded(true);
      }
    };

    void run();

    return () => {
      done = true;
      if (db) {
        db.close();
      }
    };
  }, []);

  if (error) {
    // will be caught by the app-level error boundary
    // eslint-disable-next-line
    throw error;
  }

  if (hasLoaded && !outOfSync) {
    return children;
  } else {
    return (
      <div className={styles.screen}>
        {outOfSync && (
          <p className={styles.message}>
            Tabs out of sync. Please refresh all tabs.
          </p>
        )}
      </div>
    );
  }
};
