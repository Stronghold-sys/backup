/**
 * 🔇 GLOBAL CONSOLE DISABLER
 * 
 * This file MUST be imported FIRST before any other code
 * It completely disables ALL console output globally
 */

// ✅ Disable ALL console methods immediately
const noOp = () => {};

// Store original methods (in case we need them for debugging)
const original = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
  trace: console.trace,
  table: console.table,
  group: console.group,
  groupEnd: console.groupEnd,
  groupCollapsed: console.groupCollapsed,
  time: console.time,
  timeEnd: console.timeEnd,
  count: console.count,
  assert: console.assert,
  clear: console.clear,
  dir: console.dir,
  dirxml: console.dirxml,
};

// Override ALL console methods
console.log = noOp;
console.warn = noOp;
console.error = noOp;
console.info = noOp;
console.debug = noOp;
console.trace = noOp;
console.table = noOp;
console.group = noOp;
console.groupEnd = noOp;
console.groupCollapsed = noOp;
console.time = noOp;
console.timeEnd = noOp;
console.count = noOp;
console.assert = noOp;
console.clear = noOp;
console.dir = noOp;
console.dirxml = noOp;

// Export function to restore console (for debugging)
export function restoreConsole() {
  console.log = original.log;
  console.warn = original.warn;
  console.error = original.error;
  console.info = original.info;
  console.debug = original.debug;
  console.trace = original.trace;
  console.table = original.table;
  console.group = original.group;
  console.groupEnd = original.groupEnd;
  console.groupCollapsed = original.groupCollapsed;
  console.time = original.time;
  console.timeEnd = original.timeEnd;
  console.count = original.count;
  console.assert = original.assert;
  console.clear = original.clear;
  console.dir = original.dir;
  console.dirxml = original.dirxml;
}

// Export no-op for use in code
export const noOpLogger = {
  log: noOp,
  warn: noOp,
  error: noOp,
  info: noOp,
  debug: noOp,
  trace: noOp,
};

export default noOp;
