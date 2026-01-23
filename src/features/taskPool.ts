// TODO: Add automatically killing unused workers.

/**
 * TaskPool is an abstract class for that receives tasks to complete,
 * and dispatches them to "task runners" to run asychronously.
 * Run tasks using the `runTask` method.
 *
 * There are two implementations:
 *  - WorkerPool, which runs tasks inside WebWorkers.
 *  - SocketTaskPool, which runs tasks from a server (via WebSocket).
 *
 * When comments refer "task runner" it is either a web worker or web socket.
 */

export type Action<
  Name extends string = string,
  Payload = unknown,
  InternalState = unknown,
> = {
  id: number;
  type: Name;
  payload: Payload;

  /**
   * This value is synchronized with the actual task runner. It is only sent to
   * the runner when changed.
   * For simulationWorker, "internalState" is the antimony code.
   */
  internalState: InternalState;
};

export type Result<Data = unknown> = {
  /**
   * This should be the same as the id of the action that
   * triggered this result.
   */
  id: number;
  data: Data;
};

export type ErrorResult = {
  id: number;
  errorMessage: string;
};

type Task<RunnerInfo, Payload = unknown, InternalState = unknown> = {
  id: number;
  state: "waiting" | "working" | "done" | "terminated" | "failed";
  actionType: string;
  payload: Payload;
  internalState: InternalState;
  resolve: (res: unknown) => void;
  reject: (reason: unknown) => void;
  /**
   * For worker pools, this is the Worker info of worker currently working on this task.
   * For socket pools, this is the raw WebSocket.
   **/
  runnerInfo?: RunnerInfo;
};

type WorkerInfo = {
  worker: Worker;
  state: "idle" | "busy" | "dead";
  /** For tracking the internalState of the actual worker. */
  internalState: unknown;
};

export type TaskPoolOptions = {
  /**
   * Whether results should be returned in their respective actions were sent.
   * This may cause blocking if an earlier result is taking too long.
   *
   * Default: false
   */
  hasOrderedResults?: boolean;
};

export type WorkerPoolOptions = TaskPoolOptions & {
  maxWorkers?: number;
};

type TerminatedResult = {
  id: number;
  isTerminated: true;
};

/**
 * Manages tasks asychronously, dispatching them to a "task runner" (either WebSocket or WebWorker) to run.
 *
 * Implementors are expected to call `_getAvailableTask` and run the task whenever a runner is available to run a task.
 */
export abstract class TaskPool<RunnerInfo> {
  #tasks: Task<RunnerInfo>[];

  /** Monotonically increasing. */
  #idCounter: number = 0;
  #lastEvaluatedId: number = -1;
  #resultQueue: (Result | ErrorResult | TerminatedResult)[];
  readonly hasOrderedResults: boolean;

  constructor({ hasOrderedResults = false }: TaskPoolOptions) {
    this.#tasks = [];
    this.hasOrderedResults = hasOrderedResults;
    this.#resultQueue = [];
  }

  /**
   *
   * @param type - the type of task (the task runner should use this to know what task to run)
   * @param payload - extra data to send to the task runner
   * @param internalState - Internal data to sychronize with the task runner.
   *                        This data is only sent if it has changed since the
   *                        last run.
   */
  runTask<
    T extends Action = Action<string, unknown, unknown>,
    U extends Result = Result<unknown>,
  >(
    type: T["type"],
    payload: T["payload"],
    internalState: T["internalState"],
    abortSignal?: AbortSignal,
  ): Promise<U["data"]> {
    const id = this.#idCounter++;
    return new Promise((resolve, reject) => {
      const task: Task<RunnerInfo> = {
        id,
        resolve,
        reject,
        payload,
        internalState,
        actionType: type,
        state: "waiting" as const,
      };

      this.#tasks.push(task);

      if (abortSignal) {
        abortSignal.addEventListener("abort", () => {
          this._terminateTask(task);
        });

        if (abortSignal.aborted) {
          this._terminateTask(task);
          return;
        }
      }

      const runnerInfo = this._getAvailableRunner();
      if (runnerInfo) {
        this._startTask(runnerInfo, task);
      }
    });
  }

