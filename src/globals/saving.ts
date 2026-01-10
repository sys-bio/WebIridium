import { atom } from "jotai";
import { commitSavedData } from "@/features/saving";
import { graphSettingsAtom, nameAtom, variableSettingssAtom } from "./settings";
import { editorContentAtom } from "./model";
import { historyAtom } from "./history";
import { apiKeyAtom } from "./chat";
import { chatHistoryAtom } from "./chat";

export const saveAtom = atom(null, async (get, _set): Promise<void> => {
  await commitSavedData({
    workspace: {
      name: get(nameAtom),
      graphSettings: get(graphSettingsAtom),
      variableSettingss: get(variableSettingssAtom),
      content: get(editorContentAtom),
      history: get(historyAtom),
      chatHistory: get(chatHistoryAtom),
      apiKey: get(apiKeyAtom),
    },
  });
});
