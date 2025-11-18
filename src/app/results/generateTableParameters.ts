import type { DataTableProps } from "@/components/DataTable";

import type { SimulationResult } from "@/features/simulation/Simulator";
import {
  getVariableSettingsFrom,
  type VariableSettings,
} from "@/globals/settings";

import { getColumnsFromResult } from "./getColumnsFromResult";
import { getParameterScanTitle } from "./getParameterScanTitle";

export const generateTableParameters = (
  result: SimulationResult,
  variableSettingss: Record<string, VariableSettings>,
  timeCourseIndependentVariable: string | null,
  scanIndepedentVariable: string,
): { columns: DataTableProps["columns"] } => {
  const [columns, independentVariableName] = getColumnsFromResult(
    result,
    timeCourseIndependentVariable,
    scanIndepedentVariable,
  );

  const dataTableColumns = [];
  const parameterSettings =
    result.type === "parameterScan"
      ? getVariableSettingsFrom(variableSettingss, result.parameter)
      : null;

  const independentVariableColumn = columns.find(
    (c) => c.variableName === independentVariableName,
  );

  if (independentVariableColumn) {
    const settings = getVariableSettingsFrom(
      variableSettingss,
      independentVariableName,
    );
    dataTableColumns.push({
      title: settings.displayName,
      values: independentVariableColumn.values,
    });
  }

  for (const { variableName, values, parameterValue } of columns) {
    if (variableName !== independentVariableName) {
      const settings = getVariableSettingsFrom(variableSettingss, variableName);
      if (!settings.visible) continue;

      const title =
        parameterValue !== undefined
          ? getParameterScanTitle(
              settings.displayName,
              parameterSettings!.displayName,
              parameterValue,
            )
          : settings.displayName;

      dataTableColumns.push({ title, values });
    }
  }

  return { columns: dataTableColumns };
};
