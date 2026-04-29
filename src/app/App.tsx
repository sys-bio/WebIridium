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
import { activeProjectFileAtom, useDbChangeIdCrossTabSync } from "@/globals/project";

import AppErrorWrapperPage from "./AppErrorWrapperPage";
import WorkspaceProvider from "./WorkspaceProvider";
import Sidebar from "./Sidebar";
import AppMenubar from "./AppMenubar";
import AppStatusBar from "./AppStatusBar";
import ProjectAutoSaver from "./ProjectAutoSaver";
import { ToastProvider } from "@/components/Toast";
import { TooltipProvider } from "@/components/Tooltip";
import { DatabaseInitializer } from "./DatabaseInitializer";

import TimeCoursePanel from "./simulation/TimeCoursePanel";
import ParameterScanPanel from "./simulation/ParameterScanPanel";
import SteadyStatePanel from "./simulation/SteadyStatePanel";
import OverlaysPanel from "./overlays/OverlaysPanel";

import HistoryPanel from "./HistoryPanel";
import ExamplesPanel from "./ExamplesPanel";

import EditorPanel from "./EditorPanel";
import SlidersPanel from "./sliders/SlidersPanel";

import ResultTabbedPanel from "./results/ResultsTabbedPanel";
import GraphSettingsPanel from "./graphSettings/GraphSettingsPanel";
import ChatPanel from "./ChatPanel";
import StartPanel from "./start/StartPanel";

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

  const activeProjectFile = useAtomValue(activeProjectFileAtom);
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
              priority={LayoutPriority.Low}
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
                  {activeProjectFile === null ? (
                    <StartPanel />
                  ) : (
                    <EditorPanel />
                  )}
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
              priority={LayoutPriority.Low}
            >
              {currentRightPanel === "Results" && (
                <ResultTabbedPanel onClose={() => setCurrentRightPanel(null)} />
              )}
            </Allotment.Pane>

            <Allotment.Pane
              visible={Boolean(currentVeryRightPanel)}
              preferredSize={450}
              priority={LayoutPriority.Normal}
            >
              {currentVeryRightPanel === "Plot Settings" && (
                <GraphSettingsPanel
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

    handleChange();

    return () => themeMediaQuery.removeEventListener("change", handleChange);
  }, [tryUpdateThemeIfAutomatic]);

  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  return null;
};

const AppWithHooks = () => {
  useDbChangeIdCrossTabSync();

  return (
    <DatabaseInitializer>
      <AppContent />
    </DatabaseInitializer>
  );
};

const App = () => {
  return (
    <AppErrorWrapperPage>
      <AppProvider>
        <ThemeUpdater />
        <ProjectAutoSaver />
        <AppWithHooks />
      </AppProvider>
    </AppErrorWrapperPage>
  );
};

// this is exported for testing
export { AppContent };
export default App;
