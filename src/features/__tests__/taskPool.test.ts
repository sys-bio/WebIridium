import { afterEach, it, expect, describe } from "vitest";
import { WorkerPool, TaskTermination } from "../taskPool";
import {
  createCountingWorker,
  resetCountingWorkerCount,
} from "@/testing-utils/countingWorker";
import {
  MockWorker,
  resetWorkerResponseDelay,
  setWorkerResponseDelay,
  resetWorkerFailMode,
  setWorkerFailMode,
} from "@/testing-utils/mockWorker";
import { createControlledWorker } from "@/testing-utils/controlledWorker";

describe("WorkerPool", () => {
  afterEach(() => {
    resetCountingWorkerCount();
    resetWorkerResponseDelay();
    resetWorkerFailMode();
  });

  it("should return result of queued task", async () => {
    const pool = new WorkerPool(createCountingWorker);
    const result = await pool.runTask("count", 0, null);
    expect(result).toBe(0);
  });

  it("should return result of sequence of queued task", async () => {
    const pool = new WorkerPool(createCountingWorker);
    const result = await pool.runTask("count", 0, null);
    expect(result).toBe(0);

    const result2 = await pool.runTask("count", 0, null);
    expect(result2).toBe(1);
  });

  it("should return result of multiple queued tasks", async () => {
    const pool = new WorkerPool(createCountingWorker);
    const results = Promise.all([
      pool.runTask("count", 0, null),
      pool.runTask("count", 0, null),
      pool.runTask("count", 0, null),
      pool.runTask("count", 0, null),
      pool.runTask("count", 0, null),
      pool.runTask("count", 0, null),
    ]);

    expect(await results).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("should terminate tasks and worker", async () => {
    setWorkerResponseDelay(1);

    let worker: MockWorker;
    const pool = new WorkerPool(() => {
      worker = createCountingWorker() as unknown as MockWorker;
      return worker as unknown as Worker;
    });

    const abortController = new AbortController();
    const expectPromise = expect(
      pool.runTask("count", 0, null, abortController.signal),
    ).rejects.toThrowError(new TaskTermination());

    abortController.abort();

    await expectPromise;
    expect(worker!.terminated).toBeTruthy();
  });

  it("should not run terminated tasks", async () => {
    setWorkerResponseDelay(5);

    const pool = new WorkerPool(createCountingWorker, {
      maxWorkers: 1,
    });

    void pool.runTask("count", 0, null);

    // This one should not run
    const abortController = new AbortController();
    const expectPromise = expect(
      pool.runTask("count", 0, null, abortController.signal),
    ).rejects.toThrowError();
    abortController.abort();

    expect(await pool.runTask("count", 0, null)).toBe(1);
    await expectPromise;
  });

  it("should fail with worker termination when abort signal already aborted on task start", async () => {
    const pool = new WorkerPool(createCountingWorker);
    const abortController = new AbortController();
    abortController.abort();

    await expect(() =>
      pool.runTask("count", 0, null, abortController.signal),
    ).rejects.toThrowError(new TaskTermination());
  });

  it("should terminate all workers when only one signal is used", async () => {
    setWorkerResponseDelay(5);

    const abortController = new AbortController();
    const pool = new WorkerPool(createCountingWorker);
    const promises = [
      pool.runTask("count", 0, null, abortController.signal),
      pool.runTask("count", 0, null, abortController.signal),
      pool.runTask("count", 0, null, abortController.signal),
    ];

    abortController.abort();

    expect(await Promise.allSettled(promises)).toSatisfy(
      (results: PromiseSettledResult<unknown>[]) => {
        return results.every((r) => r.status === "rejected");
      },
    );
  });

  it(
    "should return result of 25 queued tasks with randomized delays",
    { timeout: 5000 },
    async () => {
      setWorkerResponseDelay(25, 500);
      const pool = new WorkerPool(createCountingWorker, { maxWorkers: 10 });
      const promises = Array.from({ length: 25 }).map((_) =>
        pool.runTask("count", 0, null),
      );
      const results = Promise.all(promises);
      const expected = Array.from({ length: 25 }).map((_, index) => index);

      expect(await results).toEqual(expected);
    },
  );

  it(
    "should return result of 48 queued tasks with randomized delays with every odd task terminated",
    { timeout: 1000 },
    async () => {
      setWorkerResponseDelay(5, 250);

      const pool = new WorkerPool(createCountingWorker, { maxWorkers: 10 });
      const promises: Promise<unknown>[] = [];
      for (let i = 0; i < 48; i++) {
        const abortController = i % 2 === 0 ? null : new AbortController();
        promises.push(pool.runTask("count", 0, null, abortController?.signal));
        abortController?.abort();
      }

      const r = await Promise.allSettled(promises);
      for (const [i, result] of r.entries()) {
        if (i % 2 === 0) {
          expect(result.status).toEqual("fulfilled");
        } else {
          expect(result.status).toBe("rejected");
        }
      }
    },
  );

  it("should reject when failing", async () => {
    setWorkerFailMode("always");
    const pool = new WorkerPool(createCountingWorker);
    await expect(pool.runTask("count", 0, null)).rejects.toThrow();
  });

  it("should reject when failing with multiple", async () => {
    const pool = new WorkerPool(createCountingWorker, { maxWorkers: 2 });
    setWorkerFailMode("always");
    const promises: Promise<unknown>[] = [
      pool.runTask("count", 0, null),
      pool.runTask("count", 0, null),
      pool.runTask("count", 0, null),
    ];

    const r = await Promise.allSettled(promises);
    for (const result of r) {
      expect(result.status).toBe("rejected");
    }
  });

  it("should only send internal state when required", async () => {
    const pool = new WorkerPool(createCountingWorker);

    let [state, didSendState] = (await pool.runTask("state", 0, 1)) as [
      number,
      boolean,
    ];
    expect(state).toBe(1);
    expect(didSendState).toBe(true);

    [state, didSendState] = (await pool.runTask("state", 0, 1)) as [
      number,
      boolean,
    ];
    expect(state).toBe(1);
    expect(didSendState).toBe(false);
  });

  it("should return results in the correct order", async () => {
    const [worker, controls] = createControlledWorker();
    const pool = new WorkerPool(() => worker, {
      maxWorkers: 1,
      hasOrderedResults: true,
    });
    const result = pool.runTask("stub", 1, null);
    const result2 = pool.runTask("stub", 2, null);

    void controls.resolveTag(2, 2);
    void controls.resolveTag(1, 1);

    expect(await result).toBe(1);
    expect(await result2).toBe(2);
  });

  it("should return results in the correct order even if one is delayed", async () => {
    const [worker, controls] = createControlledWorker();
    const pool = new WorkerPool(() => worker, {
      maxWorkers: 1,
    });
    const result = pool.runTask("stub", 1, null);
    const result2 = pool.runTask("stub", 2, null);

    setTimeout(() => {
      void controls.resolveTag(1, 1);
    }, 100);
    void controls.resolveTag(2, 2);

    expect(await result).toBe(1);
    expect(await result2).toBe(2);
  });

  it("should return results in the correct order (big)", async () => {
    const [worker, controls] = createControlledWorker();
    const pool = new WorkerPool(() => worker, {
      maxWorkers: 1,
    });
    const result = Array.from({ length: 100 }).map((_, i) =>
      pool.runTask("stub", i, null),
    );

    const numbers = Array.from({ length: 100 }).map((_, i) => i);
    while (numbers.length > 0) {
      const [number] = numbers.splice(
        Math.floor(Math.random() * numbers.length),
        1,
      );
      void controls.resolveTag(number, number);
    }

    for (let i = 0; i < 100; i++) {
      expect(await result[i]).toEqual(i);
    }
  });

  it("should return results of task in order even if one fails", async () => {
    setWorkerResponseDelay(50);

    let worker: MockWorker;
    const pool = new WorkerPool(
      () => {
        worker = createCountingWorker() as unknown as MockWorker;
        return worker as unknown as Worker;
      },
      {
        maxWorkers: 1,
        hasOrderedResults: true,
      },
    );

    const result1 = pool.runTask("count", 0, null);
    const result2 = pool.runTask("count", 0, null);

    const abortController = new AbortController();
    const expectPromise = expect(
      pool.runTask("count", 0, null, abortController.signal),
    ).rejects.toThrowError(new TaskTermination());

    const result3 = pool.runTask("count", 0, null);

    abortController.abort();

    await expectPromise;
    expect(await result1).toEqual(0);
    expect(await result2).toEqual(1);
    expect(await result3).toEqual(2);
  });

  it("should return result of queued task (ordered)", async () => {
    const pool = new WorkerPool(createCountingWorker, {
      hasOrderedResults: true,
    });
    const result = await pool.runTask("count", 0, null);
    expect(result).toBe(0);
  });

  it("should return result of sequence of queued task (ordered)", async () => {
    const pool = new WorkerPool(createCountingWorker, {
      hasOrderedResults: true,
    });
    const result = await pool.runTask("count", 0, null);
    expect(result).toBe(0);

    const result2 = await pool.runTask("count", 0, null);
    expect(result2).toBe(1);
  });

  it("should return result of multiple queued tasks (ordered)", async () => {
    const pool = new WorkerPool(createCountingWorker, {
      hasOrderedResults: true,
    });
    const results = Promise.all([
      pool.runTask("count", 0, null),
      pool.runTask("count", 0, null),
      pool.runTask("count", 0, null),
      pool.runTask("count", 0, null),
      pool.runTask("count", 0, null),
      pool.runTask("count", 0, null),
    ]);

    expect(await results).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("should terminate tasks and worker (ordered)", async () => {
    setWorkerResponseDelay(1);

    let worker: MockWorker;
    const pool = new WorkerPool(
      () => {
        worker = createCountingWorker() as unknown as MockWorker;
        return worker as unknown as Worker;
      },
      {
        hasOrderedResults: true,
      },
    );

    const abortController = new AbortController();
    const expectPromise = expect(
      pool.runTask("count", 0, null, abortController.signal),
    ).rejects.toThrowError(new TaskTermination());

    abortController.abort();

    await expectPromise;
    expect(worker!.terminated).toBeTruthy();
  });

  it("should not run terminated tasks (ordered)", async () => {
    setWorkerResponseDelay(5);

    const pool = new WorkerPool(createCountingWorker, {
      maxWorkers: 1,
      hasOrderedResults: true,
    });

    void pool.runTask("count", 0, null);

    // This one should not run
    const abortController = new AbortController();
    const expectPromise = expect(
      pool.runTask("count", 0, null, abortController.signal),
    ).rejects.toThrowError();
    abortController.abort();

    expect(await pool.runTask("count", 0, null)).toBe(1);
    await expectPromise;
  });
});
