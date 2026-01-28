import type { ModelInfo, SimResult } from "@/vendor/copasi";
import {
  Simulator,
  type SteadyStateResult,
  type TimeCourseResult,
  type Variable,
  type SimulateTimeCourseOptions,
  type ComputeSteadyStateOptions,
} from "./Simulator";
import { WorkerPool } from "@/features/taskPool";
import { createWorker } from "@/features/workers.ts";

export class CopasiSimulator extends Simulator {
  defaultIndependentVariableName = "Time";
  scanIndependentVariableName = "Time";

  capabilities = {
    canRunSteadyState: true,
  };

  #workerPool: WorkerPool;

  constructor() {
    super();
    this.#workerPool = new WorkerPool(() => createWorker("copasi"), {
      maxWorkers: 3,
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
          selectionList: parameters.includedVariables.map((v) => v.name),
        },
        variableValues,
        ...parameterScanOptions,
      },
      antimonyCode,
      abortSignal,
    )) as SimResult;

    return {
      type: "timeCourse",
      columns: result.titles.map((title, index) => ({
        title,
        values: result.columns[index],
      })),
    };
  }

  async computeSteadyState(
    antimonyCode: string,
    {
      parameters,
      variableValues,
      parameterScanOptions,
    }: ComputeSteadyStateOptions,
    abortSignal?: AbortSignal,
  ): Promise<SteadyStateResult> {
    const result = (await this.#workerPool.runTask(
      "steadyState",
      {
        parameters,
        variableValues,
        ...parameterScanOptions,
      },
      antimonyCode,
      abortSignal,
    )) as object;

    return { type: "steadyState", ...result } as SteadyStateResult;
  }

  async loadModel(
    antimonyCode: string,
    abortSignal?: AbortSignal,
  ): Promise<Variable[]> {
    const { modelInfo, boundarySpeciesNames, reactionIds } =
      (await this.#workerPool.runTask(
        "loadModel",
        null,
        antimonyCode,
        abortSignal,
      )) as {
        modelInfo: ModelInfo;
        boundarySpeciesNames: string[];
        reactionIds: string[];
      };
    const boundarySpeciesSet = new Set(boundarySpeciesNames);

    const variables: Variable[] = [];

    variables.push({
      type: "normal",
      defaultDisplayName: "Time",
      name: "Time",
      category: "Time",
    });

    for (const specie of modelInfo.species) {
      if (boundarySpeciesSet.has(specie.name)) {
        variables.push({
          type: "settable",
          defaultDisplayName: specie.name,
          name: specie.id,
          category: "Boundary Species",

          setName: `[${specie.name}]_0`,
          defaultValue: specie.initial_concentration,
        });
      } else {
        variables.push({
          type: "normal",
          defaultDisplayName: `${specie.name}'`,
          // COPASI wants name, not id for this. Not sure why.
          name: `${specie.name}.Rate`,
          category: "Rate of Changes",
        });

        variables.push({
          type: "settable",
          defaultDisplayName: specie.name,
          name: specie.id,
          category: "Floating Species",

          setName: `[${specie.name}]_0`,
          defaultValue: specie.initial_concentration,
        });
      }
    }

    for (const param of modelInfo.global_parameters) {
      variables.push({
        type: "settable",
        defaultDisplayName: param.name,
        name: param.id,
        category: param.type === "ode" ? "ODEs" : "Parameters",

        setName: param.id,
        defaultValue: param.initial_value,
      });
    }

    for (const reactionId of reactionIds) {
      variables.push({
        type: "normal",
        defaultDisplayName: reactionId,
        name: reactionId,
        category: "Reaction Rates",
      });
    }

    return variables;
  }
}
