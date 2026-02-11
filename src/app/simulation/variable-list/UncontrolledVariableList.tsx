import { useAtom, useAtomValue } from "jotai";
import { variablesAtom, variableSettingssAtom } from "@/globals/model";
import { type VariableSettings } from "@/globals/settings";
import VariableList from "@/app/simulation/variable-list/VariableList";

/**
 * VariableList that manages variables itself using the global variable state.
 */
const UncontrolledVariableList = () => {
  const variables = useAtomValue(variablesAtom);
  const [variableSettingss, setVariableSettingss] = useAtom(
    variableSettingssAtom,
  );

  const handleVariableSettingsChange = (
    variableName: string,
    newSettings: VariableSettings,
  ) => {
    setVariableSettingss((old) => ({
      ...old,
      [variableName]: newSettings,
    }));
  };

  return (
    <VariableList
      variables={variables}
      variableSettingss={variableSettingss}
      onVariableSettingsChange={handleVariableSettingsChange}
    />
  );
};

export default UncontrolledVariableList;
