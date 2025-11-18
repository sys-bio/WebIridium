import { useAtom, useAtomValue } from "jotai";
import { useState } from "react";

import {
  defaultGraphSettings,
  graphSettingsAtom,
  paletteAtom,
  type AxisSettings,
  type GraphSettings,
  type GridSettings,
  type LegendSettings,
} from "@/globals/settings";
import { defaultXAxisTitleAtom, defaultYAxisTitleAtom } from "@/globals/plot";

import styles from "./PlotSettingsPanel.module.css";
import buttonStyles from "@/components/Button.module.css";
import { PALETTES, type Palette } from "@/features/colors";

import ResetIcon from "@/assets/icons/ResetIcon.svg?react";
import CrossIcon from "@/assets/icons/CrossIcon.svg?react";
import GridNoneIcon from "@/assets/icons/GridNoneIcon.svg?react";
import GridXIcon from "@/assets/icons/GridXIcon.svg?react";
import GridYIcon from "@/assets/icons/GridYIcon.svg?react";
import GridXYIcon from "@/assets/icons/GridXYIcon.svg?react";

import BooleanProperty from "@/components/property-list/BooleanProperty";
import NumericProperty from "@/components/property-list/NumericProperty";
import NumericSliderProperty from "@/components/property-list/NumericSliderProperty";
import StringProperty from "@/components/property-list/StringProperty";
import ColorProperty from "@/components/property-list/ColorProperty";
import SelectProperty from "@/components/property-list/SelectProperty";

import PropertyList from "@/components/property-list/PropertyList";
import PropertyAccordion from "@/components/property-accordion/PropertyAccordion";
import PropertyAccordionItem from "@/components/property-accordion/PropertyAccordionItem";
import { ToggleGroupButton, ToggleGroup } from "@/components/input/ToggleGroup";
import PanelTitle from "../components/PanelTitle";
import UncontrolledVariableList from "./simulation/variable-list/UncontrolledVariableList";
import IconButton from "@/components/IconButton";

export interface PlotSettingsPanelProps {
  onClose: () => void;
}

