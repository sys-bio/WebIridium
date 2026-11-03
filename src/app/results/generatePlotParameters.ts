import type { ECBasicOption } from "echarts/types/dist/shared";
import type { ScatterSeriesOption } from "echarts/types/src/chart/scatter/ScatterSeries.js";
import type { LineSeriesOption } from "echarts/types/src/chart/line/LineSeries.js";

import type { SimulationResult } from "@/features/simulation/Simulator";
import { getVariableSettingsFrom } from "@/globals/model";
import { type VariableSettings } from "@/globals/settings";
import type { GraphSettings } from "@/features/savedData";
import type { Dataset } from "@/globals/overlays";

import type { LegendDataItem } from "./FloatingLegend";
import { getColumnsFromResult } from "./getColumnsFromResult";
import { getParameterScanTitle } from "./getParameterScanTitle";
import {
  getDefaultParameterScanColor,
  getPaletteColor,
  type Palette,
} from "@/features/colors";
import { DASH_ARRAYS } from "@/features/lineStyle";

// how many items you need before rotating x-axis labels by 45 degrees
const X_AXIS_LABEL_ROTATE45_MIN = 12;
const X_AXIS_LABEL_ROTATE90_MIN = 20;

const PADDING = 50; // hard-coded but whatever
const MIN_RANGE = 1e-12; // Minimum range to display on auto-scale. Should be small enough

const calculatePlotBounds = (...values: number[][]): [number, number] => {
  const flat = values.flat();
  const min = flat.reduce((acc, current) => Math.min(acc, current), Infinity);
  const max = flat.reduce((acc, current) => Math.max(acc, current), -Infinity);

  if (min === Infinity || max === -Infinity) {
    return [0, 10];
  } else if (min == max) {
    return [min, min + 10];
  }

  return [min, max];
};

/** Calculates the plot bounds but with nice numbers */
export const calculatePlotBoundsNice = (
  ticks: number,
  ...values: number[][]
): [number, number] => {
  const flat = values.flat();
  const min = flat.reduce((acc, current) => Math.min(acc, current), Infinity);
  const max = flat.reduce((acc, current) => Math.max(acc, current), -Infinity);

  if (min === Infinity || max === -Infinity) {
    return [0, 10];
  }

  const range = Math.max(MIN_RANGE, max - min);
  const targetStepSize = range / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(targetStepSize));
  let magnitudeMsd = Math.round(targetStepSize / magnitude);
  if (magnitudeMsd > 5) magnitudeMsd = 10;
  else if (magnitudeMsd > 4) magnitudeMsd = 5;
  else if (magnitudeMsd > 2) magnitudeMsd = 4;
  else if (magnitudeMsd > 1) magnitudeMsd = 2;
  const stepSize = magnitudeMsd * magnitude;

  return [
    Math.floor(min / stepSize) * stepSize,
    Math.ceil((min + range) / stepSize) * stepSize,
  ];
};

/**
 * Same as (0...n).map(callback)
 */
const mapCount = <T>(count: number, callback: (n: number) => T): T[] => {
  const arr = Array<T>(count);
  for (let i = 0; i < count; i++) {
    arr[i] = callback(i);
  }
  return arr;
};

const formatWithMaxDecimals = (n: number, maxDecimals: number): string => {
  return (Math.floor(n * 10 ** maxDecimals) / 10 ** maxDecimals).toString();
};

