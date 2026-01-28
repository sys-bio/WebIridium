/* eslint-disable */
// @ts-nocheck

import LibSbmlSimWasm from "@/vendor/libsbmlsim.wasm?url";
import LibAntimonyWasm from "@/vendor/libantimony.wasm?url";
import libsbmlsim from "@/vendor/libsbmlsim.js";
import libantimony from "@/vendor/libantimony.js";
import AntimonyWrapper from "@/vendor/antimony_wrap.js";
import { type Simulator } from "@/vendor/libsbmlsim.d.ts";

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
    if (name.endsWith(".wasm")) {
      if (name.includes("antimony")) {
        return LibAntimonyWasm;
      } else {
        return LibSbmlSimWasm;
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
const handleMessage = async (e) => {
  await loadLibraries();

  const action = e.data;

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

      self.postMessage({
        id: action.id,
        data: { columns },
      });
      break;
    }

    case "steadyState": {
      break;
    }

    case "loadModel": {
      self.postMessage({
        id: action.id,
        data: {
          floatingSpecies: cachedFloatingSpecies,
          boundarySpecies: cachedBoundarySpecies,
          parameters: cachedParameters,
        },
      });
      break;
    }

    default:
      throw new Error(`invalid action type: ${action.type}`);
  }
};

self.onmessage = async (e) => {
  // when the messgae handler fails, its error must be manually propagated
  // since it will get eaten up by the promise otherwise
  try {
    await handleMessage(e);
  } catch (err) {
    console.error(err, err?.stack);
    self.postMessage({ id: e.data.id, errorMessage: err.message });
  }
};
