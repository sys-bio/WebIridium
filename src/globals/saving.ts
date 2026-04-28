import { atom } from "jotai";
import {
  fileSystemChangeIdAtom,
  hasActiveProjectAtom,
  metadataAtom,
} from "./project";
import { editorContentAtom, variableSettingssAtom } from "./model";
import type {
  IridiumData,
  ProjectData,
  ResultsData,
} from "@/features/savedData";
import { currentPresetAtom, projectGraphSettingsAtom } from "./graphPresets";
import { parameterScanOptionsAtom, timeCourseParametersAtom } from "./settings";
import { historyAtom } from "./history";
import { saveProjectRaw } from "@/features/db";

const _isSavingAtom = atom(0);
export const isSavingAtom = atom((get) => get(_isSavingAtom) > 0);

export const savedMetadataAtom = atom((get) => get(metadataAtom));

export const savedCodeAtom = atom((get) => get(editorContentAtom));

export const savedIridiumAtom = atom(
  (get) =>
    ({
      versionTag: 4,
      currentGraphPreset: get(currentPresetAtom),
      graphSettings: get(projectGraphSettingsAtom),
      variableSettings: get(variableSettingssAtom),
      timeCourseParameters: get(timeCourseParametersAtom),
      parameterScanOptions: get(parameterScanOptionsAtom),
    }) satisfies IridiumData,
);

export const savedResultsAtom = atom(
  (get) => ({ versionTag: 1, records: get(historyAtom) }) satisfies ResultsData,
);

export const savePartialProjectAtom = atom(
  null,
  async (get, set, data: Partial<ProjectData>) => {
    if (!get(hasActiveProjectAtom)) return;

    set(_isSavingAtom, get(_isSavingAtom) + 1);
    try {
      // make sure to always update the Updated timestamp
      let savingData = data;
      if (data.metadata === undefined) {
        savingData = {
          ...savingData,
          metadata: {
            ...get(savedMetadataAtom),
            updated: Date.now(),
          },
        };
      } else {
        savingData = {
          ...savingData,
          metadata: {
            ...data.metadata,
            updated: Date.now(),
          },
        };
      }

      await saveProjectRaw(savingData);
    } finally {
      set(fileSystemChangeIdAtom, (old) => old + 1);
      // add a little delay so it doesn't go too fast
      setTimeout(() => {
        set(_isSavingAtom, get(_isSavingAtom) - 1);
      }, 500);
    }
  },
);

export const saveFullProjectAtom = atom(null, async (get, set) => {
  if (!get(hasActiveProjectAtom)) return;

  const metadata = get(savedMetadataAtom);
  const iridium = get(savedIridiumAtom);
  const code = get(savedCodeAtom);
  const results = get(savedResultsAtom);

  if (metadata && iridium && code !== null && results) {
    await set(savePartialProjectAtom, { metadata, iridium, code, results });
  }
});