export const generatePlotParameters = (
  result: SimulationResult,
  graphSettings: GraphSettings,
  variableSettingss: Record<string, VariableSettings>,
  timeCourseIndependentVariable: string | null,
  scanIndependentVariable: string,
  palette: Palette,
  xAxisTitle: string,
  yAxisTitle: string,
  datasets: Dataset[],
): {
  plotOptions: ECBasicOption;
  legendData: LegendDataItem[];
} => {
  const {
    backgroundColor,
    drawingAreaColor,
    includeTitle,
    title,
    titleColor,
    includeBorder,
    borderColor,
    borderThickness,
    isAutoscaledX,
    minX,
    maxX,
    isAutoscaledY,
    minY,
    maxY,
    xAxis,
    yAxis,
    majorGrid,
    minorGrid,
    legend: legendSettings,
  } = graphSettings;

  const [columns, independentVariableName] = getColumnsFromResult(
    result,
    timeCourseIndependentVariable,
    scanIndependentVariable,
  );

  const series: (LineSeriesOption | ScatterSeriesOption)[] = [];
  const legendData: LegendDataItem[] = [];
  // note that independent variable column might be null for time course if data was not collected for it
  const independentVariableColumn = columns.find(
    (c) => c.variableName === independentVariableName,
  );
  const parameterSettings =
    result.type === "parameterScan"
      ? getVariableSettingsFrom(variableSettingss, result.parameter)
      : null;

  if (independentVariableColumn) {
    for (const {
      variableName,
      values,
      parameterValue,
      scanPercent,
    } of columns) {
      if (variableName === independentVariableName) continue;

      const settings = getVariableSettingsFrom(variableSettingss, variableName);
      if (!settings.visible) continue;
      let finalColor: string = "red";
      if (palette === "Custom") {
        if (result.type === "parameterScan" && result.mode === "timeCourse") {
          finalColor = getDefaultParameterScanColor(
            settings.color,
            scanPercent!,
          );
        } else {
          finalColor = settings.color;
        }
      } // otherwise the color will get overwritten later

      const title =
        parameterValue !== undefined
          ? getParameterScanTitle(
              settings.displayName,
              parameterSettings!.displayName,
              parameterValue,
            )
          : settings.displayName;

      series.push({
        name: title,
        data: values.map((v, i) => [independentVariableColumn.values[i], v]),
        type: "line",
        lineStyle: {
          width: settings.width * graphSettings.globalWidth,
          color: finalColor,
          type: DASH_ARRAYS[settings.lineStyle],
        },
        itemStyle: {
          color: finalColor,
          opacity: 0,
        },
      } satisfies LineSeriesOption);

      legendData.push({
        title,
        color: finalColor,
        dash: settings.lineStyle,
      });
    }
  }

  if (palette !== "Custom") {
    for (const [i, data] of series.entries()) {
      const color = getPaletteColor(palette, i / (series.length - 1));
      (data as LineSeriesOption).lineStyle!.color = color;
      (data as LineSeriesOption).itemStyle!.color = color;
    }

    for (const [i, data] of legendData.entries()) {
      data.color = getPaletteColor(palette, i / (series.length - 1));
    }
  }

  // Dataset overlays

  for (const dataset of datasets) {
    if (!dataset.enabled) continue;

    const datasetIndependentVariableColumn = dataset.columns.find(
      (c) => c.title === dataset.independentVariableName,
    );
    if (!datasetIndependentVariableColumn) continue;

    for (const column of dataset.columns) {
      if (column.title === datasetIndependentVariableColumn.title) continue;

      const datasetVariable = dataset.variables[column.title];
      if (!datasetVariable.visible) continue;

      series.push({
        type: "scatter",
        name: datasetVariable.displayName,
        symbolSize: dataset.size,
        color: datasetVariable.color,
        symbol: datasetVariable.marker,
        data: column.values.map((v, i) => [
          datasetIndependentVariableColumn.values[i],
          v,
        ]),
      });
    }
  }

  // Other settings

  const [rangeMinX, rangeMaxX] =
    isAutoscaledX && independentVariableColumn
      ? calculatePlotBounds(
          independentVariableColumn.values,
          ...datasets
            .filter((d) => d.enabled)
            .map(
              (d) =>
                d.columns.find((c) => c.title === d.independentVariableName)!
                  .values,
            ),
        )
      : [minX, maxX];
  const [rangeMinY, rangeMaxY] = isAutoscaledY
    ? calculatePlotBoundsNice(
        majorGrid.numYGrids,
        columns
          .filter(
            (c) =>
              c.variableName !== independentVariableName &&
              getVariableSettingsFrom(variableSettingss, c.variableName)
                .visible,
          )
          .map((c) => c.values)
          .flat(),
        ...datasets
          .filter((d) => d.enabled)
          .map((d) =>
            d.columns
              .filter((c) => c.title !== d.independentVariableName)
              .flatMap((d) => d.values),
          ),
      )
    : [minY, maxY];

  const axisLabelMaxDecimals =
    rangeMaxY - rangeMinY < 0.05
      ? Math.abs(
          Math.floor(Math.log10(Math.max(MIN_RANGE, rangeMaxY - rangeMinY))),
        ) + 2
      : 2;
  console.log(axisLabelMaxDecimals, rangeMinY, rangeMaxY);
  const axisLabelFormatter = (value: number): string => {
    return formatWithMaxDecimals(value, axisLabelMaxDecimals);
  };

  const xMajorTickInterval = (rangeMaxX - rangeMinX) / majorGrid.numXGrids;
  const xMajorTicks = mapCount(
    majorGrid.numXGrids + 1,
    (n) => rangeMinX + xMajorTickInterval * n,
  );

  const yMajorTickInterval = (rangeMaxY - rangeMinY) / majorGrid.numYGrids;
  const yMajorTicks = mapCount(
    majorGrid.numYGrids + 1,
    (n) => rangeMinY + yMajorTickInterval * n,
  );

  const grid: Record<string, unknown> = {
    show: true,
    color: drawingAreaColor,
    backgroundColor: drawingAreaColor,
    borderColor: borderColor,
    borderWidth: includeBorder ? borderThickness : 0,
    containLabel: true,
    top: PADDING,
    left: PADDING,
    right: PADDING,
    bottom: PADDING,
  };

  if (!legendSettings.isFloating && legendSettings.visible) {
    const approximateLegendWidth = legendSettings.isFloating
      ? 0
      : Math.min(
          200,
          Math.max(...series.map((s) => (s.name as string).length * 5.5)) + 66,
        );
    grid.right = approximateLegendWidth;
  }

  return {
    legendData,
    plotOptions: {
      grid: grid,
      title: {
        show: includeTitle,
        text: title,
        top: 10,
        left: "center",
        textStyle: {
          fontWeight: "normal",
          color: titleColor,
        },
      },
      legend: {
        show: !legendSettings.isFloating && legendSettings.visible,
        type: "scroll",
        orient: "vertical",
        top: "center",
        right: 0,
        selectedMode: false,
      },
      tooltip: {
        trigger: "item",
        formatter: (params: { seriesName: string; value: [number, number] }) =>
          `${params.seriesName} (${formatWithMaxDecimals(params.value[0], 6)}, ${formatWithMaxDecimals(params.value[1], 6)})`,
        padding: 4,
        borderWidth: 2,
        textStyle: {
          fontSize: 12,
        },
      },
      xAxis: {
        type: "value",
        name: xAxis.includeTitle ? xAxisTitle : "",
        nameLocation: "center",
        nameGap: 40,
        nameTextStyle: {
          fontSize: 16,
          color: xAxis.color,
        },
        min: rangeMinX,
        max: rangeMaxX,
        splitLine: {
          show: majorGrid.enabled.x,
          lineStyle: {
            width: majorGrid.xWidth,
            color: majorGrid.xColor,
          },
        },
        axisTick: {
          show: majorGrid.enabled.x,
          customValues: xMajorTicks,
        },
        axisLabel: {
          customValues: xMajorTicks,
          formatter: axisLabelFormatter,
          rotate:
            majorGrid.numXGrids >= X_AXIS_LABEL_ROTATE90_MIN
              ? 90
              : majorGrid.numXGrids >= X_AXIS_LABEL_ROTATE45_MIN
                ? 45
                : 0,
          color: xAxis.color,
        },
        axisLine: {
          lineStyle: {
            color: xAxis.color,
          },
        },
        minorTick: {
          show: minorGrid.enabled.x,
          splitNumber: minorGrid.numXGrids + 1,
        },
        minorSplitLine: {
          show: minorGrid.enabled.x,
          lineStyle: {
            width: minorGrid.xWidth,
            color: minorGrid.xColor,
          },
        },
      },
      yAxis: {
        type: "value",
        name: yAxis.includeTitle ? yAxisTitle : "",
        nameLocation: "center",
        nameGap: 40,
        nameTextStyle: {
          fontSize: 16,
          color: yAxis.color,
        },
        min: rangeMinY,
        max: rangeMaxY,
        splitLine: {
          show: majorGrid.enabled.y,
          lineStyle: {
            width: majorGrid.yWidth,
            color: majorGrid.yColor,
          },
        },
        axisTick: {
          show: majorGrid.enabled.y,
          customValues: yMajorTicks,
        },
        axisLabel: {
          customValues: yMajorTicks,
          formatter: axisLabelFormatter,
          color: yAxis.color,
        },
        axisLine: {
          lineStyle: {
            color: yAxis.color,
          },
        },
        minorTick: {
          show: minorGrid.enabled.y,
          splitNumber: minorGrid.numYGrids + 1,
        },
        minorSplitLine: {
          show: minorGrid.enabled.y,
          lineStyle: {
            width: minorGrid.yWidth,
            color: minorGrid.yColor,
          },
        },
      },
      series: series,
      animation: false,
      backgroundColor: backgroundColor,
    },
  };
};
