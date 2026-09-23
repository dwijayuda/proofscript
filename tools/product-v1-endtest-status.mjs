export function productV1ClosureSatisfied({ executionPassed, skipLean } = {}) {
  return executionPassed === true && skipLean !== true;
}
