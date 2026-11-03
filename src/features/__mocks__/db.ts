import {
  type ProjectId,
  type ProjectData,
  getNewProjectId,
  getNewProjectData,
  type Metadata,
} from "@/features/savedData";
import {
  getMockDatabaseOpen,
  getMockProject,
  getMockProjects,
  removeMockProject,
  setMockDatabaseOpen,
  setMockProject,
} from "@/testing-utils/mockDatabase";

export const openMainDb = () =>
  Promise.resolve({
    close() {},
  });

export const listProjectsRaw = async () => {
  const projects = await getMockProjects();
  const result: Map<string, Metadata> = new Map();
  for (const [id, project] of projects) {
    result.set(id, project.metadata);
  }
  return result;
};

export const openProjectRaw = async (id: ProjectId) => {
  const project = await getMockProject(id);

  if (!project) {
    throw new Error("Project has been deleted.");
  }

  setMockDatabaseOpen(id);
  return project;
};

export const closeCurrentProjectRaw = () => {
  setMockDatabaseOpen(undefined);
};

export const newProjectRaw = async (_name?: string, _code?: string) => {
  const id = getNewProjectId();
  const data = getNewProjectData();
  await setMockProject(id, data);
  setMockDatabaseOpen(id);
  return [id, data];
};

export const saveProjectRaw = async (data: Partial<ProjectData>) => {
  const current = getMockDatabaseOpen();
  if (!current) throw new Error("No project open");
  await setMockProject(current, {
    ...getMockProject(current),
    ...data,
  } as ProjectData);
};

export const deleteProjectRaw = async (id: ProjectId) => {
  await removeMockProject(id);
};
