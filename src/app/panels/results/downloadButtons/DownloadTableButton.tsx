import { useAtomValue } from "jotai";

import DownloadIcon from "@/assets/icons/DownloadIcon.svg?react";

import IconButton from "@/components/IconButton";

import { simulationResultAtom } from "@/globals/workspace/simulation";
import {
  variableSettingssAtom,
  independentVariableAtom,
  nameAtom,
} from "@/globals/workspace/settings";
import { useScanIndependentVariable } from "@/features/simulation/useScanIndependentVariable";
import { generateTableParameters } from "../generateTableParameters";
import { promptDownloadString } from "@/features/download";
import { escapeCsvCell } from "@/features/csv";

const DownloadTableButton = () => {
  const result = useAtomValue(simulationResultAtom);
  const variableSettingss = useAtomValue(variableSettingssAtom);
  const scanIndependentVariable = useScanIndependentVariable();
  const timeCourseIndependentVariable = useAtomValue(independentVariableAtom);
  const workspaceName = useAtomValue(nameAtom);

  const handleClick = () => {
    if (!result) return;

    const { columns } = generateTableParameters(
      result,
      variableSettingss,
      timeCourseIndependentVariable,
      scanIndependentVariable,
    );

    // TODO: unit test the csv output
    const lines = [];
    const firstColumn = columns[0];
    if (!firstColumn) return;

    const line = [];
    for (const { title } of columns) {
      line.push(escapeCsvCell(title));
    }
    lines.push(line.join(","));

    for (let i = 0; i < firstColumn.values.length; i++) {
      const line = [];
      for (const { values } of columns) {
        line.push(values[i]);
      }
      lines.push(line.join(","));
    }

    const csv = lines.join("\n");

    promptDownloadString(`Table of ${workspaceName}`, csv, "text/csv");
  };

  return (
    <IconButton label="Download" onClick={handleClick}>
      <DownloadIcon width="1em" height="1em" />
    </IconButton>
  );
};

export default DownloadTableButton;
