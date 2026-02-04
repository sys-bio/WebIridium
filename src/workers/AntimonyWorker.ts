/* eslint-disable */
// @ts-nocheck

import LibAntimonyWasm from "@/vendor/libantimony.wasm?url";
import libantimony from "@/vendor/libantimony.js";
import AntimonyWrapper from "@/vendor/antimony_wrap";
import wrapActionHandler from "./wrapActionHandler";

let antimony = null;

let loadedPromise = null;
const loadLibraries = () => {
  if (loadedPromise) {
    return loadedPromise;
  }

  // override the libantimony.wasm import
  const locateFile = (name: string, root: string) => {
    // special-case node for benchmarks
    const isNode = typeof process === "object" && !process.browser;
    if (name.endsWith(".wasm")) {
      return isNode ? "src/vendor/libantimony.wasm" : LibAntimonyWasm;
    }
    return root + name;
  };

  loadedPromise = libantimony({ locateFile })
    .then((module) => (antimony = new AntimonyWrapper(module)))
    // if the load fails, reset the promise and try again next time
    .catch(() => (loadedPromise = null));

  return loadedPromise;
};

const handleAction = async (action) => {
  await loadLibraries();

  switch (action.type) {
    case "convertSbmlToAntimony": {
      const { sbml } = action.payload;

      const antimonyConversion = antimony.convertSBMLToAntimony(sbml);
      // TODO: notify user about these warnings
      if (antimonyConversion.getWarnings()) {
        console.warn(antimonyConversion.getWarnings());
      }
      if (!antimonyConversion.isSuccess()) {
        throw new Error(antimonyConversion.getResult());
      }

      return {
        id: action.id,
        data: antimonyConversion.getResult(),
      };
    }

    case "convertAntimonyToSbml": {
      const { antimony: code } = action.payload;

      const sbmlConversion = antimony.convertAntimonyToSBML(code);
      // TODO: notify user about these warnings
      if (sbmlConversion.getWarnings()) {
        console.warn(antimonyConversion.getWarnings());
      }
      if (!sbmlConversion.isSuccess()) {
        throw new Error(sbmlConversion.getResult());
      }

      return {
        id: action.id,
        data: sbmlConversion.getResult(),
      };
    }

    default:
      throw new Error(`invalid action type: ${action.type}`);
  }
};

self.onmessage = wrapActionHandler(self, handleAction);