const PlotSettingsPanel = ({ onClose }: PlotSettingsPanelProps) => {
  const [graphSettings, setGraphSettings] = useAtom(graphSettingsAtom);
  const [palette, setPalette] = useAtom(paletteAtom);

  const defaultXAxisTitle = useAtomValue(defaultXAxisTitleAtom);
  const defaultYAxisTitle = useAtomValue(defaultYAxisTitleAtom);

  const [selectedAxis, setSelectedAxis] = useState<"xAxis" | "yAxis">("xAxis");
  const axisSettings = graphSettings[selectedAxis];

  const [selectedGrid, setSelectedGrid] = useState<"majorGrid" | "minorGrid">(
    "majorGrid",
  );
  const gridSettings = graphSettings[selectedGrid];

  const handleChangeFor = (
    setting: keyof GraphSettings,
  ): ((newValue: unknown) => void) => {
    return (newValue) => {
      setGraphSettings({ ...graphSettings, [setting]: newValue });
    };
  };

  const handleAxisChangeFor = (
    setting: keyof AxisSettings,
  ): ((newValue: unknown) => void) => {
    return (newValue) => {
      setGraphSettings({
        ...graphSettings,
        [selectedAxis]: {
          ...axisSettings,
          [setting]: newValue,
        },
      });
    };
  };

  const handleGridChangeFor = (
    setting: keyof GridSettings,
  ): ((newValue: unknown) => void) => {
    return (newValue) => {
      setGraphSettings({
        ...graphSettings,
        [selectedGrid]: {
          ...gridSettings,
          [setting]: newValue,
        },
      });
    };
  };

  const handleLegendChangeFor = (
    setting: keyof LegendSettings,
  ): ((newValue: unknown) => void) => {
    return (newValue) => {
      setGraphSettings({
        ...graphSettings,
        legend: {
          ...graphSettings.legend,
          [setting]: newValue,
        },
      });
    };
  };

  return (
    <div className={styles.panel}>
      <PanelTitle title="Plot Settings">
        <IconButton onClick={onClose} label="Close">
          <CrossIcon width="1em" height="1em" aria-hidden />
        </IconButton>
      </PanelTitle>

      <button
        className={buttonStyles.default}
        onClick={() => setGraphSettings(defaultGraphSettings)}
      >
        <ResetIcon width="1em" height="1em" />
        Reset to Default
      </button>

      <PropertyAccordion
        defaultOpen={["Bounds", "Graph", "Series", "Axes", "Grids", "Legend"]}
      >
        <PropertyAccordionItem title="Bounds">
          <PropertyList alignment="center">
            <BooleanProperty
              name="Autoscale X"
              value={graphSettings.isAutoscaledX}
              onChange={handleChangeFor("isAutoscaledX")}
            />
            {!graphSettings.isAutoscaledX && (
              <NumericProperty
                name="X Minimum"
                value={graphSettings.minX}
                onChange={handleChangeFor("minX")}
                validator={(newValue) => newValue < graphSettings.maxX}
              />
            )}
            {!graphSettings.isAutoscaledX && (
              <NumericProperty
                name="X Maximum"
                value={graphSettings.maxX}
                onChange={handleChangeFor("maxX")}
                validator={(newValue) => newValue > graphSettings.minX}
              />
            )}

            <BooleanProperty
              name="Autoscale Y"
              value={graphSettings.isAutoscaledY}
              onChange={handleChangeFor("isAutoscaledY")}
            />
            {!graphSettings.isAutoscaledY && (
              <NumericProperty
                name="Y Minimum"
                value={graphSettings.minY}
                onChange={handleChangeFor("minY")}
                validator={(newValue) => newValue < graphSettings.maxY}
              />
            )}
            {!graphSettings.isAutoscaledY && (
              <NumericProperty
                name="Y Maximum"
                value={graphSettings.maxY}
                onChange={handleChangeFor("maxY")}
                validator={(newValue) => newValue > graphSettings.minY}
              />
            )}
          </PropertyList>
        </PropertyAccordionItem>

        <PropertyAccordionItem title="Graph">
          <PropertyList alignment="center">
            <ColorProperty
              name="Background Color"
              value={graphSettings.backgroundColor}
              onChange={handleChangeFor("backgroundColor")}
            />
            <ColorProperty
              name="Drawing Area Color"
              value={graphSettings.drawingAreaColor}
              onChange={handleChangeFor("drawingAreaColor")}
            />

            <BooleanProperty
              name="Include Title"
              value={graphSettings.includeTitle}
              onChange={handleChangeFor("includeTitle")}
            />
            {graphSettings.includeTitle && (
              <StringProperty
                name="Title"
                value={graphSettings.title}
                onChange={handleChangeFor("title")}
              />
            )}
            {graphSettings.includeTitle && (
              <ColorProperty
                name="Title Color"
                value={graphSettings.titleColor}
                onChange={handleChangeFor("titleColor")}
              />
            )}

            <BooleanProperty
              name="Include Border"
              value={graphSettings.includeBorder}
              onChange={handleChangeFor("includeBorder")}
            />
            {graphSettings.includeBorder && (
              <ColorProperty
                name="Border Color"
                value={graphSettings.borderColor}
                onChange={handleChangeFor("borderColor")}
              />
            )}
            {graphSettings.includeBorder && (
              <NumericSliderProperty
                name="Border Thickness"
                value={graphSettings.borderThickness}
                onChange={handleChangeFor("borderThickness")}
                min={0}
                max={10}
                step={0.5}
              />
            )}
          </PropertyList>
        </PropertyAccordionItem>

        <PropertyAccordionItem
          title="Series"
          className={styles.seriesAccordionItem}
        >
          <PropertyList alignment="center">
            <SelectProperty
              name="Palette"
              value={palette}
              options={Object.fromEntries(
                ["Custom"]
                  .concat(Object.keys(PALETTES))
                  .map((name) => [name, name]),
              )}
              onChange={(sp) => setPalette(sp as Palette)}
            />
            <NumericSliderProperty
              name="Global Width"
              value={graphSettings.globalWidth}
              min={0.1}
              max={20}
              step={0.1}
              onChange={handleChangeFor("globalWidth")}
            />
            {palette === "Custom" && <UncontrolledVariableList />}
          </PropertyList>
        </PropertyAccordionItem>

        <PropertyAccordionItem title="Axes">
          <PropertyList alignment="center">
            <ToggleGroup
              value={selectedAxis}
              onValueChange={setSelectedAxis as (val: string) => void}
            >
              <ToggleGroupButton value="xAxis">X-Axis</ToggleGroupButton>
              <ToggleGroupButton value="yAxis">Y-Axis</ToggleGroupButton>
            </ToggleGroup>

            <BooleanProperty
              name="Include Axis Title"
              value={axisSettings["includeTitle"]}
              onChange={handleAxisChangeFor("includeTitle")}
            />

            {axisSettings.includeTitle && (
              <StringProperty
                name="Axis Title"
                value={axisSettings["title"]}
                placeholder={
                  selectedAxis === "xAxis"
                    ? defaultXAxisTitle
                    : defaultYAxisTitle
                }
                onChange={handleAxisChangeFor("title")}
              />
            )}

            <ColorProperty
              name="Axis Color"
              value={axisSettings["color"]}
              onChange={handleAxisChangeFor("color")}
            />
          </PropertyList>
        </PropertyAccordionItem>

        <PropertyAccordionItem title="Grids">
          <PropertyList alignment="center">
            <ToggleGroup
              value={selectedGrid}
              onValueChange={setSelectedGrid as (val: string) => void}
            >
              <ToggleGroupButton value="majorGrid">Major</ToggleGroupButton>
              <ToggleGroupButton value="minorGrid">Minor</ToggleGroupButton>
            </ToggleGroup>

            <ToggleGroup
              value={
                gridSettings.enabled.x && gridSettings.enabled.y
                  ? "xy"
                  : gridSettings.enabled.x
                    ? "x"
                    : gridSettings.enabled.y
                      ? "y"
                      : "none"
              }
              onValueChange={(value) => {
                const handleEnabledChange = handleGridChangeFor("enabled");
                if (value === "none")
                  handleEnabledChange({ x: false, y: false });
                else
                  handleEnabledChange({
                    x: value.includes("x"),
                    y: value.includes("y"),
                  });
              }}
            >
              <ToggleGroupButton value="none">
                <span className={styles.gridButtonText}>
                  <GridNoneIcon width="1.6em" height="1.6em" /> None
                </span>
              </ToggleGroupButton>
              <ToggleGroupButton value="x">
                <span className={styles.gridButtonText}>
                  <GridXIcon width="1.6em" height="1.6em" /> X
                </span>
              </ToggleGroupButton>
              <ToggleGroupButton value="y">
                <span className={styles.gridButtonText}>
                  <GridYIcon width="1.6em" height="1.6em" /> Y
                </span>
              </ToggleGroupButton>
              <ToggleGroupButton value="xy">
                <span className={styles.gridButtonText}>
                  <GridXYIcon width="1.6em" height="1.6em" /> XY
                </span>
              </ToggleGroupButton>
            </ToggleGroup>

            <NumericSliderProperty
              name="Number of X Grids"
              value={gridSettings.numXGrids}
              min={1}
              max={50}
              step={1}
              onChange={handleGridChangeFor("numXGrids")}
            />
            <NumericSliderProperty
              name="Number of Y Grids"
              value={gridSettings.numYGrids}
              min={1}
              max={50}
              step={1}
              onChange={handleGridChangeFor("numYGrids")}
            />

            {gridSettings.enabled.x && (
              <ColorProperty
                name={`X Color`}
                value={gridSettings.xColor}
                onChange={handleGridChangeFor("xColor")}
              />
            )}
            {gridSettings.enabled.x && (
              <NumericSliderProperty
                name={`X Width`}
                value={gridSettings.xWidth}
                min={0.5}
                max={25}
                step={0.5}
                onChange={handleGridChangeFor("xWidth")}
              />
            )}

            {gridSettings.enabled.y && (
              <ColorProperty
                name={`Y Color`}
                value={gridSettings.yColor}
                onChange={handleGridChangeFor("yColor")}
              />
            )}
            {gridSettings.enabled.y && (
              <NumericSliderProperty
                name={`Y Width`}
                value={gridSettings.yWidth}
                min={0.5}
                max={25}
                step={0.5}
                onChange={handleGridChangeFor("yWidth")}
              />
            )}
          </PropertyList>
        </PropertyAccordionItem>

        <PropertyAccordionItem title="Legend">
          <PropertyList alignment="center">
            <BooleanProperty
              name="Visible"
              value={graphSettings.legend.visible}
              onChange={handleLegendChangeFor("visible")}
            />
            {graphSettings.legend.visible && (
              <BooleanProperty
                name="Floating"
                value={graphSettings.legend.isFloating}
                onChange={handleLegendChangeFor("isFloating")}
              />
            )}
            {graphSettings.legend.visible &&
              graphSettings.legend.isFloating && (
                <>
                  <ColorProperty
                    name="Text Color"
                    value={graphSettings.legend.textColor}
                    onChange={handleLegendChangeFor("textColor")}
                  />
                  <ColorProperty
                    name="Background Color"
                    value={graphSettings.legend.backgroundColor}
                    onChange={handleLegendChangeFor("backgroundColor")}
                  />
                  <NumericSliderProperty
                    name="Padding"
                    value={graphSettings.legend.padding}
                    min={0}
                    max={100}
                    step={1}
                    onChange={handleLegendChangeFor("padding")}
                  />
                  <NumericSliderProperty
                    name="Line Length"
                    value={graphSettings.legend.lineLength}
                    min={1}
                    max={100}
                    step={1}
                    onChange={handleLegendChangeFor("lineLength")}
                  />
                  <ColorProperty
                    name="Border Color"
                    value={graphSettings.legend.borderColor}
                    onChange={handleLegendChangeFor("borderColor")}
                  />
                  <NumericSliderProperty
                    name="Border Thickness"
                    value={graphSettings.legend.borderThickness}
                    min={0}
                    max={25}
                    step={0.5}
                    onChange={handleLegendChangeFor("borderThickness")}
                  />
                </>
              )}
          </PropertyList>
        </PropertyAccordionItem>
      </PropertyAccordion>
    </div>
  );
};

export default PlotSettingsPanel;
