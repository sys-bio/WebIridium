import type {
  ProjectId,
  UnknownIridiumData,
  UnknownMetadata,
  UnknownProjectData,
  UnknownResultsData,
} from "@/features/savedData";
import type { Action, Result } from "@/features/taskPool";
import wrapActionHandler from "./wrapActionHandler";

export type GetAllProjectsAction = Action<"getAllProjects", null>;
export type GetAllProjectsResult = Result<Map<ProjectId, UnknownProjectData>>;

export type FileSystemAction = GetAllProjectsAction;

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

const getStringFileContents = async (
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<string> => {
  const handle = await dir.getFileHandle(name);
  const file = await handle.getFile();
  return await file.text();
};

const getJsonFileContents = async (
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<unknown> => {
  return JSON.parse(await getStringFileContents(dir, name));
};

const getAllProjects = async (): Promise<GetAllProjectsResult["data"]> => {
  const map = new Map<ProjectId, UnknownProjectData>();
  const projectsDirectory = await getProjectsDirHandle();

  for await (const [id, handle] of projectsDirectory.entries()) {
    if (handle.kind !== "directory") continue;
    const dir = handle as FileSystemDirectoryHandle;
    try {
      const metadata = (await getJsonFileContents(
        dir,
        "metadata.json",
      )) as UnknownMetadata;

      const iridium = (await getJsonFileContents(
        dir,
        "iridium.json",
      )) as UnknownIridiumData;

      const results = (await getJsonFileContents(
        dir,
        "results.json",
      )) as UnknownResultsData;

      const code = await getStringFileContents(dir, "source.ant");

      map.set(id as ProjectId, { metadata, iridium, results, code });
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

const wrapResult = (action: Action, data: unknown): Result => ({
  id: action.id,
  data: data,
});

const handleAction = async (action: FileSystemAction): Promise<Result> => {
  switch (action.type) {
    case "getAllProjects":
      return wrapResult(action, await getAllProjects());
    default:
      throw new Error("unknown action type");
  }
};

self.onmessage = wrapActionHandler(self, handleAction);
