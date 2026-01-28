// eslint-ignore-all
import { errorToDisplayString } from "@/features/formatUtils";
import type {
  ProjectData,
  ProjectId,
  UnknownIridiumData,
  UnknownMetadata,
  UnknownProjectData,
  UnknownResultsData,
} from "@/features/projectData";
import type { Metadata } from "@/features/projectData";
import type { Action, ErrorResult, Result } from "@/features/taskPool";

export type ListProjectsAction = Action<"listProjects", null>;
export type ListProjectsResult = Result<Map<ProjectId, UnknownMetadata>>;

export type OpenProjectAction = Action<"openProject", ProjectId>;
export type OpenProjectResult = Result<UnknownProjectData>;

export type CloseCurrentProjectAction = Action<"closeCurrentProject", null>;
export type CloseCurrentProjectResult = Result<null>;

export type NewProjectAction = Action<
  "newProject",
  {
    id: ProjectId;
    data: ProjectData;
  }
>;
export type NewProjectResult = Result<null>;

export type SaveProjectAction = Action<"saveProject", Partial<ProjectData>>;
export type SaveProjectResult = Result<null>;

export type DeleteProjectAction = Action<"deleteProject", ProjectId>;
export type DeleteProjectResult = Result<null>;

export type FileSystemAction =
  | ListProjectsAction
  | OpenProjectAction
  | CloseCurrentProjectAction
  | NewProjectAction
  | SaveProjectAction
  | DeleteProjectAction;

const PROJECTS_DIR_NAME = "projects";

let rootHandle: FileSystemDirectoryHandle | null = null;
const getRootHandle = async (): Promise<FileSystemDirectoryHandle> => {
  if (rootHandle === null) {
    rootHandle = await navigator.storage.getDirectory();
  }
  return rootHandle;
};

let projectsDirHandle: FileSystemDirectoryHandle | null = null;
const getProjectsDirHandle = async (): Promise<FileSystemDirectoryHandle> => {
  if (projectsDirHandle === null) {
    const root = await getRootHandle();
    projectsDirHandle = await root.getDirectoryHandle(PROJECTS_DIR_NAME, {
      create: true,
    });
  }
  return projectsDirHandle;
};

const getJsonFileContents = async (
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<unknown> => {
  const handle = await dir.getFileHandle(name);
  const file = await handle.getFile();
  return JSON.parse(await file.text());
};

const listProjects = async (): Promise<ListProjectsResult["data"]> => {
  const map = new Map<ProjectId, Metadata>();
  const projectsDirectory = await getProjectsDirHandle();

  for await (const [id, handle] of projectsDirectory.entries()) {
    if (handle.kind !== "directory") continue;
    const dir = handle as FileSystemDirectoryHandle;
    try {
      const metadata = (await getJsonFileContents(
        dir,
        "metadata.json",
      )) as UnknownMetadata;
      map.set(id as ProjectId, metadata);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotFoundError") {
        // skip if it is not shaped correctly
        continue;
      } else {
        throw err;
      }
    }
  }

  return map;
};

class ProjectHandle {
  id: ProjectId;
  #dirHandle!: FileSystemDirectoryHandle;
  #codeHandle!: FileSystemSyncAccessHandle;
  #metadataHandle!: FileSystemSyncAccessHandle;
  #iridiumHandle!: FileSystemSyncAccessHandle;
  #resultsHandle!: FileSystemSyncAccessHandle;

  static #current: ProjectHandle | null = null;

  private constructor(id: ProjectId) {
    this.id = id;
  }