  _getAvailableTask(): Task<RunnerInfo> | undefined {
    return this.#tasks.find((t) => t.state === "waiting");
  }

  abstract _getAvailableRunner(): RunnerInfo | null;

  /**
   * Runs task in the giver runner.
   * THE RUNNER MUST BE AVAILABLE!
   */
  _startTask(runnerInfo: RunnerInfo, task: Task<RunnerInfo>) {
    if (task.state === "terminated") {
      throw new Error("cannot start terminated task");
    } else if (task.state == "failed") {
      throw new Error("cannot start a failed task");
    }

    task.state = "working";
    task.runnerInfo = runnerInfo;

    this._delegateTask(task, runnerInfo);
  }

  /**
   * Delegates a task to a runner to be ran.
   */
  abstract _delegateTask(task: Task<RunnerInfo>, runnerInfo: RunnerInfo): void;

  /**
   * Make sure to call #evaluateQueue after this! It will clear any blocks
   * if they exist.
   */
  #insertQueue(result: Result | ErrorResult | TerminatedResult): void {
    if (this.hasOrderedResults) {
      const insertAt = this.#resultQueue.findIndex((r) => r.id > result.id);
      if (insertAt === -1) {
        this.#resultQueue.push(result);
      } else {
        this.#resultQueue.splice(insertAt, 0, result);
      }
    } else {
      this.#resultQueue.push(result);
    }
  }

  _resolveResult(result: Result | ErrorResult): void {
    this.#insertQueue(result);
    this.#evaluateQueue();
  }

  #evaluateQueue(): void {
    while (this.#resultQueue.length > 0) {
      const result = this.#resultQueue[0];
      if (this.hasOrderedResults && result.id !== this.#lastEvaluatedId + 1) {
        break;
      }

      this.#resultQueue.shift();
      this.#lastEvaluatedId = result.id;

      // TerminatedResults are already evaluated when they got terminated.
      if ("isTerminated" in result) {
        continue;
      }

      const taskIndex = this.#tasks.findIndex((t) => t.id === result.id);
      if (taskIndex >= 0) {
        const task = this.#tasks[taskIndex];
        this.#tasks.splice(taskIndex, 1);
        if ("errorMessage" in result) {
          task.state = "failed";
          task.runnerInfo = undefined;
          task.reject(new Error(result.errorMessage));
        } else {
          task.state = "done";
          task.runnerInfo = undefined;
          task.resolve(result.data);
        }
      }
    }
  }

  _terminateTask(task: Task<RunnerInfo>, error?: Error): void {
    if (task.state === "waiting" || task.state === "working") {
      const index = this.#tasks.indexOf(task);
      this.#tasks.splice(index, 1);

      task.state = "terminated";
      task.reject(error ?? new TaskTermination());
      if (task.runnerInfo) {
        this._stopTask(task, task.runnerInfo);
      }

      // need to populate the queue so it doesn't block everything else
      this.#insertQueue({
        id: task.id,
        isTerminated: true,
      });
      this.#evaluateQueue();
    }
  }

  _terminateAllTasks(error?: Error): void {
    while (this.#tasks.length > 0) {
      this._terminateTask(this.#tasks[0], error);
    }
  }

  /**
   * Stop a task from finishing.
   */
  abstract _stopTask(task: Task<RunnerInfo>, runnerInfo: RunnerInfo): void;
}

/**
 * See `/public/antimonyWorker.js` for an example of what a worker
 * used by this worker pool should look like.
 */
export class WorkerPool extends TaskPool<WorkerInfo> {
  readonly maxWorkers: number;

  #createWorker: () => Worker;
  #workers: WorkerInfo[];

  constructor(createWorker: () => Worker, options: WorkerPoolOptions = {}) {
    super(options);
    const { maxWorkers = 3 } = options;
    this.maxWorkers = maxWorkers;

    this.#createWorker = createWorker;
    this.#workers = [];
  }

  _delegateTask(task: Task<WorkerInfo>, workerInfo: WorkerInfo): void {
    workerInfo.state = "busy";
    workerInfo.worker.postMessage({
      type: task.actionType,
      id: task.id,
      payload: task.payload,
      internalState:
        workerInfo.internalState !== task.internalState
          ? task.internalState
          : undefined,
    } as Action);

    if (workerInfo !== task.internalState) {
      workerInfo.internalState = task.internalState;
    }
  }

