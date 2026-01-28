/**
 * Use this to make workers.
 * Mostly meant to be mocked.
 */

import FileSystemWorker from "@/workers/FileSystemWorker?worker";
import AntimonyWorker from "@/workers/AntimonyWorker?worker";
import LibSbmlSimWorker from "@/workers/LibSbmlSimWorker?worker";
import CopasiWorker from "@/workers/CopasiWorker?worker";

export type WorkerType = "fileSystem" | "copasi" | "antimony" | "libsbmlsim";

export const createWorker = (type: WorkerType): Worker => {
  switch (type) {
    case "fileSystem":
      return new FileSystemWorker();
    case "copasi":
      console.log("heyo");
      return new CopasiWorker();
    case "libsbmlsim":
      return new LibSbmlSimWorker();
    case "antimony":
      return new AntimonyWorker();
  }
};
