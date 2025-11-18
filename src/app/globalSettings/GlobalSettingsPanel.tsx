import { useAtom, useAtomValue, useSetAtom } from "jotai";

import {
  editorFontSizeAtom,
  themeOptionAtom,
  type ThemeOption,
} from "@/globals/appearance";
import {
  getSimulatorName,
  SIMULATOR_LIST,
  simulatorAtom,
  updateSimulatorAtom,
} from "@/globals/simulator";
import { saveAtom } from "@/globals/saving";

import styles from "./globalSettings.module.css";
import PropertyList from "@/components/property-list/PropertyList";
import SelectProperty from "@/components/property-list/SelectProperty";

import { THEMES } from "@/features/theme";

import PropertyHeading from "@/components/property-list/PropertyHeading";
import NumericSliderProperty from "@/components/property-list/NumericSliderProperty";

const themeOptions: Record<string, string> = {
  Automatic: "Automatic",
};
for (const theme of THEMES) {
  themeOptions[theme] = theme;
}

const simulatorOptions: Record<string, string> = {};
for (const simulator of SIMULATOR_LIST) {
  simulatorOptions[simulator] = simulator;
}

const GlobalSettingsPanel = () => {
  const [themeOption, setThemeOption] = useAtom(themeOptionAtom);
  const [editorFontSize, setEditorFontSize] = useAtom(editorFontSizeAtom);
  const save = useSetAtom(saveAtom);
  const simulator = useAtomValue(simulatorAtom);
  const updateSimulator = useSetAtom(updateSimulatorAtom);

  return (
    <div className={styles.panel}>
      <div className={styles.list}>
        <PropertyList alignment="left">
          <PropertyHeading>Appearance</PropertyHeading>
          <SelectProperty
            name="Theme"
            options={themeOptions}
            value={themeOption}
            onChange={(newTheme) => {
              setThemeOption(newTheme as ThemeOption);
              void save();
            }}
          />
          <NumericSliderProperty
            name="Editor Font Size"
            min={8}
            max={32}
            value={editorFontSize}
            onChange={(newSize) => {
              setEditorFontSize(newSize);
              void save();
            }}
          />

          <PropertyHeading>Simulation</PropertyHeading>
          <SelectProperty
            name="Simulator"
            options={simulatorOptions}
            value={getSimulatorName(simulator)}
            onChange={(name) => {
              updateSimulator(name);
              void save();
            }}
          />
        </PropertyList>
      </div>
    </div>
  );
};

export default GlobalSettingsPanel;
