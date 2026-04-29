import type { ProjectData } from "@/features/savedData";

const projects: Map<string, ProjectData> = new Map();
let delay = 0;
let current: string | undefined;

export const setMockDatabaseDelay = (d: number) => {
  delay = d;
};

export const resetMockDatabaseDelay = () => {
  delay = 0;
};

export const getMockDatabaseOpen = () => current;
export const setMockDatabaseOpen = (open: string | undefined) =>
  (current = open);

export const resetMockProjects = () => {
  current = undefined;
  projects.clear();
};

export const getMockProjects = (): Promise<Map<string, ProjectData>> => {
  const cachedProjects = new Map(projects);
  return new Promise((resolve) => {
    setTimeout(() => resolve(cachedProjects), delay);
  });
};

export const getMockProject = (
  name: string,
): Promise<ProjectData | undefined> => {
  const result = projects.get(name);
  return new Promise((resolve) => {
    setTimeout(() => resolve(result), delay);
  });
};

export const setMockProject = (
  name: string,
  value: ProjectData,
): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      projects.set(name, value);
      resolve();
    }, delay);
  });
};

export const removeMockProject = (name: string): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      projects.delete(name);
      resolve();
    }, delay);
  });
};
