/* eslint-disable */
// @ts-nocheck

import LibCopasiWasm from "@/vendor/copasijs.wasm?url";
import LibAntimonyWasm from "@/vendor/libantimony.wasm?url";
import createCpsModule from "@/vendor/copasijs.js";
import COPASI from "@/vendor/copasi.js";
import libantimony from "@/vendor/libantimony.js";
import AntimonyWrapper from "@/vendor/antimony_wrap.js";

let copasi = null;
let antimony = null;

let loadedPromise = null;
const loadLibraries = () => {
  if (loadedPromise) {
    return loadedPromise;
  }

  // override the wasm imports
  const locateFile = (name: string, root: string) => {
    if (name.endsWith(".wasm")) {
      if (name.includes("antimony")) {
        return LibAntimonyWasm;
      } else {
        return LibCopasiWasm;
      }
    }
    return root + name;
  };

  loadedPromise = Promise.all([
    createCpsModule({ locateFile }).then(
      (module) => (copasi = new COPASI(module)),
    ),
    libantimony({ locateFile }).then(
      (module) => (antimony = new AntimonyWrapper(module)),
    ),
    // if the load fails, reset the promise and try again next time
  ]).catch(() => (loadedPromise = null));

  return loadedPromise;
};

let cachedModelInfo = null;
let cachedBoundarySpeciesNames = null;
let cachedReactionIds = null;
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

    copasi.loadModel(sbmlConversion.getResult());
    cachedModelInfo = copasi.modelInfo;
    cachedBoundarySpeciesNames = copasi.boundarySpeciesNames;
    cachedReactionIds = copasi.reactionIds;
  }

  switch (action.type) {
    case "timeCourse": {
      const {
        parameters,
        variableValues,
        varyingParameter,
        varyingParameterValue,
      } = action.payload;

      if (parameters.resetInitialConditions) {
        copasi.resetAll();
      }

      // for parameter scan
      if (varyingParameter) {
        copasi.setValue(varyingParameter, varyingParameterValue);
      }

      for (const [name, value] of Object.entries(variableValues)) {
        if (name !== varyingParameter) {
          copasi.setValue(name, value);
        }
      }

      copasi.selectionList = parameters.selectionList;

      const result = copasi.simulateEx(
        parameters.startTime,
        parameters.endTime,
        parameters.numberOfPoints,
      );

      if (result.status === "error") {
        throw new Error(result.messages);
      }

      self.postMessage({
        id: action.id,
        data: result,
      });
      break;
    }

    case "steadyState": {
      const { variableValues, varyingParameter, varyingParameterValue } =
        action.payload;

      // I don't know what this is for, it is just copied from the original: https://github.com/sys-bio/SimBioUI/blob/9a71226dd47c914dc85d68b47b4731669bba313f/my-dropdown-app/src/App.js#L593
      const timeCourseParameters = {
        startTime: 0,
        endTime: 20,
        numPoints: 200,
      };

      if (varyingParameter) {
        copasi.setValue(varyingParameter, varyingParameterValue);
      }

      for (const [name, value] of Object.entries(variableValues)) {
        if (name !== varyingParameter) {
          copasi.setValue(name, value);
        }
      }

      // `resetAll` does not work with setValue + steadyState, idk why
      // copasi.resetAll();
      copasi.reset();

      copasi.timeCourseSettings = timeCourseParameters;

      const selectionList = cachedModelInfo?.species.map((s) => s.name) ?? [];
      copasi.selectionList = selectionList;

      const steadyStateValue = copasi.steadyState();
      copasi.computeMca(true);

      const selectedValues = copasi.selectedValues;
      const eigenValues = copasi.eigenValues2D;
      const jacobian = copasi.jacobian;
      const concentrationControl =
        copasi.getConcentrationControlCoefficients(true);
      const fluxControl = copasi.getFluxControlCoefficients(true);
      const elasticities = copasi.getElasticities(true);

      self.postMessage({
        id: action.id,
        data: {
          eigenValues,
          jacobian,
          concentrationControl,
          fluxControl,
          elasticities,
          value: steadyStateValue,
          concentrations: selectionList.map((name, i) => ({
            name: name,
            value: selectedValues[i],
          })),
        },
      });

      break;
    }

    case "loadModel": {
      self.postMessage({
        id: action.id,
        data: {
          modelInfo: cachedModelInfo,
          boundarySpeciesNames: cachedBoundarySpeciesNames,
          reactionIds: cachedReactionIds,
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
