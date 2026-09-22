// Imperative TypeScript host demo for the generated ProofScript CRUD module.
// This host code is ordinary application glue. The domain logic remains in
// src/Main.ps and is checked by the ProofScript software-profile path.
// Trust boundary: this is executable interop, not the trusted kernel.

import {
  afterUpdate,
  createTask,
  deleteTask,
  findTask,
  totalEstimate,
  updateStatus,
} from "../dist-js/Main.js";
import { __ps } from "../dist-js/proofscript-runtime.js";
import type { PsStructValue, PsValue } from "../dist-js/proofscript-runtime.js";

type Curried4 = (a: PsValue) => (b: PsValue) => (c: PsValue) => (d: PsValue) => PsValue;
type Curried3 = (a: PsValue) => (b: PsValue) => (c: PsValue) => PsValue;
type Curried2 = (a: PsValue) => (b: PsValue) => PsValue;

function asStruct(value: PsValue, label: string): PsStructValue {
  if (
    typeof value !== "object" ||
    value === null ||
    !("__psInductive" in value) ||
    !("__psCtor" in value) ||
    !("fields" in value)
  ) {
    throw new Error(`${label} is not a ProofScript structure/inductive value`);
  }
  return value as PsStructValue;
}

function expectExceptOk(value: PsValue): PsValue {
  const except = asStruct(value, "Except result");
  if (except.__psInductive !== "Except") throw new Error("expected Except result");
  if (except.__psCtor === 1) return except.fields[0];
  throw new Error(`ProofScript createTask rejected: ${String(except.fields[0])}`);
}

function isOptionSome(value: PsValue): boolean {
  const option = asStruct(value, "Option result");
  if (option.__psInductive !== "Option") throw new Error("expected Option result");
  return option.__psCtor === 1;
}

function listToArray(value: PsValue): PsStructValue[] {
  const out: PsStructValue[] = [];
  let cursor = asStruct(value, "List");
  for (let depth = 0; depth < 1000; depth += 1) {
    if (cursor.__psInductive !== "List") throw new Error("expected List value");
    if (cursor.__psCtor === 0) return out;
    if (cursor.__psCtor !== 1) throw new Error(`unknown List constructor ${cursor.__psCtor}`);
    out.push(asStruct(cursor.fields[0], "Task"));
    cursor = asStruct(cursor.fields[1], "List.tail");
  }
  throw new Error("bounded list traversal exceeded");
}

function natToString(value: PsValue): string {
  if (typeof value !== "bigint") throw new Error(`expected Nat/BigInt, got ${typeof value}`);
  return value.toString();
}

const priorityNames = ["low", "normal", "high"] as const;
const statusNames = ["todo", "doing", "done", "archived"] as const;

function enumName(names: readonly string[], value: PsValue): string {
  const tagged = asStruct(value, "enum value");
  return names[tagged.__psCtor] ?? `unknown(${tagged.__psCtor})`;
}

function taskToObject(task: PsStructValue) {
  if (task.__psInductive !== "Task") throw new Error("expected Task");
  return {
    id: natToString(task.fields[0]),
    title: String(task.fields[1]),
    priority: enumName(priorityNames, task.fields[2]),
    status: enumName(statusNames, task.fields[3]),
    estimate: natToString(task.fields[4]),
  };
}

function storeNextId(store: PsStructValue): string {
  if (store.__psInductive !== "TaskStore") throw new Error("expected TaskStore");
  return natToString(store.fields[0]);
}

function storeTasks(store: PsStructValue) {
  if (store.__psInductive !== "TaskStore") throw new Error("expected TaskStore");
  return listToArray(store.fields[1]).map(taskToObject);
}

const create = createTask as Curried4;
const update = updateStatus as Curried3;
const remove = deleteTask as Curried2;
const lookup = findTask as Curried2;
const total = totalEstimate as (store: PsValue) => PsValue;

const high = __ps.Struct_mk("Priority", 2, []);
const doing = __ps.Struct_mk("TaskStatus", 1, []);

let store = expectExceptOk(create(afterUpdate)("Ship demo")(high)(8n));
store = update(store)(3n)(doing);
store = remove(store)(2n);

const storeValue = asStruct(store, "TaskStore");
const tasks = storeTasks(storeValue);
const summary = {
  nextId: storeNextId(storeValue),
  totalEstimate: natToString(total(store)),
  foundTask3: isOptionSome(lookup(store)(3n)),
  taskTitles: tasks.map(task => task.title),
  tasks,
};

console.log(JSON.stringify(summary, null, 2));
