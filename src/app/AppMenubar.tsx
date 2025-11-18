import { useState, useRef } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import styles from "./AppMenubar.module.css";

import defaultModel from "@/assets/default.ant?raw";

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
} from "@/globals/layout";

import { useToast } from "@/components/Toast";
import WorkspaceBar from "./WorkspaceBar";
import ShareButton from "./sharing/ShareButton";
import GlobalSettingsDialog from "./globalSettings/GlobalSettingsDialog";
import HelpDialog from "./HelpDialog";
import AboutDialog from "./AboutDialog";

import {
  convertAntimonyToSbml,
  convertSbmlToAntimony,
} from "@/features/antimony";
import { promptDownloadString } from "@/features/download";
import { nameAtom } from "@/globals/settings";
import { editorContentAtom, setModelAtom } from "@/globals/model";

const AppMenubar = () => {
  const { toast } = useToast();

  const editorContent = useAtomValue(editorContentAtom);
  const setModel = useSetAtom(setModelAtom);
  const workspaceName = useAtomValue(nameAtom);

  const availableLeftPanels = useAtomValue(availableLeftPanelsAtom);
  const [currentLeftPanel, setCurrentLeftPanel] = useAtom(currentLeftPanelAtom);
  const [currentRightPanel, setCurrentRightPanel] = useAtom(
    currentRightPanelAtom,
  );
  const [currentBottomPanel, setCurrentBottomPanel] = useAtom(
    currentBottomPanelAtom,
  );

  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isAboutOpen, setAboutOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNew = () => {
    void setModel({
      name: "Starter Model",
      content: defaultModel,
    });
  };

  const handleDownloadAntimony = () => {
    promptDownloadString(`${workspaceName}.ant`, editorContent, "ant");
  };

  const handleDownloadSbml = async () => {
    try {
      const sbml = await convertAntimonyToSbml(editorContent);
      promptDownloadString(`${workspaceName}.xml`, sbml, "xml");
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

  const handleFileOpen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files?.length !== 1) {
      toast({
        type: "error",
        title: "File open failed",
        description: "A single file must be selected",
      });
      return;
    }

    const file = files[0];
    const nameWithoutExtension = file.name.split(".")[0];
    const isSbml =
      file.name.toLowerCase().endsWith(".sbml") ||
      file.name.toLowerCase().endsWith(".xml");
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = async () => {
      let content = reader.result as string;
      if (isSbml) {
        try {
          content = await convertSbmlToAntimony(content);
        } catch (e) {
          // silently fail and use the content directly
          console.error(e);
        }
      }
      void setModel({ name: nameWithoutExtension, content });
    };
  };

  return (
    <div className={styles.root}>
      <input
        style={{ display: "none" }}
        ref={fileInputRef}
        type="file"
        onChange={handleFileOpen}
        accept=".ant,.txt,.xml,.sbml"
      />

      {isSettingsOpen && (
        <GlobalSettingsDialog onClose={() => setSettingsOpen(false)} />
      )}

      {isHelpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}

      {isAboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}

      <MenubarRoot className={styles.menubarLeft}>
        <MenubarMenu name="File">
          <MenubarItem name="New" onSelect={handleNew} />
          <MenubarItem
            name="Open..."
            onSelect={() => {
              const fileInput = fileInputRef.current;
              if (fileInput) {
                fileInput.value = "";
                fileInput.click();
              }
            }}
          />
          <MenubarItem
            name="Download as Antimony"
            onSelect={handleDownloadAntimony}
          />
          <MenubarItem name="Download as SBML" onSelect={handleDownloadSbml} />
        </MenubarMenu>

        <MenubarMenu name="View">
          <MenubarRadioGroup
            value={currentLeftPanel}
            onValueChange={setCurrentLeftPanel as (newValue: string) => void}
          >
            {availableLeftPanels.map((panel) => (
              <MenubarRadioItem key={panel} value={panel}>
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

        <MenubarMenu name="Help">
          <MenubarItem name="Help" onSelect={() => setHelpOpen(true)} />
          <MenubarLinkItem
            name="Antimony Reference"
            href="https://tellurium.readthedocs.io/en/latest/antimony.html"
          />
          <MenubarItem name="About" onSelect={() => setAboutOpen(true)} />
        </MenubarMenu>
      </MenubarRoot>

      <div className={styles.menubarCenter}>
        <WorkspaceBar />
      </div>

      <div className={styles.menubarRight}>
        <ShareButton />
      </div>
    </div>
  );
};

export default AppMenubar;
