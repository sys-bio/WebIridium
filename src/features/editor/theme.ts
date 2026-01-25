import * as monaco from "monaco-editor";
import type { Theme } from "../theme";

const DARK_KEYWORD_COLOR = "#77dce0";
const DARK_KEYWORD2_COLOR = "#5adb8e";
const DARK_SPECIAL_COLOR = "#7cebe7";

const iridiumDarkTheme: monaco.editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: false,
  colors: {
    "editor.background": "#1f2329",
    "editor.foreground": "#e6e8eb",
    "editorLineNumber.foreground": "#5e6673",
    "editorLineNumber.activeForeground": "#c1c8d4",
    "editor.selectionBackground": "#283e5e",
    "scrollbar.shadow": "#00000055",
  },
  rules: [
    { token: "invalid", foreground: "#ff0000" },

    { token: "species", foreground: DARK_KEYWORD_COLOR },

    { token: "boundarySpecies", foreground: DARK_SPECIAL_COLOR },

    { token: "compartment", foreground: DARK_KEYWORD_COLOR },

    { token: "const", foreground: DARK_KEYWORD_COLOR },

    { token: "unit", foreground: DARK_KEYWORD_COLOR },

    { token: "var", foreground: DARK_KEYWORD_COLOR },

    { token: "keywords", foreground: DARK_KEYWORD_COLOR },
    { token: "operator", foreground: "#84cbe3" },

    { token: "function", foreground: DARK_KEYWORD2_COLOR },
    { token: "model", foreground: DARK_KEYWORD2_COLOR },
    { token: "end", foreground: DARK_KEYWORD2_COLOR },

    { token: "transform", foreground: "#81bdeb" },

    { token: "annotation", foreground: DARK_KEYWORD_COLOR },

    { token: "assign", foreground: "#81bdeb" },

    // { token: 'other', foreground: KEYWORD_COLOR },
    { token: "react-remov", foreground: "#a6f7e8" },
    { token: "comment", foreground: "#6b967c" },
    { token: "comment.preset", foreground: "#6b967c", fontStyle: "bold" },
    { token: "string", foreground: "#e3df8a" },
    { token: "number", foreground: "#f7bd7e" },
  ],
};

const LIGHT_KEYWORD_COLOR = "#038286";
const LIGHT_KEYWORD2_COLOR = "#248457";
const LIGHT_SPECIAL_COLOR = "#13817d";

const iridiumLightTheme: monaco.editor.IStandaloneThemeData = {
  base: "vs",
  inherit: false,
  colors: {
    "editor.background": "#fefefe",
    "editor.foreground": "#111314",
    "editorLineNumber.foreground": "#969da8",
    "editorLineNumber.activeForeground": "#3c3f45",
    "editor.selectionBackground": "#a7d4f2",
  },
  rules: [
    { token: "invalid", foreground: "#ff0000" },

    { token: "species", foreground: LIGHT_KEYWORD_COLOR },

    { token: "boundarySpecies", foreground: LIGHT_SPECIAL_COLOR },

    { token: "compartment", foreground: LIGHT_KEYWORD_COLOR },

    { token: "const", foreground: LIGHT_KEYWORD_COLOR },

    { token: "unit", foreground: LIGHT_KEYWORD_COLOR },

    { token: "var", foreground: LIGHT_KEYWORD_COLOR },

    { token: "keywords", foreground: LIGHT_KEYWORD_COLOR },
    { token: "operator", foreground: "#1f87ab" },

    { token: "function", foreground: LIGHT_KEYWORD2_COLOR },
    { token: "model", foreground: LIGHT_KEYWORD2_COLOR },
    { token: "end", foreground: LIGHT_KEYWORD2_COLOR },

    { token: "transform", foreground: "#1d74b5" },

    { token: "annotation", foreground: LIGHT_KEYWORD_COLOR },

    { token: "assign", foreground: "#1d74b5" },

    // { token: 'other', foreground: KEYWORD_COLOR },
    { token: "react-remov", foreground: "#01856c" },
    { token: "comment", foreground: "#6d7870" },
    { token: "comment.preset", foreground: "#6d7870", fontStyle: "bold" },
    { token: "string", foreground: "#80780a" },
    { token: "number", foreground: "#b2610a" },
  ],
};

