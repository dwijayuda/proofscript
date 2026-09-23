export function productV1ClosureSatisfied({ executionPassed, skipLean, diagnoseAll } = {}) {
  return executionPassed === true && skipLean !== true && diagnoseAll !== true;
}
