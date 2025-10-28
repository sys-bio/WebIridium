// eslint-disable-next-line
import "allotment/dist/style.css";

import { useEffect, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Allotment, LayoutPriority } from "allotment";

import styles from "./App.module.css";

import { setTheme, themeMediaQuery } from "@/features/theme";

import {
  currentLeftPanelAtom,
  currentBottomPanelAtom,
  currentVeryRightPanelAtom,
  currentRightPanelAtom,
  availableLeftPanelsAtom,
} from "@/globals/layout";
import { themeAtom, tryUpdateThemeIfAutomaticAtom } from "@/globals/appearance";
import { saveAtom } from "@/globals/saving";

import AppErrorWrapperPage from "./AppErrorWrapperPage";
import WorkspaceProvider from "./WorkspaceProvider";
import Sidebar from "./Sidebar";
import AppMenubar from "./AppMenubar";
import AppStatusBar from "./AppStatusBar";
import { ToastProvider } from "@/components/Toast";
import { TooltipProvider } from "@/components/Tooltip";

import TimeCoursePanel from "./simulation/TimeCoursePanel";
import ParameterScanPanel from "./simulation/ParameterScanPanel";
import SteadyStatePanel from "./simulation/SteadyStatePanel";
import OverlaysPanel from "./overlays/OverlaysPanel";

import HistoryPanel from "./HistoryPanel";
import ExamplesPanel from "./ExamplesPanel";

import EditorPanel from "./EditorPanel";
import SlidersPanel from "./sliders/SlidersPanel";

import ResultTabbedPanel from "./results/ResultsTabbedPanel";
import PlotSettingsPanel from "./PlotSettingsPanel";
import ChatPanel from "./ChatPanel";

const SAVE_INTERVAL = 60_000; // in ms

const getDefaultResultsPanelWidth = () => {
  if (window.matchMedia && window.matchMedia("(min-width: 2000px)").matches) {
    return 1000;
  } else {
    return 575;
  }
};

const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const didIntialLoadRef = useRef(false);
  return (
    <ToastProvider>
      <TooltipProvider>
        <WorkspaceProvider didInitialLoadRef={didIntialLoadRef}>
          {children}
        </WorkspaceProvider>
      </TooltipProvider>
    </ToastProvider>
  );
};

const AppContent = () => {
  const [currentLeftPanel, setCurrentLeftPanel] = useAtom(currentLeftPanelAtom);
  const [currentRightPanel, setCurrentRightPanel] = useAtom(
    currentRightPanelAtom,
  );
  const [currentBottomPanel, setCurrentBottomPanel] = useAtom(
    currentBottomPanelAtom,
  );
  const [currentVeryRightPanel, setCurrentVeryRightPanel] = useAtom(
    currentVeryRightPanelAtom,
  );

  const availableLeftPanels = useAtomValue(availableLeftPanelsAtom);

  return (
    <div className={styles.app}>
      <AppMenubar />

      <div className={styles.appMain}>
        <Sidebar
          panels={availableLeftPanels}
          currentPanel={currentLeftPanel}
          onPanelChange={setCurrentLeftPanel}
        />

        <div className={styles.allotmentContainer}>
          <Allotment>
            <Allotment.Pane
              minSize={290}
              preferredSize={290}
              visible={currentLeftPanel !== null}
            >
              <TimeCoursePanel visible={currentLeftPanel === "Time Course"} />
              <ParameterScanPanel
                visible={currentLeftPanel === "Parameter Scan"}
              />
              <SteadyStatePanel visible={currentLeftPanel === "Steady State"} />
              <HistoryPanel visible={currentLeftPanel === "History"} />
              <ExamplesPanel visible={currentLeftPanel === "Examples"} />
              <ChatPanel visible={currentLeftPanel === "Chat"} />
            </Allotment.Pane>

            <Allotment.Pane priority={LayoutPriority.High}>
              <Allotment vertical>
                <Allotment.Pane priority={LayoutPriority.High}>
                  <EditorPanel />
                </Allotment.Pane>

                <Allotment.Pane
                  visible={Boolean(currentBottomPanel)}
                  preferredSize={250}
                >
                  {currentBottomPanel === "Sliders" && (
                    <SlidersPanel onClose={() => setCurrentBottomPanel(null)} />
                  )}
                </Allotment.Pane>
              </Allotment>
            </Allotment.Pane>

            <Allotment.Pane
              visible={Boolean(currentRightPanel)}
              preferredSize={getDefaultResultsPanelWidth()}
            >
              {currentRightPanel === "Results" && (
                <ResultTabbedPanel onClose={() => setCurrentRightPanel(null)} />
              )}
            </Allotment.Pane>

            <Allotment.Pane
              visible={Boolean(currentVeryRightPanel)}
              preferredSize={450}
            >
              {currentVeryRightPanel === "Plot Settings" && (
                <PlotSettingsPanel
                  onClose={() => setCurrentVeryRightPanel(null)}
                />
              )}
              {currentVeryRightPanel === "Overlays" && (
                <OverlaysPanel onClose={() => setCurrentVeryRightPanel(null)} />
              )}
            </Allotment.Pane>
          </Allotment>
        </div>
      </div>

      <AppStatusBar />
    </div>
  );
};

const ThemeUpdater = () => {
  const tryUpdateThemeIfAutomatic = useSetAtom(tryUpdateThemeIfAutomaticAtom);
  const theme = useAtomValue(themeAtom);

  useEffect(() => {
    const handleChange = () => {
      tryUpdateThemeIfAutomatic();
    };

    themeMediaQuery.addEventListener("change", handleChange);

    return () => themeMediaQuery.removeEventListener("change", handleChange);
  }, [tryUpdateThemeIfAutomatic]);

  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  return null;
};

const DataSaver = () => {
  const save = useSetAtom(saveAtom);

  useEffect(() => {
    const id = setInterval(() => {
      void save();
    }, SAVE_INTERVAL);

    return () => clearInterval(id);
  }, [save]);

  useEffect(() => {
    const handleUnload = () => {
      void save();
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [save]);

  return null;
};

const App = () => {
  return (
    <AppErrorWrapperPage>
      <AppProvider>
        <ThemeUpdater />
        <DataSaver />
        <AppContent />
      </AppProvider>
    </AppErrorWrapperPage>
  );
};

// this is exported for testing
export { AppContent };
export default App;
