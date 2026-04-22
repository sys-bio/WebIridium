import { useState } from "react";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import styles from "./AppMenubar.module.css";

import {
  MenubarRoot,
  MenubarMenu,
  MenubarItem,
  MenubarLinkItem,
  MenubarRadioItem,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarSeparator,
} from "@/components/Menubar";

import {
  currentLeftPanelAtom,
  currentRightPanelAtom,
  currentBottomPanelAtom,
  availableLeftPanelsAtom,
  ALL_LEFT_PANELS,
} from "@/globals/layout";

import { useToast } from "@/components/Toast";
import GlobalSettingsDialog from "./globalSettings/GlobalSettingsDialog";
import AboutDialog from "./AboutDialog";
import CloseProjectButton from "./CloseProjectButton";
import ProjectName from "./ProjectName";

import { convertAntimonyToSbml } from "@/features/antimony";
import { promptDownloadString } from "@/features/download";
import {
  hasActiveProjectAtom,
  metadataAtom,
  useProjectActions,
} from "@/globals/project";
import { editorContentAtom } from "@/globals/model";
import {
  cancelSimulationAtom,
  computeSteadyStateAtom,
  isSimulatingAtom,
  runParameterScanAtom,
  simulateTimeCourseAtom,
} from "@/globals/simulation";
import { simulatorAtom } from "@/globals/simulator";

const RunMenu = () => {
  const isSimulating = useAtomValue(isSimulatingAtom);
  const hasActiveProject = useAtomValue(hasActiveProjectAtom);
  const simulator = useAtomValue(simulatorAtom);
  const cancelSimulaton = useSetAtom(cancelSimulationAtom);
  const simulateTimeCourse = useSetAtom(simulateTimeCourseAtom);
  const computeSteadyState = useSetAtom(computeSteadyStateAtom);
  const runParameterScan = useSetAtom(runParameterScanAtom);

  const disabled = isSimulating || !hasActiveProject;

  return (
    <MenubarMenu name="Run">
      <MenubarItem
        name="Simulate Time Course"
        disabled={disabled}
        onSelect={simulateTimeCourse}
      />
      {simulator.capabilities.canRunSteadyState && (
        <MenubarItem
          name="Compute Steady State"
          disabled={disabled}
          onSelect={computeSteadyState}
        />
      )}
      <MenubarItem
        name="Run Parameter Scan"
        disabled={disabled}
        onSelect={runParameterScan}
      />

      <MenubarSeparator />

      <MenubarItem
        name="Cancel Simulaton"
        disabled={!isSimulating}
        onSelect={cancelSimulaton}
      />
    </MenubarMenu>
  );
};

const AppMenubar = () => {
  const { toast } = useToast();

  const editorContent = useAtomValue(editorContentAtom);
  const [metadata, setMetadata] = useAtom(metadataAtom);
  const hasActiveProject = useAtomValue(hasActiveProjectAtom);

  const availableLeftPanels = useAtomValue(availableLeftPanelsAtom);
  const [currentLeftPanel, setCurrentLeftPanel] = useAtom(currentLeftPanelAtom);
  const [currentRightPanel, setCurrentRightPanel] = useAtom(
    currentRightPanelAtom,
  );
  const [currentBottomPanel, setCurrentBottomPanel] = useAtom(
    currentBottomPanelAtom,
  );

  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isAboutOpen, setAboutOpen] = useState(false);

  const {
    createNewProject,
    promptProjectFromFile,
    closeCurrentProject,
    FileInput,
  } = useProjectActions();

  const handleDownloadAntimony = () => {
    promptDownloadString(`${metadata.name}.ant`, editorContent, "ant");
  };

  const handleDownloadSbml = async () => {
    try {
      const sbml = await convertAntimonyToSbml(editorContent);
      promptDownloadString(`${metadata.name}.xml`, sbml, "xml");
    } catch (e) {
      if (e instanceof Error) {
        toast({
          type: "error",
          title: "Error converting Antimony to SBML",
          description: e.message,
        });
      }
    }
  };

  return (
    <div className={styles.root} data-testid="app-menubar">
      <FileInput />

      {isSettingsOpen && (
        <GlobalSettingsDialog onClose={() => setSettingsOpen(false)} />
      )}

      {isAboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}

      <MenubarRoot className={styles.menubarLeft}>
        <MenubarMenu name="File">
          <MenubarItem name="New Project" onSelect={() => createNewProject()} />
          <MenubarItem
            name="Import File..."
            onSelect={() => promptProjectFromFile()}
          />
          <MenubarItem
            name="Download as Antimony"
            onSelect={handleDownloadAntimony}
            disabled={!hasActiveProject}
          />
          <MenubarItem
            name="Download as SBML"
            disabled={!hasActiveProject}
            onSelect={handleDownloadSbml}
          />
          <MenubarSeparator />
          <MenubarItem
            name="Close Project"
            disabled={!hasActiveProject}
            onSelect={closeCurrentProject}
          />
        </MenubarMenu>

        <MenubarMenu name="View">
          <MenubarRadioGroup
            value={currentLeftPanel}
            onValueChange={setCurrentLeftPanel as (newValue: string) => void}
          >
            {ALL_LEFT_PANELS.map((panel) => (
              <MenubarRadioItem
                key={panel}
                value={panel}
                disabled={!availableLeftPanels.includes(panel)}
              >
                {panel}
              </MenubarRadioItem>
            ))}
          </MenubarRadioGroup>

          <MenubarSeparator />

          <MenubarCheckboxItem
            checked={currentBottomPanel === "Sliders"}
            onCheckedChange={(checked) =>
              checked
                ? setCurrentBottomPanel("Sliders")
                : setCurrentBottomPanel(null)
            }
            disabled={!hasActiveProject}
          >
            Sliders
          </MenubarCheckboxItem>

          <MenubarCheckboxItem
            checked={currentRightPanel === "Results"}
            onCheckedChange={(checked) =>
              checked
                ? setCurrentRightPanel("Results")
                : setCurrentRightPanel(null)
            }
          >
            Results
          </MenubarCheckboxItem>

          <MenubarSeparator />

          <MenubarItem name="Settings" onSelect={() => setSettingsOpen(true)} />
        </MenubarMenu>

        <RunMenu />

        <MenubarMenu name="Help">
          <MenubarLinkItem
            name="Help"
            href={`${import.meta.env.BASE_URL}/manual/index.html`}
          />
          <MenubarLinkItem
            name="Antimony Reference"
            href="https://tellurium.readthedocs.io/en/latest/antimony.html"
          />
          <MenubarLinkItem
            name="GitHub"
            href="https://github.com/sys-bio/WebIridium"
          />
          <MenubarItem name="About" onSelect={() => setAboutOpen(true)} />
        </MenubarMenu>
      </MenubarRoot>

      <div className={styles.menubarCenter}>
        {hasActiveProject && (
          <ProjectName
            metadata={metadata}
            onNameChange={(newName) =>
              setMetadata({ ...metadata, name: newName })
            }
          />
        )}
      </div>

      <div className={styles.menubarRight}>
        {hasActiveProject && (
          <CloseProjectButton onClose={closeCurrentProject} />
        )}
      </div>
    </div>
  );
};

export default AppMenubar;
