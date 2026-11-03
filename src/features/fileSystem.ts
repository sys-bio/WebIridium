/*
 This only exists for migration to IndexedDB now.

 Directory structure:
   \- projects
      \- {project UUID}
        \- metadata.json: this contains the name, creation date, updated date
        \- iridium.json: WebIridium-specific parts of the project such as graph settings
        \- results.json: results stored from every simulation
        \- source.ant: the actual antimony
      \- {project UUID}: another project
        \- metadata.json
        \- iridium.json
        \- results.json
        \- source.ant
 */

import {
  migrateProjectData,
  type ProjectId,
  type ProjectData,
} from "./savedData";
import { WorkerPool } from "./taskPool";
import type {
  GetAllProjectsAction,
  GetAllProjectsResult,
} from "@/workers/FileSystemWorker";
import { createWorker } from "@/features/workers";

const fileWorker = new WorkerPool(() => createWorker("fileSystem"), {
  maxWorkers: 1,
});

export const getAllProjects = async (): Promise<
  Map<ProjectId, ProjectData>
> => {
  const result = await fileWorker.runTask<
    GetAllProjectsAction,
    GetAllProjectsResult
  >("getAllProjects", null, null);

  const migrated = new Map();

  for (const [id, data] of result) {
    migrated.set(id, migrateProjectData(data));
  }

  return migrated;
};