  _getAvailableRunner(): WorkerInfo | null {
    const worker = this.#workers.find((w) => w.state === "idle");
    if (worker) {
      return worker;
    } else if (this.#workers.length >= this.maxWorkers) {
      return null;
    } else {
      const newWorker = this.#createWorker();
      const newWorkerInfo: WorkerInfo = {
        state: "idle",
        worker: newWorker,
        internalState: null,
      };
      this.#initializeWorker(newWorkerInfo);
      this.#workers.push(newWorkerInfo);
      return newWorkerInfo;
    }
  }

  #initializeWorker(workerInfo: WorkerInfo) {
    workerInfo.worker.addEventListener(
      "message",
      (e: MessageEvent<Result | ErrorResult>) => {
        this._resolveResult(e.data);

        const availableTask = this._getAvailableTask();
        if (availableTask) {
          this._startTask(workerInfo, availableTask);
        } else {
          workerInfo.state = "idle";
        }
      },
    );
  }

  _stopTask(_: Task<WorkerInfo>, workerInfo: WorkerInfo) {
    workerInfo.state = "dead";
    workerInfo.worker.terminate();

    const index = this.#workers.indexOf(workerInfo);
    this.#workers.splice(index, 1);
  }
}

type SocketInfo = {
  socket: WebSocket;
  internalState?: unknown;
};

export class SocketTaskPool extends TaskPool<SocketInfo> {
  #socketInfo: SocketInfo | null;

  constructor(options: TaskPoolOptions = {}) {
    super(options);
    this.#socketInfo = null;
  }

  connect(url: string) {
    if (this.#socketInfo) {
      this.#socketInfo.socket.close();
      this._terminateAllTasks(new Error("Connection closed."));
    }

    const socket = new WebSocket(url);
    const socketInfo: SocketInfo = {
      socket: socket,
      internalState: undefined,
    };

    this.#socketInfo = socketInfo;

    socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;

      const json: unknown = JSON.parse(event.data);
      if (
        typeof json === "object" &&
        json !== null &&
        "id" in json &&
        typeof json.id === "number"
      ) {
        if ("errorMessage" in json && typeof json.errorMessage === "string") {
          this._resolveResult({
            id: json.id,
            errorMessage: json.errorMessage,
          });
        } else if ("data" in json) {
          this._resolveResult({
            id: json.id,
            data: json.data,
          });
        }
      }
    });

    socket.addEventListener("open", () => {
      if (this.#socketInfo !== socketInfo) return;

      let task: Task<SocketInfo> | undefined;
      while ((task = this._getAvailableTask())) {
        this._startTask(socketInfo, task);
      }
    });

    socket.addEventListener("close", () => {
      if (this.#socketInfo !== socketInfo) return;
      this._terminateAllTasks(new Error("Connection closed."));
    });

    socket.addEventListener("error", () => {
      if (this.#socketInfo !== socketInfo) return;
      this._terminateAllTasks(new Error("WebSocket errored."));
    });
  }

  _getAvailableRunner(): SocketInfo | null {
    if (this.#socketInfo?.socket?.readyState !== WebSocket.CONNECTING) {
      return this.#socketInfo;
    }
    return null;
  }

  _delegateTask(task: Task<SocketInfo>, socketInfo: SocketInfo): void {
    if (socketInfo.socket.readyState === WebSocket.CLOSED) {
      this._terminateTask(task, new Error("WebSocket connecting..."));
      return;
    } else if (socketInfo.socket.readyState !== WebSocket.OPEN) {
      this._terminateTask(task, new Error("WebSocket closed."));
    }

    socketInfo.socket.send(
      JSON.stringify({
        type: task.actionType,
        id: task.id,
        internalState:
          socketInfo.internalState !== task.internalState
            ? task.internalState
            : undefined,
        payload: task.payload,
      } as Action),
    );
  }

  _stopTask(_task: Task<SocketInfo>, _runnerInfo: SocketInfo): void {
    // for now, canceling a task just means ignoring it when
    // the result is sent back
  }
}

export class TaskTermination extends Error {}
