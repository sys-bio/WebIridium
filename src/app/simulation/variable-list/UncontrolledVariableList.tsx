import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { variablesAtom } from "@/globals/model";
import {
  variableSettingssAtom,
  type VariableSettings,
} from "@/globals/settings";
import { saveAtom } from "@/globals/saving";
import VariableList from "@/app/simulation/variable-list/VariableList";

/**
 * VariableList that manages variables itself using the global variable state.
 */
const UncontrolledVariableList = () => {
  const save = useSetAtom(saveAtom);
  const variables = useAtomValue(variablesAtom);
  const [variableSettingss, setVariableSettingss] = useAtom(
    variableSettingssAtom,
  );

  const handleVariableSettingsChange = useCallback(
    (variableName: string, newSettings: VariableSettings) => {
      setVariableSettingss((old) => ({
        ...old,
        [variableName]: newSettings,
      }));
      void save();
    },
    [setVariableSettingss, save],
  );

  return (
    <VariableList
      variables={variables}
      variableSettingss={variableSettingss}
      onVariableSettingsChange={handleVariableSettingsChange}
    />
  );
};

export default UncontrolledVariableList;
