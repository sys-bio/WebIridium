import { useRef, useEffect } from "react";
import { useAtomValue } from "jotai";
import * as echarts from "echarts/core";
import { type ECharts } from "echarts/core";

import FloatingLegend from "../FloatingLegend";

import type { SimulationResult } from "@/features/simulation/Simulator";
import { variableSettingssAtom } from "@/globals/model";
import {
  graphSettingsAtom,
  independentVariableAtom,
  paletteAtom,
} from "@/globals/settings";
import { useScanIndependentVariable } from "@/features/simulation/useScanIndependentVariable";
import { generatePlotParameters } from "../generatePlotParameters";

import { xAxisTitleAtom, yAxisTitleAtom } from "@/globals/plot";
import type { Dataset } from "@/globals/overlays";

export interface SeriesLineChartProps {
  result: SimulationResult;
  datasets: Dataset[];
  width: number;
  height: number;
}

const SeriesLineChart = ({
  result,
  datasets,
  width,
  height,
}: SeriesLineChartProps) => {
  const variableSettingss = useAtomValue(variableSettingssAtom);
  const palette = useAtomValue(paletteAtom);
  const scanIndependentVariable = useScanIndependentVariable();
  const timeCourseIndependentVariable = useAtomValue(independentVariableAtom);
  const graphSettings = useAtomValue(graphSettingsAtom);
  const legendSettings = graphSettings.legend;
  const xAxisTitle = useAtomValue(xAxisTitleAtom);
  const yAxisTitle = useAtomValue(yAxisTitleAtom);

  const plotContainerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<ECharts | null>(null);

  const { plotOptions, legendData } = generatePlotParameters(
    result,
    graphSettings,
    variableSettingss,
    timeCourseIndependentVariable,
    scanIndependentVariable,
    palette,
    xAxisTitle,
    yAxisTitle,
    datasets,
  );

  useEffect(() => {
    if (!plotRef.current) {
      plotRef.current = echarts.init(plotContainerRef.current);
    }

    // might be null in a test
    plotRef.current?.resize();
  }, [width, height]);

  useEffect(() => {
    if (!plotRef.current) {
      plotRef.current = echarts.init(plotContainerRef.current);
    }

    // might be null in a test
    plotRef.current?.clear();
    plotRef.current?.setOption(plotOptions, true);
  }, [plotOptions]);

  return (
    <>
      {legendSettings.visible &&
        legendSettings.isFloating &&
        legendData.length > 0 && (
          <FloatingLegend settings={legendSettings} data={legendData} />
        )}
      <div
        ref={plotContainerRef}
        data-testid="results-plot"
        style={{
          width: Number.isNaN(width) ? 0 : width,
          height: Number.isNaN(height) ? 0 : height,
        }}
      />
    </>
  );
};

export default SeriesLineChart;
