import type { Action, Result } from "@/features/taskPool";
import { MockWorker } from "./mockWorker";

export type ControlledWorkerControls = {
  resolveTag: (tag: unknown, value: unknown) => Promise<void>;
};

const wait = async (duration: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, duration));
};

/**
 * A worker where you can control when it replies.
 */
export const createControlledWorker = (): [
  Worker,
  ControlledWorkerControls,
] => {
  const worker = new MockWorker();
  const actions: Action[] = [];
  worker.port.addEventListener("message", (e) => {
    const event = e as MessageEvent<Action>;
    actions.push(event.data);
  });

  const controls: ControlledWorkerControls = {
    resolveTag: async (tag, value) => {
      let action: Action | undefined = undefined;
      // busy wait until the task appears (horrible hack but it works)
      do {
        const index = actions.findIndex((a) => a.payload === tag);
        if (index === -1) {
          await wait(10);
          continue;
        }
        [action] = actions.splice(index, 1);
      } while (action === undefined);
      worker.port.postMessage({
        id: action.id,
        data: value,
      } satisfies Result);
    },
  };

  return [worker as unknown as Worker, controls];
};
