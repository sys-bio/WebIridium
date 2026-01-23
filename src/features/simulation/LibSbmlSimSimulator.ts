import {
  Simulator,
  type TimeCourseResult,
  type SteadyStateResult,
  type Variable,
  type ComputeSteadyStateOptions,
  type SimulateTimeCourseOptions,
} from "./Simulator";
import { WorkerPool } from "@/features/taskPool";
import { createWorker } from "@/features/workers";

interface LibSbmlSimTimeCourseResult {
  columns: {
    title: string;
    values: number[];
  }[];
}

export class LibSbmlSimSimulator extends Simulator {
  defaultIndependentVariableName = "time";
  scanIndependentVariableName = "time";

  capabilities = {
    canRunSteadyState: false,
  };

  #workerPool: WorkerPool;

  constructor() {
    super();
    this.#workerPool = new WorkerPool(() => createWorker("libsbmlsim"), {
      maxWorkers: 4,
      hasOrderedResults: true,
    });
  }

  async simulateTimeCourse(
    antimonyCode: string,
    {
      parameters,
      variableValues,
      parameterScanOptions,
    }: SimulateTimeCourseOptions,
    abortSignal?: AbortSignal,
  ): Promise<TimeCourseResult> {
    const result = (await this.#workerPool.runTask(
      "timeCourse",
      {
        parameters: {
          ...parameters,
          includedVariables: parameters.includedVariables.map((v) => v.name),
        },
        variableValues,
        parameterScanOptions,
      },
      antimonyCode,
      abortSignal,
    )) as LibSbmlSimTimeCourseResult;

    return {
      type: "timeCourse",
      columns: result.columns,
    };
  }

  computeSteadyState(
    _antimonyCode: string,
    _params: ComputeSteadyStateOptions,
    _abortSignal?: AbortSignal,
  ): Promise<SteadyStateResult> {
    return Promise.resolve({
      type: "steadyState",
      value: 0,
      concentrations: [],
      eigenValues: [],
      jacobian: {
        columns: [],
        rows: [],
        values: [],
      },
      concentrationControl: {
        columns: [],
        rows: [],
        values: [],
      },
      fluxControl: {
        columns: [],
        rows: [],
        values: [],
      },
      elasticities: {
        columns: [],
        rows: [],
        values: [],
      },
    });
  }

  async loadModel(
    antimonyCode: string,
    abortSignal?: AbortSignal,
  ): Promise<Variable[]> {
    const result = (await this.#workerPool.runTask(
      "loadModel",
      null,
      antimonyCode,
      abortSignal,
    )) as {
      floatingSpecies: Record<string, number>;
      boundarySpecies: Record<string, number>;
      parameters: Record<string, number>;
    };

    const variables: Variable[] = [];

    variables.push({
      type: "normal",
      defaultDisplayName: "Time",
      name: "time",
      category: "Time",
    });

    for (const [specie, value] of Object.entries(result.floatingSpecies)) {
      variables.push({
        type: "settable",
        defaultDisplayName: specie,
        name: specie,
        category: "Floating Species",

        setName: specie,
        defaultValue: value,
      });
    }

    for (const [specie, value] of Object.entries(result.boundarySpecies)) {
      variables.push({
        type: "settable",
        defaultDisplayName: specie,
        name: specie,
        category: "Boundary Species",

        setName: specie,
        defaultValue: value,
      });
    }

    for (const [parameter, value] of Object.entries(result.parameters)) {
      variables.push({
        type: "settable",
        defaultDisplayName: parameter,
        name: parameter,
        category: "Parameters",

        setName: parameter,
        defaultValue: value,
      });
    }

    return variables;
  }
}
