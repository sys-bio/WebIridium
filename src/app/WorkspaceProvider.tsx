import { useEffect } from "react";
import { Provider, useSetAtom } from "jotai";

import defaultModel from "@/assets/default.ant?raw";

import { requestSavedData, type SavedDataV1 } from "@/features/saving";

import { setModelAtom } from "@/globals/model";
import { editorFontSizeAtom, themeOptionAtom } from "@/globals/appearance";
import {
  graphSettingsAtom,
  timeCourseParametersAtom,
  variableSettingssAtom,
} from "@/globals/settings";
import {
  computeSteadyStateAtom,
  simulateTimeCourseAtom,
} from "@/globals/simulation";
import { readShareUrlFragment } from "@/features/share";
import { updateAllHistoryAtom } from "@/globals/history";
import { updateAllChatHistoryAtom } from "@/globals/chat";
import { apiKeyAtom } from "@/globals/chat";

// simulation from share link will not be run if they use more number of points
// than this.
const UNREASONABLE_NUMBER_OF_POINTS = 2500;

const Initialize = ({
  didInitialLoadRef,
}: {
  didInitialLoadRef: React.RefObject<boolean>;
}) => {
  const setModel = useSetAtom(setModelAtom);
  const setTimeCourseParameters = useSetAtom(timeCourseParametersAtom);

  const simulateTimeCourse = useSetAtom(simulateTimeCourseAtom);
  const computeSteadyState = useSetAtom(computeSteadyStateAtom);

  const setThemeOption = useSetAtom(themeOptionAtom);
  const setEditorFontSize = useSetAtom(editorFontSizeAtom);
  const updateAllHistory = useSetAtom(updateAllHistoryAtom);
  const updateAllChatHistory = useSetAtom(updateAllChatHistoryAtom);
  const setGraphSettings = useSetAtom(graphSettingsAtom);
  const setVariableSettingss = useSetAtom(variableSettingssAtom);
  const setApiKey = useSetAtom(apiKeyAtom);

  useEffect(() => {
    if (!didInitialLoadRef.current) {
      didInitialLoadRef.current = true;

      const loadWithInitial = async () => {
        let savedData: SavedDataV1 | null = null;
        try {
          savedData = await requestSavedData();
        } catch (err) {
          console.error(err);
        }

        if (savedData) {
          updateAllHistory(savedData.workspace.history);
          updateAllChatHistory(savedData.workspace.chatHistory ?? []);
          setVariableSettingss(savedData.workspace.variableSettingss);
          setGraphSettings(savedData.workspace.graphSettings);
          setApiKey(savedData.workspace.apiKey ?? null);
        }

        const shareResult = await readShareUrlFragment(
          decodeURIComponent(location.hash.slice(1)),
        );

        // share data was found in the url, load it
        if (shareResult.type === "success") {
          const setSuccess = await setModel({
            name: shareResult.data.name,
            content: shareResult.data.code,
            resetCurrentResult: false,
          });

          if (setSuccess) {
            if (shareResult.data.simulation.type === "timeCourse") {
              const isReasonable =
                shareResult.data.simulation.parameters.numberOfPoints <
                UNREASONABLE_NUMBER_OF_POINTS;
              setTimeCourseParameters(shareResult.data.simulation.parameters);

              if (isReasonable) {
                await simulateTimeCourse();
              }
            } else {
              await computeSteadyState();
            }
          }
        } else if (savedData) {
          await setModel({
            name: savedData.workspace.name,
            content: savedData.workspace.content,
            resetCurrentResult: false,
          });
        } else {
          await setModel({
            name: "Starter Model",
            content: defaultModel,
            resetCurrentResult: false,
          });
        }
      };

      void loadWithInitial();
    } else {
      void setModel({
        name: "Starter Model",
        content: defaultModel,
        resetCurrentResult: false,
      });
    }
  }, [
    didInitialLoadRef,
    setModel,
    computeSteadyState,
    setTimeCourseParameters,
    simulateTimeCourse,
    setGraphSettings,
    setThemeOption,
    setEditorFontSize,
    setVariableSettingss,
    updateAllHistory,
    updateAllChatHistory,
    setApiKey,
  ]);

  return null;
};

const WorkspaceProvider = ({
  didInitialLoadRef,
  children,
}: {
  didInitialLoadRef: React.RefObject<boolean>;
  children: React.ReactNode;
}) => {
  return (
    <Provider>
      <Initialize didInitialLoadRef={didInitialLoadRef} />
      {children}
    </Provider>
  );
};

export default WorkspaceProvider;
