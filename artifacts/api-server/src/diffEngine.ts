/**
 * Diff Engine — Week 3
 *
 * Compares user's predicted output against actual interpreter output.
 * Generates mismatch entries with rule-based explanations.
 */

export interface DiffEntry {
  index: number;
  expected: string;
  got: string | undefined;
  reason: string;
}

export interface ComparisonResult {
  isCorrect: boolean;
  diff: DiffEntry[];
}

/**
 * Rule-based reason generator.
 * Looks at the pair (expected, got) and the full arrays to pick a human-readable explanation.
 */
function generateReason(
  expected: string,
  got: string | undefined,
  actual: string[],
  predicted: string[],
  index: number,
): string {
  const hasPromise = actual.includes("promise") || predicted.includes("promise");
  const hasTimeout = actual.includes("timeout") || predicted.includes("timeout");

  // Microtask / macrotask ordering confusion
  if (hasPromise && hasTimeout) {
    const actualPromiseIdx  = actual.indexOf("promise");
    const actualTimeoutIdx  = actual.indexOf("timeout");
    const predPromiseIdx    = predicted.indexOf("promise");
    const predTimeoutIdx    = predicted.indexOf("timeout");

    if (
      predTimeoutIdx < predPromiseIdx &&
      actualPromiseIdx < actualTimeoutIdx
    ) {
      return "Microtasks (Promises) always run before macrotasks (setTimeout) — the event loop drains the microtask queue completely before picking up the next macrotask.";
    }

    if (
      predPromiseIdx < predTimeoutIdx &&
      actualTimeoutIdx < actualPromiseIdx
    ) {
      return "Macrotasks (setTimeout) run after all microtasks. Your prediction had them before the Promise callback.";
    }
  }

  // Hoisting: predicted undefined for a variable logged early
  if (got === "undefined" || expected === "undefined") {
    return "Variable hoisting: var declarations are hoisted to the top of the scope and initialised as undefined before any code runs.";
  }

  // Length mismatch — extra items in prediction
  if (index >= actual.length) {
    return "Your prediction has more output lines than the program actually produces.";
  }

  // Length mismatch — fewer items in prediction
  if (got === undefined) {
    return "Your prediction is missing this output line — the program produces more output than you predicted.";
  }

  // Generic order mistake
  if (actual.includes(got ?? "") && predicted.includes(expected)) {
    return `"${got}" and "${expected}" appear in swapped order — check the execution phase (sync → microtask → macrotask) in which each runs.`;
  }

  return `Expected "${expected}" but your prediction had "${got ?? "(nothing)"}".`;
}

export function compareOutputs(
  actual: string[],
  predicted: string[],
): ComparisonResult {
  const maxLen = Math.max(actual.length, predicted.length);
  const diff: DiffEntry[] = [];

  for (let i = 0; i < maxLen; i++) {
    const exp = actual[i];
    const got = predicted[i];

    if (exp !== got) {
      diff.push({
        index: i,
        expected: exp,
        got,
        reason: generateReason(exp, got, actual, predicted, i),
      });
    }
  }

  return {
    isCorrect: diff.length === 0,
    diff,
  };
}
