import styles from "./overlays.module.css";
import buttonStyles from "@/components/Button.module.css";

import type { Dataset, DatasetVariable } from "@/globals/overlays";

import DatasetVariableItem from "./DatasetVariableItem";

import PropertyAccordionItem from "@/components/property-accordion/PropertyAccordionItem";
import PropertyList from "@/components/property-list/PropertyList";
import SelectProperty from "@/components/property-list/SelectProperty";
import BooleanProperty from "@/components/property-list/BooleanProperty";
import NumericSliderProperty from "@/components/property-list/NumericSliderProperty";

import EyeIcon from "@/assets/icons/EyeIcon.svg?react";
import ClosedEyeIcon from "@/assets/icons/ClosedEyeIcon.svg?react";

export interface DatasetItemProps {
  dataset: Dataset;
  onDatasetChange: (newDataset: Dataset) => void;
}

const DatasetItem = ({ dataset, onDatasetChange }: DatasetItemProps) => {
  const handleVariableChange = (newVariable: DatasetVariable) => {
    onDatasetChange({
      ...dataset,
      variables: {
        ...dataset.variables,
        [newVariable.name]: newVariable,
      },
    });
  };

  const hideAll = () => {
    const newVariables: Record<string, DatasetVariable> = {};
    for (const [name, variable] of Object.entries(dataset.variables)) {
      newVariables[name] = {
        ...variable,
        visible: false,
      };
    }

    onDatasetChange({
      ...dataset,
      variables: newVariables,
    });
  };

  const showAll = () => {
    const newVariables: Record<string, DatasetVariable> = {};
    for (const [name, variable] of Object.entries(dataset.variables)) {
      newVariables[name] = {
        ...variable,
        visible: true,
      };
    }

    onDatasetChange({
      ...dataset,
      variables: newVariables,
    });
  };

  return (
    <PropertyAccordionItem title={dataset.name}>
      <div className={styles.itemContent}>
        <PropertyList alignment="leftSmall">
          <BooleanProperty
            name="Enabled"
            onChange={(newValue) =>
              onDatasetChange({
                ...dataset,
                enabled: newValue,
              })
            }
            value={dataset.enabled}
          />
          <SelectProperty
            name="Independent Variable"
            onChange={(newValue) =>
              onDatasetChange({
                ...dataset,
                independentVariableName: newValue,
              })
            }
            value={dataset.independentVariableName}
            options={Object.fromEntries(
              Object.values(dataset.variables).map((v) => [
                v.displayName,
                v.name,
              ]),
            )}
          />
          <NumericSliderProperty
            name="Size"
            value={dataset.size}
            onChange={(newSize: number) =>
              onDatasetChange({
                ...dataset,
                size: newSize,
              })
            }
            min={1}
            max={100}
            step={1}
          />
        </PropertyList>

        <div className={styles.variableList}>
          {Object.values(dataset.variables).map((v) => (
            <DatasetVariableItem
              key={v.name}
              variable={v}
              onChange={handleVariableChange}
            />
          ))}
        </div>

        <div className={styles.datasetActions}>
          <button className={buttonStyles.default} onClick={showAll}>
            <EyeIcon width="1em" height="1em" />
            Show All
          </button>
          <button className={buttonStyles.default} onClick={hideAll}>
            <ClosedEyeIcon width="1em" height="1em" />
            Hide All
          </button>
        </div>
      </div>
    </PropertyAccordionItem>
  );
};

export default DatasetItem;
