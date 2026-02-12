import { useRef } from "react";
import { atom, useSetAtom, type Atom } from "jotai";

import {
  migrateMetadata,
  type Metadata,
  type ProjectData,
  type ProjectId,
} from "@/features/projectData";
import {
  closeCurrentProjectRaw,
  deleteProjectRaw,
  listProjectsRaw,
  newProjectRaw,
  openProjectRaw,
} from "@/features/fileSystem";
import { convertSbmlToAntimony } from "@/features/antimony";

import { useToast } from "@/components/Toast";
import { errorToDisplayString } from "@/features/formatUtils";

import { setModelAtom } from "./model";
import { updateAllHistoryAtom } from "./history";
import {
  graphSettingsAtom,
  independentVariableAtom,
  parameterScanOptionsAtom,
  timeCourseParametersAtom,
} from "./settings";
import {
  currentBottomPanelAtom,
  currentLeftPanelAtom,
  currentRightPanelAtom,
  currentVeryRightPanelAtom,
} from "./layout";
import { loadBiomodelSbml, type BiomodelInfo } from "@/features/biomodels";
import {
  cancelSimulationAtom,
  simulateTimeCourseAtom,
  simulationResultAtom,
} from "./simulation";
import { saveFullProjectAtom } from "./saving";
import { variableSliderStatesAtom } from "./slider";
import { useAtom } from "jotai";
import { unwrap } from "jotai/utils";

// Increments every time a change is made to the file system
// Other atoms should `get` this if they want to re-evaluate when the file system changes.
export const fileSystemChangeIdAtom = atom(0);

export const activeProjectFileAtom = atom<ProjectId | null>(null);
export const hasActiveProjectAtom = atom(
  (get) => get(activeProjectFileAtom) !== null,
);
export const metadataAtom = atom<Metadata>({
  versionTag: 1,
  name: "No Project",
  created: 0,
  updated: 0,
  icon: {
    color: "blue",
  },
} satisfies Metadata);

const _projectListAtom: Atom<Promise<Map<ProjectId, Metadata>>> = atom(
  async (get) => {
    // do this to update the atom on any file system changes
    get(fileSystemChangeIdAtom);

    const projects = await listProjectsRaw();
    const migratedProjects: Map<ProjectId, Metadata> = new Map();

    const entries = Array.from(projects.entries());
    entries.sort((a, b) => b[1].updated - a[1].updated);

    for (const [id, metadata] of entries) {
      migratedProjects.set(id, migrateMetadata(metadata));
    }

    return migratedProjects;
  },
);

export type ProjectListState =
  | { state: "loading" }
  | { state: "hasError"; error: unknown }
  | { state: "hasData"; data: Map<ProjectId, Metadata> };

export const projectListAtom: Atom<ProjectListState> = (() => {
  // keeps a cache of the data when it is loading so there's no flash
  const LOADING = { state: "loading" } as const;
  const unwrappedProjectList = unwrap(_projectListAtom, () => LOADING);
  let cached: Map<ProjectId, Metadata> | undefined;
  return atom((get): ProjectListState => {
    try {
      const data = get(unwrappedProjectList);
      if (data === LOADING) {
        if (cached) {
          return { state: "hasData", data: cached };
        } else {
          return LOADING;
        }
      }
      cached = data as unknown as Map<ProjectId, Metadata>;
      return {
        state: "hasData",
        data: data as unknown as Map<ProjectId, Metadata>,
      };
    } catch (error) {
      return { state: "hasError", error };
    }
  });
})();

const _updateGlobalsFromProjectDataAtom = atom(
  null,
  async (
    _get,
    set,
    [id, { metadata, iridium, code, results }]: [ProjectId, ProjectData],
  ) => {
    set(timeCourseParametersAtom, iridium.timeCourseParameters);
    set(parameterScanOptionsAtom, iridium.parameterScanOptions);
    await set(setModelAtom, {
      name: metadata.name,
      content: code,
      variableSettingss: iridium.variableSettings,
    });
    set(updateAllHistoryAtom, results.records);

    set(graphSettingsAtom, iridium.graphSettings);

    set(metadataAtom, metadata);
    set(activeProjectFileAtom, id);
  },
);

const _createNewProjectAtom = atom(
  null,
  async (
    get,
    set,
    params?: {
      name: string;
      code: string;
      shouldSimulateImmediately?: boolean;
    },
  ) => {
    const [id, data] = params
      ? await newProjectRaw(params.name, params.code)
      : await newProjectRaw();

    await set(_updateGlobalsFromProjectDataAtom, [id, data]);

    set(fileSystemChangeIdAtom, (prev) => prev + 1);

    if (get(currentLeftPanelAtom) === null) {
      set(currentLeftPanelAtom, "Time Course");
    }

    if (params?.shouldSimulateImmediately) {
      void set(simulateTimeCourseAtom);
    }
  },
);

