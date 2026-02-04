/* eslint-disable */
// @ts-nocheck

import LibSbmlSimWasm from "@/vendor/libsbmlsim.wasm?url";
import LibAntimonyWasm from "@/vendor/libantimony.wasm?url";
import libsbmlsim from "@/vendor/libsbmlsim.js";
import libantimony from "@/vendor/libantimony.js";
import AntimonyWrapper from "@/vendor/antimony_wrap.js";
import { type Simulator } from "@/vendor/libsbmlsim.d.ts";
import wrapActionHandler from "./wrapActionHandler";

let simulator: Simulator = null;
let antimony = null;

/**
 * Converts a emscripten map to a record.
 */
const mapToRecord = (map) => {
  let record = {};
  const keys = map.keys();
  for (let i = 0; i < keys.size(); i++) {
    const key = keys.get(i);
    record[key] = map.get(key);
  }
  return record;
};

/**
 * Converts a emscripten vector to an array.
 */
const vectorToArray = (vector) => {
  let array = [];
  for (let i = 0; i < vector.size(); i++) {
    array.push(vector.get(i));
  }
  return array;
};

let loadedPromise = null;
const loadLibraries = () => {
  if (loadedPromise) {
    return loadedPromise;
  }

  // override the libsbmlsim.wasm import
  const locateFile = (name: string, root: string) => {
    // special-case node for benchmarks
    const isNode = typeof process === "object" && !process.browser;
    if (name.endsWith(".wasm")) {
      if (name.includes("antimony")) {
        return isNode ? "src/vendor/libantimony.wasm" : LibAntimonyWasm;
      } else {
        return isNode ? "src/vendor/libsbmlsim.wasm" : LibSbmlSimWasm;
      }
    }
    return root + name;
  };

  loadedPromise = Promise.all([
    libsbmlsim({ locateFile }).then(
      (module) => (simulator = new module.Simulator()),
    ),
    libantimony({ locateFile }).then(
      (module) => (antimony = new AntimonyWrapper(module)),
    ),
    // if the load fails, reset the promise and try again next time
  ]).catch(() => (loadedPromise = null));

  return loadedPromise;
};

let cachedFloatingSpecies = null;
let cachedBoundarySpecies = null;
let cachedParameters = null;
const handleAction = async (action) => {
  await loadLibraries();

  // Update loaded model if it changed
  const antimonyCode = action.internalState;
  if (antimonyCode) {
    const sbmlConversion = antimony.convertAntimonyToSBML(antimonyCode);
    // TODO: notify user about these warnings
    if (sbmlConversion.getWarnings()) {
      console.warn(sbmlConversion.getWarnings());
    }
    if (!sbmlConversion.isSuccess()) {
      throw new Error(sbmlConversion.getResult());
    }

    const success = simulator.LoadSbml(sbmlConversion.getResult());
    if (!success) {
      throw new Error(simulator.GetLastError());
    }

    cachedFloatingSpecies = mapToRecord(simulator.GetFloatingSpecies());
    cachedBoundarySpecies = mapToRecord(simulator.GetBoundarySpecies());
    cachedParameters = mapToRecord(simulator.GetParameters());
  }

  switch (action.type) {
    case "timeCourse": {
      const { parameters, variableValues, parameterScanOptions } =
        action.payload;

      simulator.ResetVariables();
      for (const [name, value] of Object.entries(variableValues)) {
        simulator.SetVariable(name, value);
      }
      if (parameterScanOptions) {
        simulator.SetVariable(
          parameterScanOptions.varyingParameter,
          parameterScanOptions.varyingParameterValue,
        );
      }

      // TODO: make work with the start time
      const simulationResult = simulator.SimulateTimeCourse(
        parameters.endTime,
        parameters.numberOfPoints,
      );

      if (!simulationResult) {
        throw new Error(simulator.GetLastError());
      }

      const columns = [];
      for (let i = 0; i < simulationResult.columns.size(); i++) {
        const column = simulationResult.columns.get(i);
        if (parameters.includedVariables.includes(column.name)) {
          columns.push({
            title: column.name,
            values: vectorToArray(column.values),
          });
        }
      }

      simulationResult.delete();

      return {
        id: action.id,
        data: { columns },
      };
    }

    case "steadyState": {
      break;
    }

    case "loadModel": {
      return {
        id: action.id,
        data: {
          floatingSpecies: cachedFloatingSpecies,
          boundarySpecies: cachedBoundarySpecies,
          parameters: cachedParameters,
        },
      };
    }

    default:
      throw new Error(`invalid action type: ${action.type}`);
  }
};

self.onmessage = wrapActionHandler(self, handleAction);
