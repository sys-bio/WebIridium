import { atom, type Atom } from "jotai";
import { simulatorAtom } from "./simulator";

export type LeftPanel =
  | "Time Course"
  | "Steady State"
  | "Parameter Scan"
  | "History"
  | "Examples"
  | "Chat";

export type RightPanel = "Results";

export type VeryRightPanel = "Plot Settings" | "Overlays";

export type BottomPanel = "Sliders";

const DEFAULT_LEFT_PANEL: LeftPanel = "Time Course";

const _currentVeryRightPanelAtom = atom<VeryRightPanel | null>(null);
// used to restore the left panel after its closed by opening the very right panel (via Plot Settings as of july)
const _lastLeftPanelAtom = atom<LeftPanel | null>(DEFAULT_LEFT_PANEL);
const _currentLeftPanelAtom = atom<LeftPanel | null>(DEFAULT_LEFT_PANEL);
const _currentRightPanelAtom = atom<RightPanel | null>(null);

export const currentLeftPanelAtom = atom(
  (get) => {
    const chosen = get(_currentLeftPanelAtom);
    // The user might switch to something like libsbmlsimulator while still on the steady state panel.
    // Since libsbmlsim does not support steady state, have to fall back to the default panel.
    if (chosen && !get(availableLeftPanelsAtom).includes(chosen)) {
      return DEFAULT_LEFT_PANEL;
    } else {
      return chosen;
    }
  },
  (_, set, panel: LeftPanel | null) => {
    set(_lastLeftPanelAtom, panel);
    set(_currentLeftPanelAtom, panel);
  },
);

export const availableLeftPanelsAtom: Atom<LeftPanel[]> = atom((get) => {
  const simulator = get(simulatorAtom);
  const availableSimulationPanels: LeftPanel[] = ["Time Course"];
  if (simulator.capabilities.canRunSteadyState) {
    availableSimulationPanels.push("Steady State");
  }
  return availableSimulationPanels.concat([
    "Parameter Scan",
    "History",
    "Examples",
    "Chat",
  ]);
});

// also want to close the very right panel since it is bound to this one (b/c of Plot Settings as of july)
export const currentRightPanelAtom = atom(
  (get) => get(_currentRightPanelAtom),
  (get, set, panel: RightPanel | null) => {
    if (panel === null && get(currentVeryRightPanelAtom) !== null) {
      set(currentVeryRightPanelAtom, null);
    }
    set(_currentRightPanelAtom, panel);
  },
);

export const currentBottomPanelAtom = atom<BottomPanel | null>(null);

export const currentVeryRightPanelAtom = atom(
  (get) => get(_currentVeryRightPanelAtom),
  (get, set, panel: VeryRightPanel | null) => {
    if (panel === null) {
      // restore the left panel when closing
      set(_currentLeftPanelAtom, get(_lastLeftPanelAtom));
    } else {
      // close the left panel if it's visible to conserve space
      set(_currentLeftPanelAtom, null);
    }

    set(_currentVeryRightPanelAtom, panel);
  },
);
