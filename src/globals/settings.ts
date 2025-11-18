// This is distinct from the global settings because it only contains settings
// specific to the current model. So it won't contain things like the UI theme,
// but it will contain things like the plot background color.

import { atom } from "jotai";

import { type Palette } from "@/features/colors";
import { type LineStyle } from "@/features/lineStyle";

import type {
  ParameterScanResult,
  TimeCourseParameters,
} from "@/features/simulation/Simulator";

/** Time course parameters that are editable by the user manually. */
export type EditableTimeCourseParameters = Omit<
  TimeCourseParameters,
  "includedVariables" | "resetInitialConditions"
>;

export interface ParameterScanOptions {
  mode: ParameterScanResult["mode"];
  varyingParameter: string | null | undefined;
  timeCourseParameters: EditableTimeCourseParameters;

  // range properties
  min: number;
  max: number;
  numberOfValues: number;
  useLogarithmicDistribution: boolean;

  // list properties
  useNumberList: boolean;
  numberList: string;
}

export interface AxisSettings {
  includeTitle: boolean;
  title: string;
  color: string;
}

export interface GridSettings {
  enabled: {
    x: boolean;
    y: boolean;
  };
  xColor: string;
  yColor: string;
  xWidth: number;
  yWidth: number;
  numXGrids: number;
  numYGrids: number;
}

export interface LegendSettings {
  visible: boolean;
  isFloating: boolean;

  // Floating only
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  borderThickness: number;
  padding: number;
  lineLength: number;
}

export interface GraphSettings {
  backgroundColor: string;
  drawingAreaColor: string;

  includeTitle: boolean;
  title: string;
  titleColor: string;

  includeBorder: boolean;
  borderColor: string;
  borderThickness: number;

  globalWidth: number;

  isAutoscaledX: boolean;
  minX: number;
  maxX: number;

  isAutoscaledY: boolean;
  minY: number;
  maxY: number;

  margin: number;

  xAxis: AxisSettings;
  yAxis: AxisSettings;

  majorGrid: GridSettings;
  minorGrid: GridSettings;

  legend: LegendSettings;
}

export interface VariableSettings {
  displayName: string;
  visible: boolean;
  color: string;
  width: number;
  lineStyle: LineStyle;
}

export const nameAtom = atom("Starter Model");
export const paletteAtom = atom<Palette>("Custom");
export const independentVariableAtom = atom<string | null>(null);

// note that variable settings will always be a superset of
// variables because the settings are retained even if the
// variables are no longer in the model.
export const variableSettingssAtom = atom<{ [id: string]: VariableSettings }>(
  {},
);

/**
 * Get variable settings for variable with the given name.
 * If not found, uses fallback settings.
 */
export const getVariableSettingsFrom = (
  variableSettingss: Record<string, VariableSettings>,
  name: string,
): VariableSettings => {
  return (
    variableSettingss[name] ?? {
      displayName: name,
      color: "#777",
      lineStyle: "solid",
      visible: true,
      width: 2.5,
    }
  );
};

export const defaultTimeCourseParameters: EditableTimeCourseParameters = {
  startTime: 0,
  endTime: 20,
  numberOfPoints: 200,
};
export const timeCourseParametersAtom = atom(defaultTimeCourseParameters);

export const defaultParameterScanOptions: ParameterScanOptions = {
  mode: "timeCourse",
  varyingParameter: null,
  timeCourseParameters: {
    startTime: 0,
    endTime: 10,
    numberOfPoints: 100,
  },

  min: 0.1,
  max: 1,
  numberOfValues: 16,
  useLogarithmicDistribution: false,

  useNumberList: false,
  numberList: "1 2 3 4 5",
};
export const parameterScanOptionsAtom = atom(defaultParameterScanOptions);

export const defaultGraphSettings: GraphSettings = {
  backgroundColor: "#ffffff",
  drawingAreaColor: "#f1e7f4",

  includeTitle: true,
  title: "Transition of substances in chemical reaction",
  titleColor: "#000000",

  includeBorder: true,
  borderColor: "#000000",
  borderThickness: 0.5,

  globalWidth: 1,

  isAutoscaledX: true,
  minX: 0,
  maxX: 10,

  isAutoscaledY: true,
  minY: 0,
  maxY: 10,

  margin: 70,

  xAxis: {
    includeTitle: true,
    title: "", // empty means use placeholder
    color: "#000",
  },

  yAxis: {
    includeTitle: true,
    title: "", // empty means use placeholder
    color: "#000",
  },

  majorGrid: {
    enabled: { x: false, y: false },
    xColor: "#888",
    yColor: "#888",
    xWidth: 0.5,
    yWidth: 0.5,
    numXGrids: 4,
    numYGrids: 4,
  },

  minorGrid: {
    enabled: { x: false, y: false },
    xColor: "#888",
    yColor: "#888",
    xWidth: 0.5,
    yWidth: 0.5,
    numXGrids: 4,
    numYGrids: 4,
  },

  legend: {
    visible: true,
    isFloating: true,

    textColor: "#000",
    backgroundColor: "#fff",
    borderColor: "#000",
    borderThickness: 1,
    padding: 15,
    lineLength: 50,
  },
};

export const graphSettingsAtom = atom(defaultGraphSettings);
