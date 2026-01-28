// TypeScript bindings for emscripten-generated code.  Automatically generated at compile time.
interface WasmModule {
}

type EmbindString = ArrayBuffer|Uint8Array|Uint8ClampedArray|Int8Array|string;
export interface ClassHandle {
  isAliasOf(other: ClassHandle): boolean;
  delete(): void;
  deleteLater(): this;
  isDeleted(): boolean;
  // @ts-ignore - If targeting lower than ESNext, this symbol might not exist.
  [Symbol.dispose](): void;
  clone(): this;
}
export interface VectorDouble extends ClassHandle {
  push_back(_0: number): void;
  resize(_0: number, _1: number): void;
  size(): number;
  get(_0: number): number | undefined;
  set(_0: number, _1: number): boolean;
}

export interface VectorColumn extends ClassHandle {
  size(): number;
  get(_0: number): Column | undefined;
  push_back(_0: Column): void;
  resize(_0: number, _1: Column): void;
  set(_0: number, _1: Column): boolean;
}

export interface VectorString extends ClassHandle {
  push_back(_0: EmbindString): void;
  resize(_0: number, _1: EmbindString): void;
  size(): number;
  get(_0: number): EmbindString | undefined;
  set(_0: number, _1: EmbindString): boolean;
}

export interface MapStringDouble extends ClassHandle {
  size(): number;
  get(_0: EmbindString): number | undefined;
  set(_0: EmbindString, _1: number): void;
  keys(): VectorString;
}

export type Column = {
  name: EmbindString,
  values: VectorDouble
};

export interface Result extends ClassHandle {
  columns: VectorColumn;
  Print(): void;
}

export interface Simulator extends ClassHandle {
  GetLastError(): string;
  LoadSbml(_0: EmbindString): boolean;
  GetFloatingSpecies(): MapStringDouble;
  GetBoundarySpecies(): MapStringDouble;
  GetParameters(): MapStringDouble;
  SetVariable(_0: EmbindString, _1: number): void;
  ResetVariables(): void;
  SimulateTimeCourse(_0: number, _1: number): Result;
}

interface EmbindModule {
  VectorDouble: {
    new(): VectorDouble;
  };
  VectorColumn: {
    new(): VectorColumn;
  };
  VectorString: {
    new(): VectorString;
  };
  MapStringDouble: {
    new(): MapStringDouble;
  };
  Result: {};
  Simulator: {
    new(): Simulator;
  };
}

export type MainModule = WasmModule & EmbindModule;
export default function MainModuleFactory (options?: unknown): Promise<MainModule>;