  /**
   * Open a ProjectHandle for the given project, if the project does not exist, create it.
   * @throws if something happens while trying to acquire the file handles (e.g. someone else has it open)
   * @throws if another project is currently opened by the app
   */
  static async open(
    id: ProjectId,
    { create = false }: { create?: boolean } = {},
  ): Promise<ProjectHandle> {
    if (this.#current) {
      this.#current.dispose();
    }

    const project = new ProjectHandle(id);
    const projectsDirectory = await getProjectsDirHandle();
    project.#dirHandle = await projectsDirectory.getDirectoryHandle(id, {
      create,
    });
    project.#codeHandle = await (
      await project.#dirHandle.getFileHandle("source.ant", { create })
    ).createSyncAccessHandle();
    project.#metadataHandle = await (
      await project.#dirHandle.getFileHandle("metadata.json", { create })
    ).createSyncAccessHandle();
    project.#iridiumHandle = await (
      await project.#dirHandle.getFileHandle("iridium.json", { create })
    ).createSyncAccessHandle();
    project.#resultsHandle = await (
      await project.#dirHandle.getFileHandle("results.json", { create })
    ).createSyncAccessHandle();

    ProjectHandle.#current = project;
    return project;
  }

  static getCurrent(): ProjectHandle | null {
    return ProjectHandle.#current;
  }

  /**
   * Dump the whole contents of a file into a string.
   */
  static #readHandleIntoString(handle: FileSystemSyncAccessHandle): string {
    const buffer = new DataView(new ArrayBuffer(handle.getSize()));
    handle.read(buffer, { at: 0 });

    const decoder = new TextDecoder();
    return decoder.decode(buffer);
  }

  static #writeStringToHandle(
    handle: FileSystemSyncAccessHandle,
    data: string,
  ): void {
    const encoder = new TextEncoder();
    const array = encoder.encode(data);
    handle.truncate(0);
    handle.write(array, { at: 0 });
    handle.flush();
  }

  setData(data: Partial<ProjectData>): void {
    if (data.code !== undefined) {
      ProjectHandle.#writeStringToHandle(this.#codeHandle, data.code);
    }

    if (data.metadata !== undefined) {
      ProjectHandle.#writeStringToHandle(
        this.#metadataHandle,
        JSON.stringify(data.metadata),
      );
    }

    if (data.iridium !== undefined) {
      ProjectHandle.#writeStringToHandle(
        this.#iridiumHandle,
        JSON.stringify(data.iridium),
      );
    }

    if (data.results !== undefined) {
      ProjectHandle.#writeStringToHandle(
        this.#resultsHandle,
        JSON.stringify(data.results),
      );
    }
  }

  getData(): UnknownProjectData {
    const code = ProjectHandle.#readHandleIntoString(this.#codeHandle);
    const metadata = JSON.parse(
      ProjectHandle.#readHandleIntoString(this.#metadataHandle),
    ) as UnknownMetadata;
    const iridium = JSON.parse(
      ProjectHandle.#readHandleIntoString(this.#iridiumHandle),
    ) as UnknownIridiumData;
    const results = JSON.parse(
      ProjectHandle.#readHandleIntoString(this.#resultsHandle),
    ) as UnknownResultsData;
    return { code, metadata, iridium, results };
  }

  dispose(): void {
    this.#codeHandle.close();
    this.#metadataHandle.close();
    this.#iridiumHandle.close();
    this.#resultsHandle.close();
    ProjectHandle.#current = null;
  }
}

const openProject = async (
  id: ProjectId,
): Promise<OpenProjectResult["data"]> => {
  try {
    const handle = await ProjectHandle.open(id);
    return handle.getData();
  } catch (err) {
    if (
      err instanceof DOMException &&
      err.name === "NoModificationAllowedError"
    ) {
      throw new Error("Project is already open in another tab.");
    } else if (err instanceof DOMException && err.name === "NotFoundError") {
      throw new Error("Project was deleted somewhere else.");
    }
    throw err;
  }
};

const newProject = async (
  id: ProjectId,
  data: ProjectData,
): Promise<NewProjectResult["data"]> => {
  const handle = await ProjectHandle.open(id, { create: true });
  handle.setData(data);
  return null;
};

const closeProject = () => {
  const handle = ProjectHandle.getCurrent();
  handle?.dispose();
  return null;
};

const saveProject = (data: Partial<ProjectData>) => {
  const handle = ProjectHandle.getCurrent();
  if (!handle) throw new Error("No project opened.");
  handle.setData(data);
  return null;
};

const deleteProject = async (id: ProjectId) => {
  try {
    const projectsDirectory = await getProjectsDirHandle();
    await projectsDirectory.removeEntry(id, { recursive: true });
    return null;
  } catch (err) {
    if (
      err instanceof DOMException &&
      err.name === "NoModificationAllowedError"
    ) {
      throw new Error("Project is opened in another tab.");
    } else if (err instanceof DOMException && err.name === "NotFoundError") {
      throw new Error("Project was deleted already.");
    } else {
      throw err;
    }
  }
};

const wrapResult = (action: Action, data: unknown): Result => ({
  id: action.id,
  data: data,
});

const handleAction = async (action: FileSystemAction): Promise<Result> => {
  switch (action.type) {
    case "listProjects":
      return wrapResult(action, await listProjects());
    case "openProject":
      return wrapResult(action, await openProject(action.payload));
    case "closeCurrentProject":
      return wrapResult(action, closeProject());
    case "newProject":
      return wrapResult(
        action,
        await newProject(action.payload.id, action.payload.data),
      );
    case "saveProject":
      return wrapResult(action, saveProject(action.payload));
    case "deleteProject":
      return wrapResult(action, await deleteProject(action.payload));
    default:
      throw new Error("unknown action type");
  }
};

self.onmessage = async (e) => {
  try {
    // eslint-disable-next-line
    const result = await handleAction(e.data);
    self.postMessage(result);
  } catch (err) {
    self.postMessage({
      // eslint-disable-next-line
      id: e.data.id,
      errorMessage: errorToDisplayString(err),
    } satisfies ErrorResult);

    throw err;
  }
};
