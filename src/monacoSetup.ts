import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

import { monacoThemes } from "@/features/editor/monacoThemes";
import { antimonyMonarchDefinition } from "@/features/editor/monarchDefinition";

self.MonacoEnvironment = {
  getWorker: (_: any, __: string) => {
    return new EditorWorker();
  },
};

for (const theme of Object.values(monacoThemes)) {
  monaco.editor.defineTheme(theme.name, theme.data);
}

monaco.languages.register({ id: "antimony" });
monaco.languages.setMonarchTokensProvider(
  "antimony",
  antimonyMonarchDefinition,
);

monaco.languages.setLanguageConfiguration("antimony", {
  brackets: [["(", ")"]],
});