const _openProjectAtom = atom(null, async (get, set, id: ProjectId) => {
  const data = await openProjectRaw(id);

  await set(_updateGlobalsFromProjectDataAtom, [id, data]);

  if (data.results.records.length > 0) {
    set(
      simulationResultAtom,
      data.results.records.at(-1)?.simulationResult ?? null,
    );
    set(currentRightPanelAtom, "Results");
  }

  if (get(currentLeftPanelAtom) === null) {
    set(currentLeftPanelAtom, "Time Course");
  }
});

const _closeCurrentProjectAtom = atom(null, async (_get, set) => {
  await set(saveFullProjectAtom);
  await closeCurrentProjectRaw();
  set(cancelSimulationAtom);
  set(variableSliderStatesAtom, {});
  set(independentVariableAtom, null);
  set(activeProjectFileAtom, null);
  set(currentLeftPanelAtom, null);
  set(currentRightPanelAtom, null);
  set(currentVeryRightPanelAtom, null);
  set(currentBottomPanelAtom, null);
  set(simulationResultAtom, null);
});

const _deleteProjectAtom = atom(null, async (_get, set, id: ProjectId) => {
  await deleteProjectRaw(id);
  set(fileSystemChangeIdAtom, (old) => old + 1);
});

/**
 * `null` means not doing anything.
 */
export type ProjectActionStatus =
  | "creating"
  | "importingFile"
  | "importingBiomodel"
  | "opening"
  | "deleting"
  | null;
const projectActionStatusAtom = atom<ProjectActionStatus>(null);

/**
 * Hook that exposes functions to interact with the file system.
 * These will handle the complete interaction, including reporting any
 * errors to the user.
 */
export const useProjectActions = () => {
  const { toast } = useToast();
  const createNewProject = useSetAtom(_createNewProjectAtom);
  const openProject = useSetAtom(_openProjectAtom);
  const closeCurrentProject = useSetAtom(_closeCurrentProjectAtom);
  const deleteProject = useSetAtom(_deleteProjectAtom);
  const [projectActionStatus, setProjectActionStatus] = useAtom(
    projectActionStatusAtom,
  );

  const inputRef = useRef<HTMLInputElement>(null);

  /** @returns true if it succeeds */
  const createNewProjectWrapper = async (params?: {
    name: string;
    code: string;
    shouldSimulateImmediately?: boolean;
  }): Promise<boolean> => {
    if (projectActionStatus) return false;
    setProjectActionStatus("creating");

    try {
      await createNewProject(params);
      return true;
    } catch (err) {
      toast({
        type: "error",
        title: "Failed to create project",
        description: errorToDisplayString(err),
      });
      return false;
    } finally {
      setProjectActionStatus(null);
    }
  };

  /** returns true on success */
  const createNewProjectFromBiomodel = async (
    info: BiomodelInfo,
  ): Promise<boolean> => {
    if (projectActionStatus) return false;
    setProjectActionStatus("importingBiomodel");

    try {
      const sbml = await loadBiomodelSbml(info);
      const antimony = await convertSbmlToAntimony(sbml);
      await createNewProject({
        name: info.name,
        code: antimony,
        shouldSimulateImmediately: true,
      });
      return true;
    } catch (err) {
      toast({
        type: "error",
        title: "Failed to create project",
        description: errorToDisplayString(err),
      });
      return false;
    } finally {
      setProjectActionStatus(null);
    }
  };

  const closeCurrentProjectWrapper = async () => {
    await closeCurrentProject();
  };

  /** @returns true if it succeeds */
  const openProjectWrapper = async (id: ProjectId): Promise<boolean> => {
    if (projectActionStatus) return false;
    setProjectActionStatus("opening");

    try {
      await openProject(id);
      return true;
    } catch (err) {
      toast({
        type: "error",
        title: "Failed to open project",
        description: errorToDisplayString(err),
      });
      return false;
    } finally {
      setProjectActionStatus(null);
    }
  };

  /** @returns true if it succeeds */
  const deleteProjectWrapper = async (id: ProjectId): Promise<boolean> => {
    if (projectActionStatus) return false;
    setProjectActionStatus("deleting");

    try {
      await deleteProject(id);
      return true;
    } catch (err) {
      toast({
        type: "error",
        title: "Failed to delete project",
        description: errorToDisplayString(err),
      });
      return false;
    } finally {
      setProjectActionStatus(null);
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

      void createNewProjectWrapper({
        name: nameWithoutExtension,
        code: content,
      });
    };
  };

  const promptProjectFromFile = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.click();
    }
  };

  /**
   * Render this somewhere so that promptProjectFromFile works.
   */
  const FileInput = () => {
    return (
      <input
        style={{ display: "none" }}
        ref={inputRef}
        type="file"
        onChange={handleFileOpen}
        accept=".ant,.txt,.xml,.sbml"
      />
    );
  };

  return {
    createNewProject: createNewProjectWrapper,
    createNewProjectFromBiomodel: createNewProjectFromBiomodel,
    openProject: openProjectWrapper,
    deleteProject: deleteProjectWrapper,
    promptProjectFromFile: promptProjectFromFile,
    closeCurrentProject: closeCurrentProjectWrapper,
    projectActionStatus: projectActionStatus,
    FileInput: FileInput,
  };
};
