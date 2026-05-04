/**
 * JS Execution Simulator — Week 2
 *
 * Extends Week 1 (var hoisting, function hoisting, console.log, function calls)
 * with async simulation:
 *   - setTimeout  → macrotask queue
 *   - Promise.resolve().then → microtask queue
 *   - Event loop simulation (sync → microtasks → macrotasks)
 */

import { parse } from "@babel/parser";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ASTNode = any;

interface FunctionDef {
  __isFn: true;
  name: string;
  node: ASTNode;
}

type ScopeValue = undefined | null | number | string | boolean | FunctionDef;

interface Scope {
  [key: string]: ScopeValue;
}

interface QueueEntry {
  label: string;
  node: ASTNode; // ArrowFunctionExpression or FunctionExpression
}

export interface AnalysisOutput {
  steps: string[];
  queues: {
    microtasks: string[];
    macrotasks: string[];
  };
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function analyzeCode(code: string): AnalysisOutput {
  const steps: string[] = [];
  const microtaskQueue: QueueEntry[] = [];
  const macrotaskQueue: QueueEntry[] = [];

  let ast: ASTNode;
  try {
    ast = parse(code, { sourceType: "script" });
  } catch (err) {
    throw new Error(`Parse error: ${(err as Error).message}`);
  }

  const globalScope: Scope = {};

  // ── Phase 1: Setup ──
  steps.push("Global Execution Context created");
  hoistDeclarations(ast.program.body, globalScope, steps);

  // ── Phase 2: Synchronous execution ──
  steps.push("Execution starts");
  executeBody(ast.program.body, globalScope, steps, microtaskQueue, macrotaskQueue);

  // Capture queue snapshot (what was registered during sync phase)
  const queueSnapshot = {
    microtasks: microtaskQueue.map((e) => e.label),
    macrotasks: macrotaskQueue.map((e) => e.label),
  };

  // ── Phase 3: Event Loop ──
  steps.push("Call Stack is empty → Event Loop starts");

  // Drain microtasks first
  drainMicrotasks(microtaskQueue, macrotaskQueue, globalScope, steps);

  // Then process macrotasks (one at a time, flushing microtasks after each)
  if (macrotaskQueue.length > 0) {
    steps.push("Microtasks complete → Processing Macrotask Queue");
    while (macrotaskQueue.length > 0) {
      const task = macrotaskQueue.shift()!;
      steps.push(`Macrotask dequeued → ${task.label}`);
      executeCallback(task.node, globalScope, steps, microtaskQueue, macrotaskQueue);
      drainMicrotasks(microtaskQueue, macrotaskQueue, globalScope, steps);
    }
  }

  steps.push("Event Loop complete");

  return { steps, queues: queueSnapshot };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function drainMicrotasks(
  microtaskQueue: QueueEntry[],
  macrotaskQueue: QueueEntry[],
  scope: Scope,
  steps: string[],
): void {
  if (microtaskQueue.length === 0) return;
  steps.push("Processing Microtask Queue");
  while (microtaskQueue.length > 0) {
    const task = microtaskQueue.shift()!;
    steps.push(`Microtask dequeued → ${task.label}`);
    executeCallback(task.node, scope, steps, microtaskQueue, macrotaskQueue);
  }
}

function executeCallback(
  node: ASTNode,
  scope: Scope,
  steps: string[],
  microtaskQueue: QueueEntry[],
  macrotaskQueue: QueueEntry[],
): void {
  if (
    node.type === "ArrowFunctionExpression" ||
    node.type === "FunctionExpression"
  ) {
    if (node.body?.type === "BlockStatement") {
      // () => { ... } — block body
      executeBody(node.body.body, scope, steps, microtaskQueue, macrotaskQueue);
    } else if (node.body) {
      // () => expr — concise body is a single expression
      executeExpr(node.body, scope, steps, microtaskQueue, macrotaskQueue);
    }
  }
}

// ─── Hoisting ─────────────────────────────────────────────────────────────────

function hoistDeclarations(
  body: ASTNode[],
  scope: Scope,
  steps: string[],
): void {
  for (const node of body) {
    if (node.type === "FunctionDeclaration" && node.id) {
      const fn: FunctionDef = { __isFn: true, name: node.id.name, node };
      scope[node.id.name] = fn;
      steps.push(`Function '${node.id.name}' hoisted`);
    }
  }
  for (const node of body) {
    if (node.type === "VariableDeclaration" && node.kind === "var") {
      for (const declarator of node.declarations) {
        if (
          declarator.id.type === "Identifier" &&
          !(declarator.id.name in scope)
        ) {
          scope[declarator.id.name] = undefined;
          steps.push(`Variable '${declarator.id.name}' hoisted → undefined`);
        }
      }
    }
  }
}

// ─── Execution ────────────────────────────────────────────────────────────────

function executeBody(
  body: ASTNode[],
  scope: Scope,
  steps: string[],
  microtaskQueue: QueueEntry[],
  macrotaskQueue: QueueEntry[],
): void {
  for (const node of body) {
    executeNode(node, scope, steps, microtaskQueue, macrotaskQueue);
  }
}

function executeNode(
  node: ASTNode,
  scope: Scope,
  steps: string[],
  microtaskQueue: QueueEntry[],
  macrotaskQueue: QueueEntry[],
): void {
  switch (node.type) {
    case "FunctionDeclaration":
      break;

    case "VariableDeclaration":
      if (node.kind === "var") {
        for (const declarator of node.declarations) {
          if (declarator.id.type === "Identifier" && declarator.init) {
            const value = evaluateExpr(declarator.init, scope);
            scope[declarator.id.name] = value as ScopeValue;
            steps.push(`${declarator.id.name} = ${formatValue(value)} assigned`);
          }
        }
      }
      break;

    case "ExpressionStatement":
      executeExpr(node.expression, scope, steps, microtaskQueue, macrotaskQueue);
      break;

    case "ReturnStatement":
      break;

    default:
      break;
  }
}

function executeExpr(
  node: ASTNode,
  scope: Scope,
  steps: string[],
  microtaskQueue: QueueEntry[],
  macrotaskQueue: QueueEntry[],
): void {
  if (node.type === "AssignmentExpression") {
    if (node.left.type === "Identifier") {
      const value = evaluateExpr(node.right, scope);
      scope[node.left.name] = value as ScopeValue;
      steps.push(`${node.left.name} = ${formatValue(value)} assigned`);
    }
    return;
  }

  if (node.type !== "CallExpression") return;

  // ── console.log(...) ──────────────────────────────────────────────────────
  if (
    node.callee.type === "MemberExpression" &&
    node.callee.object?.name === "console" &&
    node.callee.property?.name === "log"
  ) {
    const argTexts: string[] = [];
    const argVals: unknown[] = [];
    for (const arg of node.arguments) {
      argTexts.push(getExprText(arg));
      argVals.push(evaluateExpr(arg, scope));
    }
    steps.push(`Call Stack → console.log`);
    steps.push(
      `console.log(${argTexts.join(", ")}) → ${argVals.map(formatValue).join(", ")}`,
    );
    return;
  }

  // ── setTimeout(callback, delay) ───────────────────────────────────────────
  if (node.callee.type === "Identifier" && node.callee.name === "setTimeout") {
    const callbackArg = node.arguments[0] as ASTNode | undefined;
    if (callbackArg) {
      steps.push("Call Stack → setTimeout");
      macrotaskQueue.push({ label: "timeout callback", node: callbackArg });
      steps.push("setTimeout registered → moved to Macrotask Queue");
    }
    return;
  }

  // ── Promise.resolve().then(callback) ─────────────────────────────────────
  if (
    node.callee.type === "MemberExpression" &&
    node.callee.property?.name === "then" &&
    node.callee.object?.type === "CallExpression" &&
    node.callee.object?.callee?.type === "MemberExpression" &&
    node.callee.object?.callee?.object?.name === "Promise" &&
    node.callee.object?.callee?.property?.name === "resolve"
  ) {
    const callbackArg = node.arguments[0] as ASTNode | undefined;
    if (callbackArg) {
      steps.push("Call Stack → Promise.resolve().then");
      microtaskQueue.push({ label: "promise callback", node: callbackArg });
      steps.push("Promise.then registered → moved to Microtask Queue");
    }
    return;
  }

  // ── Named function call ───────────────────────────────────────────────────
  if (node.callee.type === "Identifier") {
    const fnName: string = node.callee.name;
    const fn = scope[fnName];

    if (fn && typeof fn === "object" && (fn as FunctionDef).__isFn) {
      steps.push(`Call Stack → ${fnName}()`);
      const fnDef = fn as FunctionDef;
      const fnScope: Scope = { ...scope };
      steps.push("Function Execution Context created");
      hoistDeclarations(fnDef.node.body.body, fnScope, steps);
      executeBody(fnDef.node.body.body, fnScope, steps, microtaskQueue, macrotaskQueue);
      steps.push(`Function '${fnName}' execution complete → popped from Call Stack`);
    } else {
      steps.push(`Calling ${fnName}() [not defined in scope]`);
    }
  }
}

// ─── Expression evaluator (pure, no side-effects) ────────────────────────────

function evaluateExpr(node: ASTNode, scope: Scope): unknown {
  switch (node.type) {
    case "NumericLiteral":  return node.value;
    case "StringLiteral":   return node.value;
    case "BooleanLiteral":  return node.value;
    case "NullLiteral":     return null;
    case "Identifier":
      return node.name in scope ? scope[node.name] : undefined;
    case "BinaryExpression": {
      const l = evaluateExpr(node.left, scope) as number;
      const r = evaluateExpr(node.right, scope) as number;
      switch (node.operator) {
        case "+": return (l as unknown as string) + (r as unknown as string);
        case "-": return (l as number) - (r as number);
        case "*": return (l as number) * (r as number);
        case "/": return (l as number) / (r as number);
        default:  return undefined;
      }
    }
    case "UnaryExpression":
      if (node.operator === "-") return -(evaluateExpr(node.argument, scope) as number);
      if (node.operator === "!") return !evaluateExpr(node.argument, scope);
      return undefined;
    default:
      return undefined;
  }
}

function getExprText(node: ASTNode): string {
  if (node.type === "Identifier")     return node.name;
  if (node.type === "NumericLiteral") return String(node.value);
  if (node.type === "StringLiteral")  return `"${node.value}"`;
  return "(expr)";
}

function formatValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null)      return "null";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "object" && (value as FunctionDef).__isFn)
    return `[Function: ${(value as FunctionDef).name}]`;
  return String(value);
}
