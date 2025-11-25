import { atom, useAtom, useAtomValue } from "jotai";

import { promptDownloadString } from "@/features/download";
import { convertColumnsToCsv } from "@/features/csv";

import { simulationResultAtom } from "@/globals/simulation";

import styles from "./results.module.css";

import DataTable, { type DataTableProps } from "@/components/DataTable";
import NumericSliderProperty from "@/components/property-list/NumericSliderProperty";

import { type SteadyStateResultItem } from "@/features/simulation/Simulator";
import IconButton from "@/components/IconButton";

import DownloadIcon from "@/assets/icons/DownloadIcon.svg?react";
import ChevronDownIcon from "@/assets/icons/ChevronDownIcon.svg?react";
import { nameAtom } from "@/globals/settings";
import { useState } from "react";

const decimalPlacesAtom = atom(2);

const Section = ({
  title,
  columns,
}: {
  title: string;
  columns: DataTableProps["columns"];
}) => {
  const modelName = useAtomValue(nameAtom);
  const decimalPlaces = useAtomValue(decimalPlacesAtom);
  const [open, setOpen] = useState(true);

  const handleDownload = () => {
    const csv = convertColumnsToCsv(columns);

    promptDownloadString(`${modelName} Steady State ${title}`, csv, "text/csv");
  };

  const toggleOpen = () => {
    setOpen((open) => !open);
  };

  // TODO: make more accessible for screenreaders
  return (
    <div className={styles.steadyStateSection}>
      <h2 className={styles.steadyStateSectionTitleContainer}>
        <button
          className={styles.steadyStateSectionTrigger}
          onClick={toggleOpen}
        >
          <ChevronDownIcon
            className={styles.steadyStateSectionTitleChevron}
            width="1em"
            height="1em"
            data-open={open}
          />
          {title}
        </button>

        <IconButton label="Download" onClick={handleDownload}>
          <DownloadIcon width="0.75em" height="0.75em" />
        </IconButton>
      </h2>

      {open && <DataTable columns={columns} decimalPlaces={decimalPlaces} />}
    </div>
  );
};

const columnsFromSteadyStateItem = (item: SteadyStateResultItem) => [
  {
    // first column for row names so title is empty
    title: "",
    values: item.rows,
  },
  ...item.columns.map((name, i) => ({
    title: name,
    values: item.values.map((v) => v[i]),
  })),
];

const SteadyStateResultPanel = () => {
  const simulationResults = useAtomValue(simulationResultAtom);
  const [decimalPlaces, setDecimalPlaces] = useAtom(decimalPlacesAtom);

  if (simulationResults?.type !== "steadyState") {
    return;
  }

  const concentrationColumns = [
    {
      title: "Symbol",
      values: simulationResults.concentrations.map((c) => c.name),
    },
    {
      title: "Value",
      values: simulationResults.concentrations.map((c) => c.value),
    },
  ];

  const eigenvalueColumns = [
    {
      title: "Real",
      values: simulationResults.eigenValues.map((e) => e[0]),
    },
    {
      title: "Imaginary",
      values: simulationResults.eigenValues.map((e) => e[1]),
    },
  ];

  const jacobianColumns = columnsFromSteadyStateItem(
    simulationResults.jacobian,
  );
  const fluxControlColumns = columnsFromSteadyStateItem(
    simulationResults.fluxControl,
  );
  const concentrationControlColumns = columnsFromSteadyStateItem(
    simulationResults.concentrationControl,
  );
  const elasticitiesColumns = columnsFromSteadyStateItem(
    simulationResults.elasticities,
  );

  return (
    <div className={styles.panel}>
      <div className={styles.steadyStateTables}>
        <NumericSliderProperty
          name="Decimal Places"
          value={decimalPlaces}
          onChange={setDecimalPlaces}
          min={0}
          max={100}
          step={1}
        />
        <p>Value: {simulationResults.value}</p>
        <Section title="Concentrations" columns={concentrationColumns} />
        <Section title="Eigenvalues" columns={eigenvalueColumns} />
        <Section title="Jacobian" columns={jacobianColumns} />
        <Section title="Flux Control" columns={fluxControlColumns} />
        <Section
          title="Concentration Control"
          columns={concentrationControlColumns}
        />
        <Section title="Elasticities" columns={elasticitiesColumns} />
      </div>
    </div>
  );
};

export default SteadyStateResultPanel;
