export type Theme = (typeof THEMES)[number];

const TRANSITION_CLASS = "theme-in-transition";

export const themeMediaQuery = window.matchMedia(
  "(prefers-color-scheme: dark)",
);

export const THEMES = [
  "Light",
  "Dark",
  "Very Dark",
  "Monokai",
  "Catpuccin",
] as const;

export const getPreferredTheme = (): Theme => {
  // https://stackoverflow.com/questions/56393880/how-do-i-detect-dark-mode-using-javascript
  if (themeMediaQuery.matches) {
    return "Dark";
  } else {
    return "Light";
  }
};

export const getTheme = () => {
  return document.documentElement.dataset.theme;
};

export const setTheme = (theme: Theme) => {
  // for tests
  if (typeof document === "undefined") return;

  document.documentElement.classList.add(TRANSITION_CLASS);

  document.documentElement.dataset.theme = theme;

  setTimeout(() => {
    document.documentElement.classList.remove(TRANSITION_CLASS);
  }, 600);
};
