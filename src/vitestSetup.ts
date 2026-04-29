/* eslint-disable */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { vi, afterEach, beforeAll } from "vitest";

// default mocks
vi.mock("@/app/EditorPanel.tsx");
vi.mock("@/components/Toast.tsx");
vi.mock("@/features/workers");
vi.mock("@/features/db");
vi.mock("echarts");
vi.mock("echarts/core");
vi.mock("monaco-editor");

afterEach(cleanup);

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {
      // do nothing
    }
    unobserve() {
      // do nothing
    }
    disconnect() {
      // do nothing
    }
  };
});

// stuff for Select component
// copied from https://github.com/radix-ui/primitives/issues/1822
/**
 * JSDOM doesn't implement PointerEvent so we need to mock our own implementation
 * Default to mouse left click interaction
 * https://github.com/radix-ui/primitives/issues/1822
 * https://github.com/jsdom/jsdom/pull/2666
 */
class MockPointerEvent extends Event {
  button: number;
  ctrlKey: boolean;
  pointerType: string;

  constructor(type: string, props: PointerEventInit) {
    super(type, props);
    this.button = props.button || 0;
    this.ctrlKey = props.ctrlKey || false;
    this.pointerType = props.pointerType || "mouse";
  }
}

window.PointerEvent = MockPointerEvent as any;
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();

// Mocks for media query stuff (used for theme detection).
class MockMediaQueryList extends EventTarget {
  get matches() {
    return true;
  }
}

window.matchMedia = vi.fn((_) => {
  return new MockMediaQueryList() as MediaQueryList;
});

// Mock localStorage.
// This is because newer node versions seem to change localStorage such that our
// older tests are failing. This mocks localStorage in memory manually
// so that we have full control.
const mockLocalStorage = {
  storage: new Map<string, string>(),

  clear(): void {
    this.storage.clear();
  },

  getItem(key: string): string | null {
    return this.storage.get(key) ?? null;
  },

  removeItem(key: string) {
    this.storage.delete(key);
  },

  setItem(key: string, value: string) {
    this.storage.set(key, value);
  },

  key(index: number): string | null {
    const iterator = this.storage.keys();
    for (let i = 0; i < index; i++) {
      iterator.next();
    }
    return iterator.next().value ?? null;
  },

  get length(): number {
    return this.storage.size;
  },
};

window.localStorage = mockLocalStorage;
