import {
  migrateGraphSettings,
  type GraphSettings,
  type UnknownGraphSettings,
} from "@/features/savedData";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { SyncStorage } from "jotai/vanilla/utils/atomWithStorage";

export const defaultGraphSettings: GraphSettings = {
  versionTag: 2,

  backgroundColor: "#ffffff",
  drawingAreaColor: "#f1e7f4",

  includeTitle: true,
  title: "Transition of substances in chemical reaction",
  titleColor: "#000000",

  includeBorder: true,
  borderColor: "#000000",
  borderThickness: 0.5,

  globalWidth: 1,

  isAutoscaledX: true,
  minX: 0,
  maxX: 10,

  isAutoscaledY: true,
  minY: 0,
  maxY: 10,

  margin: 70,

  xAxis: {
    includeTitle: true,
    title: "", // empty means use placeholder
    color: "#000",
  },

  yAxis: {
    includeTitle: true,
    title: "", // empty means use placeholder
    color: "#000",
  },

  majorGrid: {
    enabled: { x: false, y: false },
    xColor: "#888",
    yColor: "#888",
    xWidth: 0.5,
    yWidth: 0.5,
    numXGrids: 4,
    numYGrids: 4,
  },

  minorGrid: {
    enabled: { x: false, y: false },
    xColor: "#888",
    yColor: "#888",
    xWidth: 0.5,
    yWidth: 0.5,
    numXGrids: 4,
    numYGrids: 4,
  },

  legend: {
    visible: true,
    isFloating: true,

    textColor: "#000",
    backgroundColor: "#fff",
    borderColor: "#000",
    borderThickness: 1,
    padding: 15,
    lineLength: 50,
  },

  steadyState3d: {
    isAutoScaledZ: true,
    minZ: 0,
    maxZ: 20,
    colorScheme: "BlueRed",
  },
};

export const builtinGraphPresets: Record<string, GraphSettings> = {
  Dark: {
    ...defaultGraphSettings,
    backgroundColor: "#000000",
    drawingAreaColor: "#111111",
    titleColor: "#ffffff",
    borderColor: "#ffffff",
    xAxis: {
      ...defaultGraphSettings.xAxis,
      color: "#ffffff",
    },
    yAxis: {
      ...defaultGraphSettings.yAxis,
      color: "#ffffff",
    },
    legend: {
      ...defaultGraphSettings.legend,
      textColor: "#fff",
      backgroundColor: "#000",
      borderColor: "#fff",
    },
  },

  Winter: {
    ...defaultGraphSettings,
    backgroundColor: "#72b7f7",
    drawingAreaColor: "#b6d5f2",
    titleColor: "#010a12",
    borderColor: "#010a12",
    xAxis: {
      ...defaultGraphSettings.xAxis,
      color: "#010a12",
    },
    yAxis: {
      ...defaultGraphSettings.yAxis,
      color: "#010a12",
    },
    legend: {
      ...defaultGraphSettings.legend,
      textColor: "#010a12",
      backgroundColor: "#b6f1f2",
      borderColor: "#010a12",
    },
  },

  Beach: {
    ...defaultGraphSettings,
    backgroundColor: "#e8e1c3",
    drawingAreaColor: "#faf8f2",
    titleColor: "#080600",
    borderColor: "#080600",
    xAxis: {
      ...defaultGraphSettings.xAxis,
      color: "#080600",
    },
    yAxis: {
      ...defaultGraphSettings.yAxis,
      color: "#080600",
    },
    legend: {
      ...defaultGraphSettings.legend,
      textColor: "#080600",
      backgroundColor: "#e8c6ba",
      borderColor: "#080600",
    },
  },
};

export const PROJECT_PRESET_NAME = "Custom";
const NEW_PRESET_NAME_PREFIX = "Shared"; // becomes "Shared 1", "Shared 2", etc.

type GraphPresets = {
  // this is the one you get per project
  project: GraphSettings;
  // these ones are shared and builtin
  builtins: Record<keyof typeof builtinGraphPresets, GraphSettings | undefined>;
  // these ones are also shared, but the user creates them
  user: Record<string, GraphSettings | undefined>;
};

const getPreset = (
  presets: GraphPresets,
  name: string,
): GraphSettings | undefined => {
  if (name === PROJECT_PRESET_NAME) {
    return presets.project;
  } else {
    return presets.builtins[name] ?? presets.user[name];
  }
};

const readStringToPresets = (str: string): Record<string, GraphSettings> => {
  const oldPresets = JSON.parse(str) as Record<string, UnknownGraphSettings>;
  const migrated: Record<string, GraphSettings> = {};
  for (const [name, settings] of Object.entries(oldPresets)) {
    migrated[name] = migrateGraphSettings(settings);
  }
  return migrated;
};

const graphPresetStorage: SyncStorage<
  Record<string, GraphSettings | undefined>