const monokaiTheme: monaco.editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: false,
  colors: {
    "editor.foreground": "#f8f8f2",
    "editor.background": "#272822",
    "editor.selectionBackground": "#49483E",
    "editor.lineHighlightBackground": "#3E3D32",
    "editorCursor.foreground": "#F8F8F0",
    "editorWhitespace.foreground": "#3B3A32",
    "editor.selectionHighlightBorder": "#222218",
  },
  rules: [
    { token: "invalid", foreground: "#ff0000" },

    { token: "species", foreground: "#f92672" },

    { token: "boundarySpecies", foreground: "#fd971f", fontStyle: "italic" },

    { token: "compartment", foreground: "#f92672" },

    { token: "const", foreground: "#a6e22e" },

    { token: "unit", foreground: "#a6e22e" },

    { token: "var", foreground: "#a6e22e" },

    { token: "keywords", foreground: "#f92672" },
    { token: "operator", foreground: "#bbb975" },

    { token: "function", foreground: "#f92672" },
    { token: "model", foreground: "#f92672" },
    { token: "end", foreground: "#f92672" },

    { token: "transform", foreground: "#bbb975" },

    { token: "annotation", foreground: "#f92672" },

    { token: "assign", foreground: "#bbb975" },

    // { token: 'other', foreground: KEYWORD_COLOR },
    { token: "react-remov", foreground: "#66d9ef" },
    { token: "comment", foreground: "#75715e" },
    { token: "comment.preset", foreground: "#75715e", fontStyle: "bold" },
    { token: "string", foreground: "#e6db74" },
    { token: "number", foreground: "#ae81ff" },
  ],
};

const catpuccinTheme: monaco.editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: false,
  colors: {
    "editor.foreground": "#cdd6f4",
    "editor.background": "#1e1e2e",
    "editor.selectionBackground": "#9399b233",
    "editor.lineHighlightBackground": "#cdd6f412",
    "editorCursor.foreground": "#ebd3e8",
    "editorWhitespace.foreground": "#9399b266",
    "editor.selectionHighlightBorder": "#9399b233",
  },
  rules: [
    { token: "invalid", foreground: "#ff0000" },

    { token: "species", foreground: "#b4befe" },

    { token: "boundarySpecies", foreground: "#89b4fa", fontStyle: "italic" },

    { token: "compartment", foreground: "#cba6f7" },

    { token: "const", foreground: "#b4befe" },

    { token: "unit", foreground: "#b4befe" },

    { token: "var", foreground: "#b4befe" },

    { token: "keywords", foreground: "#cba6f7" },
    { token: "operator", foreground: "#94e2d5" },

    { token: "function", foreground: "#cba6f7" },
    { token: "model", foreground: "#cba6f7" },
    { token: "end", foreground: "#cba6f7" },

    { token: "transform", foreground: "#94e2d5" },

    { token: "annotation", foreground: "#eba0ac" },

    { token: "assign", foreground: "#94e2d5" },

    // { token: 'other', foreground: KEYWORD_COLOR },
    { token: "react-remov", foreground: "#cba6f7" },
    { token: "comment", foreground: "#9399b2" },
    { token: "comment.preset", foreground: "#9399b2", fontStyle: "bold" },
    { token: "string", foreground: "#a6e3a1" },
    { token: "number", foreground: "#fab387" },
  ],
};

export const monacoThemes: Record<
  Theme,
  { name: string; data: monaco.editor.IStandaloneThemeData }
> = {
  Dark: { name: "iridiumDark", data: iridiumDarkTheme },
  Light: { name: "iridiumLight", data: iridiumLightTheme },
  Monokai: { name: "monokai", data: monokaiTheme },
  Catpuccin: { name: "catpuccin", data: catpuccinTheme },
};
