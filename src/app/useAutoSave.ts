import { useEffect, useEffectEvent, useRef, type RefObject } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import {
  savePartialProjectAtom,
  savedCodeAtom,
  savedMetadataAtom,
  savedResultsAtom,
  savedIridiumAtom,
  isSavingAtom,
} from "@/globals/saving";
import { hasActiveProjectAtom } from "@/globals/project";
import type { IridiumData, Metadata, ResultsData } from "@/features/savedData";

const SAVE_DEBOUNCE = 1_000;

const useAutoSavePartial = <T>(
  callback: (data: T) => Promise<void>,
  data: T,
  savingRef: RefObject<number>,
) => {
  const onSave = useEffectEvent(callback);
  const hasActiveProject = useAtomValue(hasActiveProjectAtom);

  // Skip saving on open since it is redundant.
  // This also makes sure that if a previous project's autosave runs (in the case the user
  // opens one before the setTimeout is fired) it does not go through.
  const canSaveRef = useRef(false);
  useEffect(() => {
    if (hasActiveProject) {
      canSaveRef.current = false;
      const id = setTimeout(() => {
        canSaveRef.current = true;
      }, SAVE_DEBOUNCE);

      return () => clearTimeout(id);
    }
  }, [hasActiveProject]);

  useEffect(() => {
    savingRef.current += 1;

    let ran = false;
    const id = setTimeout(() => {
      if (canSaveRef.current) {
        void onSave(data);
      }
      savingRef.current -= 1;
      ran = true;
    }, SAVE_DEBOUNCE);

    return () => {
      if (!ran) {
        savingRef.current -= 1;
      }
      clearTimeout(id);
    };
  }, [data, savingRef]);
};

const useAutoSave = () => {
  const savePartial = useSetAtom(savePartialProjectAtom);

  const savingRef = useRef(0);
  const isSaving = useAtomValue(isSavingAtom);
  const savedMetadata = useAtomValue(savedMetadataAtom);
  const savedCode = useAtomValue(savedCodeAtom);
  const savedResults = useAtomValue(savedResultsAtom);
  const savedIridium = useAtomValue(savedIridiumAtom);

  useEffect(() => {
    if (import.meta.env.DEV) {
      // this popup is annoying because of hot reload
      return;
    }

    const handleUnload = (e: Event) => {
      if (savingRef.current > 0 || isSaving) {
        e.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [savingRef, isSaving]);

  useAutoSavePartial(
    async (data: Metadata) => {
      await savePartial({ metadata: data });
    },
    savedMetadata,
    savingRef,
  );

  useAutoSavePartial(
    async (data: IridiumData) => {
      await savePartial({ iridium: data });
    },
    savedIridium,
    savingRef,
  );

  useAutoSavePartial(
    async (data: ResultsData) => {
      await savePartial({ results: data });
    },
    savedResults,
    savingRef,
  );

  useAutoSavePartial(
    async (data: string) => {
      await savePartial({ code: data });
    },
    savedCode,
    savingRef,
  );

  return null;
};

export default useAutoSave;
