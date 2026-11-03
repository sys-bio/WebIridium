/**
 * Use this to make workers.
 * Mostly meant to be mocked.
 */

import AntimonyWorker from "@/workers/AntimonyWorker?worker";
import LibSbmlSimWorker from "@/workers/LibSbmlSimWorker?worker";
import CopasiWorker from "@/workers/CopasiWorker?worker";

export type WorkerType = "copasi" | "antimony" | "libsbmlsim";

export const createWorker = (type: WorkerType): Worker => {
  switch (type) {
    case "copasi":
      return new CopasiWorker();
    case "libsbmlsim":
      return new LibSbmlSimWorker();
    case "antimony":
      return new AntimonyWorker();
  }
};
