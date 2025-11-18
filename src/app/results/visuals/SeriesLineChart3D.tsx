/**
 * This is used for time series and parameter scan
 */

import { useRef, useLayoutEffect, useEffect } from "react";
import { useAtomValue } from "jotai";
import * as echarts from "echarts/core";
import { type ECharts } from "echarts/core";

import styles from "./visuals.module.css";

import { getColumnsFromResult } from "../getColumnsFromResult";
import { getDefaultParameterScanColor } from "@/features/colors";
import { getParameterScanTitle } from "../getParameterScanTitle";
import { DASH_ARRAYS } from "@/features/lineStyle";

import type { SimulationResult } from "@/features/simulation/Simulator";
import {
  getVariableSettingsFrom,
  independentVariableAtom,
  variableSettingssAtom,
} from "@/globals/settings";
import { useScanIndependentVariable } from "@/features/simulation/useScanIndependentVariable";

// if it's too much, the labels get crowded
// just make them hover to see what the value is
const MAX_TITLES_TO_SHOW = 12;

export interface SeriesLineChart3DProps {
  result: SimulationResult;
}

const SeriesLineChart3D = ({ result }: SeriesLineChart3DProps) => {
  const timeCourseIndependentVariable = useAtomValue(independentVariableAtom);
  const scanIndependentVariable = useScanIndependentVariable();

  const variableSettingss = useAtomValue(variableSettingssAtom);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);

  // sychronize size
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.resize();
      }
    };

    updateSize();

    const observer = new ResizeObserver((entries) => {
      if (entries.length > 0) {
        updateSize();
      }
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [containerRef]);

  // sychronize data
  useEffect(() => {
    if (containerRef.current && !chartRef.current) {
      chartRef.current = echarts.init(containerRef.current);
    }

    const [columns, independentVariableName] = getColumnsFromResult(
      result,
      timeCourseIndependentVariable,
      scanIndependentVariable,
    );
    const independentVariableColumn = columns.find(
      (c) => c.variableName === independentVariableName,
    );
    const parameterSettings =
      result.type === "parameterScan"
        ? getVariableSettingsFrom(variableSettingss, result.parameter)
        : null;
    if (!independentVariableColumn) return;

    const series = [];
    const titles = [];

    for (const {
      variableName,
      values,
      parameterValue,
      scanPercent,
    } of columns) {
      if (variableName === independentVariableName) continue;

      const settings = getVariableSettingsFrom(variableSettingss, variableName);
      if (!settings.visible) continue;
      let finalColor: string = settings.color;
      if (result.type === "parameterScan" && result.mode === "timeCourse") {
        finalColor = getDefaultParameterScanColor(settings.color, scanPercent!);
      }

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
        data: values.map((v, i) => [
          independentVariableColumn.values[i],
          title,
          v,
        ]),
        type: "line3D",
        lineStyle: {
          width: 4 * settings.width,
          color: finalColor,
          type: DASH_ARRAYS[settings.lineStyle],
        },
        itemStyle: {
          color: finalColor,
          opacity: 0,
        },
      });

      titles.push(title);
    }

    chartRef.current?.clear();
    chartRef.current?.setOption(
      {
        title: {
          text: "Transition of substances in chemical reaction",
          left: "center",
          textStyle: {
            fontSize: 20,
            fontWeight: "normal",
          },
        },
        tooltip: {},
        animation: false,
        xAxis3D: {
          name: independentVariableName,
          type: "value",
          axisPointer: {
            show: false,
          },
        },
        yAxis3D: {
          name: "Variable",
          type: "category",
          data: titles,
          axisPointer: {
            show: false,
          },
          axisLabel: {
            show: titles.length <= MAX_TITLES_TO_SHOW,
            interval: 0,
          },
        },
        zAxis3D: {
          name: "Concentrations",
          type: "value",
          axisPointer: {
            show: false,
          },
        },
        grid3D: {
          viewControl: {
            projection: "orthogonal",
          },
        },
        series: series,
      },
      false,
    );
  }, [
    result,
    variableSettingss,
    scanIndependentVariable,
    timeCourseIndependentVariable,
  ]);

  return <div className={styles.seriesLineChart3D} ref={containerRef} />;
};

export default SeriesLineChart3D;