> = {
  getItem(key, initialValue) {
    const got = localStorage.getItem(key);
    if (!got) {
      return initialValue;
    } else {
      return readStringToPresets(got);
    }
  },

  setItem(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  removeItem(key) {
    localStorage.removeItem(key);
  },

  subscribe(key, callback, initialValue) {
    if (
      typeof window === "undefined" ||
      typeof window.addEventListener === "undefined"
    ) {
      return;
    }

    const handler = (e: StorageEvent) => {
      if (e.storageArea === localStorage && e.key === key) {
        if (e.newValue) {
          callback(readStringToPresets(e.newValue));
        } else {
          // NOTE: data loss?
          callback(initialValue);
        }
      }
    };

    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  },
};

const _builtinGraphPresetsAtom = atomWithStorage(
  "builtinGraphPresets",
  builtinGraphPresets,
  graphPresetStorage,
);

const _userGraphPresetsAtom = atomWithStorage(
  "userGraphPresets",
  {} as Record<string, GraphSettings | undefined>,
  graphPresetStorage,
);

export const projectGraphSettingsAtom = atom(defaultGraphSettings);

export const graphPresetsAtom = atom<GraphPresets>((get) => ({
  project: get(projectGraphSettingsAtom),
  builtins: get(_builtinGraphPresetsAtom),
  user: get(_userGraphPresetsAtom),
}));

// call this possibly stale because if the preset with its name was deleted, this will point to nothing
// NOTE: if the user deletes a preset this was pointing to, then recreates it, it will appear as if
//       they are switching presets.
const _possiblyStaleCurrentPresetAtom = atom(PROJECT_PRESET_NAME);
export const currentPresetAtom = atom((get) => {
  const presets = get(graphPresetsAtom);
  const current = get(_possiblyStaleCurrentPresetAtom);
  if (getPreset(presets, current)) {
    return current;
  } else {
    // fallback
    return PROJECT_PRESET_NAME;
  }
});

export const updateCurrentPresetAtom = atom(
  null,
  (get, set, newName: string) => {
    const presets = get(graphPresetsAtom);
    if (!getPreset(presets, newName)) {
      // NOTE: is it ok to silently fail?
      set(_possiblyStaleCurrentPresetAtom, PROJECT_PRESET_NAME);
    } else {
      set(_possiblyStaleCurrentPresetAtom, newName);
    }
  },
);

export const addGraphPresetAtom = atom(null, (get, set) => {
  const graphPresets = get(graphPresetsAtom);
  let chosenName: string;
  let i = 0;
  do {
    i += 1;
    chosenName = `${NEW_PRESET_NAME_PREFIX} ${i}`;
  } while (
    Object.hasOwn(graphPresets.builtins, chosenName) ||
    Object.hasOwn(graphPresets.user, chosenName) ||
    chosenName === PROJECT_PRESET_NAME
  );

  set(_userGraphPresetsAtom, {
    ...graphPresets.user,
    [chosenName]: defaultGraphSettings,
  });
  set(_possiblyStaleCurrentPresetAtom, chosenName);
});

export type RenamePresetError = "cantRename" | "invalidName" | "dupeName";

const isPresetNameValid = (name: string): boolean => {
  return 1 <= name.length && name.length <= 20;
};

/**
 * @returns a RenamePresetError if any occurred, otherwise nothing
 */
export const renameGraphPresetAtom = atom(
  null,
  (
    get,
    set,
    {
      oldName,
      newName,
    }: {
      oldName: string;
      newName: string;
    },
  ): RenamePresetError | null => {
    if (oldName === newName) return null;
    if (!isPresetNameValid(newName)) {
      return "invalidName";
    }

    const presets = get(graphPresetsAtom);

    if (getPreset(presets, newName)) {
      return "dupeName";
    }

    if (oldName === PROJECT_PRESET_NAME) {
      return "cantRename";
    } else if (Object.hasOwn(presets.builtins, oldName)) {
      return "cantRename";
    } else if (Object.hasOwn(presets.user, oldName)) {
      const settings = presets.user[oldName];
      const { [oldName]: _, ...rest } = presets.user;
      const shouldUpdateCurrent = get(currentPresetAtom) === oldName;

      set(_userGraphPresetsAtom, {
        ...rest,
        [newName]: settings,
      });

      if (shouldUpdateCurrent) {
        set(_possiblyStaleCurrentPresetAtom, newName);
      }
    }

    return null;
  },
);

export const deleteGraphPresetAtom = atom(null, (get, set, name: string) => {
  const presets = get(graphPresetsAtom);

  if (name === PROJECT_PRESET_NAME) {
    // not allowed, should not be possible via user interaction
    console.warn("Can't rename project-specific preset.");
  } else if (Object.hasOwn(presets.builtins, name)) {
    console.warn("Can't rename builtin preset.");
  } else if (Object.hasOwn(presets.user, name)) {
    if (get(currentPresetAtom) === name) {
      set(_possiblyStaleCurrentPresetAtom, PROJECT_PRESET_NAME);
    }

    const { [name]: _, ...rest } = presets.user;

    set(_userGraphPresetsAtom, rest);
  }
});

export const graphSettingsAtom = atom((get): GraphSettings => {
  const presets = get(graphPresetsAtom);
  const settings = getPreset(presets, get(currentPresetAtom));
  if (typeof settings === "object") {
    return settings;
  } else {
    return presets.project;
  }
});

export const updateGraphSettingsAtom = atom(
  null,
  (get, set, newSettings: GraphSettings) => {
    const name = get(currentPresetAtom);
    const presets = get(graphPresetsAtom);
    if (name === PROJECT_PRESET_NAME) {
      set(projectGraphSettingsAtom, newSettings);
    } else if (Object.hasOwn(presets.builtins, name)) {
      set(_builtinGraphPresetsAtom, {
        ...presets.builtins,
        [name]: newSettings,
      });
    } else if (Object.hasOwn(presets.user, name)) {
      set(_userGraphPresetsAtom, {
        ...presets.user,
        [name]: newSettings,
      });
    }
  },
);
