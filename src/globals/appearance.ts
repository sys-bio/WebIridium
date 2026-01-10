import { atom } from "jotai";

import { getPreferredTheme, type Theme } from "@/features/theme";
import { atomWithStorage } from "jotai/utils";

// theme

export type ThemeOption = Theme | "Automatic";

const _automaticThemeAtom = atom<Theme>(getPreferredTheme());
export const themeOptionAtom = atomWithStorage<ThemeOption>(
  "theme",
  "Automatic",
);

export const themeAtom = atom((get) => {
  const themeOption = get(themeOptionAtom);
  const automaticTheme = get(_automaticThemeAtom);

  if (themeOption === "Automatic") {
    return automaticTheme;
  } else {
    return themeOption;
  }
});

/**
 * Should be called everytime users preferred theme changes.
 * This will try to update the application theme if it is Automatic.
 */
export const tryUpdateThemeIfAutomaticAtom = atom(null, (_, set) => {
  set(_automaticThemeAtom, getPreferredTheme());
});

// other stuff
export const editorFontSizeAtom = atomWithStorage("editorFontSize", 12);
