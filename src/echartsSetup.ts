import * as echarts from "echarts/core";
import { LineChart, ScatterChart } from "echarts/charts";
import { LabelLayout } from "echarts/features";
import { CanvasRenderer, SVGRenderer } from "echarts/renderers";

import { Line3DChart, Bar3DChart } from "echarts-gl/charts";
import { Grid3DComponent } from "echarts-gl/components";

import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  VisualMapComponent,
} from "echarts/components";

echarts.use([
  // Components
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  VisualMapComponent,
  // Chart types
  LineChart,
  ScatterChart,
  LabelLayout,
  // Renderers
  CanvasRenderer,
  SVGRenderer,
  // 3D Chart types
  Line3DChart,
  Bar3DChart,
  Grid3DComponent,
]);
