import { atom, useAtomValue, useSetAtom } from "jotai";

import {
  getPreferredTheme,
  setTheme,
  themeMediaQuery,
  type Theme,
} from "@/features/theme";
import { atomWithStorage } from "jotai/utils";
import { useEffect } from "react";

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
const tryUpdateThemeIfAutomaticAtom = atom(null, (_, set) => {
  set(_automaticThemeAtom, getPreferredTheme());
});

// other stuff
export const editorFontSizeAtom = atomWithStorage("editorFontSize", 12);

// hooks
export const useAutomaticTheme = () => {
  const tryUpdateThemeIfAutomatic = useSetAtom(tryUpdateThemeIfAutomaticAtom);
  const theme = useAtomValue(themeAtom);

  useEffect(() => {
    const handleChange = () => {
      tryUpdateThemeIfAutomatic();
    };

    themeMediaQuery.addEventListener("change", handleChange);

    handleChange();

    return () => themeMediaQuery.removeEventListener("change", handleChange);
  }, [tryUpdateThemeIfAutomatic]);

  useEffect(() => {
    setTheme(theme);
  }, [theme]);
};
