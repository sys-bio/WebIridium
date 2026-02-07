/**
 * Atoms for the current simulator instance and its name.
 */

import { atom } from "jotai";

import { type Simulator } from "@/features/simulation/Simulator";
import { CopasiSimulator } from "@/features/simulation/CopasiSimulator";
import { LibSbmlSimSimulator } from "@/features/simulation/LibSbmlSimSimulator";
import { RoadrunnerServerSimulator } from "@/features/simulation/RoadrunnerServerSimulator";

import { editorContentAtom, updateEditorContentAtom } from "./model";
import { parameterScanOptionsAtom } from "./settings";

export const SIMULATOR_PRODUCERS: Record<string, () => Simulator> = {
  COPASI: () => new CopasiSimulator(),
  "RoadRunner (Server)": () => new RoadrunnerServerSimulator(),
  libsbmlsim: () => new LibSbmlSimSimulator(),
};
export const SIMULATOR_LIST = Object.keys(SIMULATOR_PRODUCERS);

export const getSimulatorName = (simulator: Simulator): string => {
  if (simulator instanceof CopasiSimulator) {
    return "COPASI";
  } else if (simulator instanceof RoadrunnerServerSimulator) {
    return "RoadRunner (Server)";
  } else {
    return "libsbmlsim";
  }
};

const _simulatorNameAtom = atom("COPASI");

export const simulatorAtom = atom((get) => {
  return SIMULATOR_PRODUCERS[get(_simulatorNameAtom)]();
});

export const updateSimulatorAtom = atom(null, (get, set, name: string) => {
  const currentSimulator = get(simulatorAtom);
  if (getSimulatorName(currentSimulator) !== name) {
    set(_simulatorNameAtom, name);

    // reset mode to time course, since some simulators don't support steady state
    set(parameterScanOptionsAtom, {
      ...get(parameterScanOptionsAtom),
      mode: "timeCourse",
    });

    // force model reload
    void set(updateEditorContentAtom, {
      content: get(editorContentAtom),
      skipDebounce: true,
    });
  }
});
