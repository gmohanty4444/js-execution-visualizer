/**
 * JS Execution Simulator
 *
 * Parses JavaScript code using @babel/parser into an AST and walks through
 * it to simulate synchronous execution. Produces a human-readable list of
 * step descriptions mirroring how the JS engine processes code.
 *
 * Scope: var declarations, function declarations, console.log, function calls.
 * Out of scope: let/const, async, closures beyond simple scope copy.
 */

import { parse } from "@babel/parser";

// Minimal AST node type — using any avoids importing all of @babel/types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ASTNode = any;

/** A stored function definition (hoisted or declared inline). */
interface FunctionDef {
  __isFn: true;
  name: string;
  node: ASTNode; // FunctionDeclaration AST node
}

/** Values that can live in a scope. */
type ScopeValue = undefined | null | number | string | boolean | FunctionDef;

/** A simple variable store keyed by name. */
interface Scope {
  [key: string]: ScopeValue;
}

/**
 * Main entry point. Parses `code`, simulates execution, and returns an
 * ordered list of step descriptions.
 */
export function analyzeCode(code: string): string[] {
  const steps: string[] = [];

  // --- Parse ---
  let ast: ASTNode;
  try {
    ast = parse(code, { sourceType: "script" });
  } catch (err) {
    throw new Error(`Parse error: ${(err as Error).message}`);
  }

  const globalScope: Scope = {};

  // --- Global Execution Context setup ---
  steps.push("Global Execution Context created");

  // --- Hoisting phase ---
  hoistDeclarations(ast.program.body, globalScope, steps);

  // --- Execution phase ---
  steps.push("Execution starts");
  executeBody(ast.program.body, globalScope, steps);

  return steps;
}

/**
 * Hoisting phase for a given scope body:
 * 1. Function declarations get fully hoisted (name + body stored).
 * 2. `var` declarations get hoisted to `undefined`.
 */
function hoistDeclarations(
  body: ASTNode[],
  scope: Scope,
  steps: string[],
): void {
  // Pass 1 — function declarations
  for (const node of body) {
    if (node.type === "FunctionDeclaration" && node.id) {
      const fn: FunctionDef = { __isFn: true, name: node.id.name, node };
      scope[node.id.name] = fn;
      steps.push(`Function '${node.id.name}' hoisted`);
    }
  }

  // Pass 2 — var declarations (skip if already in scope as a function)
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

/** Execute each statement in a body array sequentially. */
function executeBody(body: ASTNode[], scope: Scope, steps: string[]): void {
  for (const node of body) {
    executeNode(node, scope, steps);
  }
}

/** Dispatch a single statement node to the appropriate handler. */
function executeNode(node: ASTNode, scope: Scope, steps: string[]): void {
  switch (node.type) {
    case "FunctionDeclaration":
      // Already hoisted — nothing to do during execution phase.
      break;

    case "VariableDeclaration":
      // Only `var` is in scope for Week 1.
      if (node.kind === "var") {
        for (const declarator of node.declarations) {
          if (declarator.id.type === "Identifier" && declarator.init) {
            const value = evaluateExpr(declarator.init, scope);
            scope[declarator.id.name] = value as ScopeValue;
            steps.push(
              `${declarator.id.name} = ${formatValue(value)} assigned`,
            );
          }
        }
      }
      break;

    case "ExpressionStatement":
      executeExpr(node.expression, scope, steps);
      break;

    case "ReturnStatement":
      // Simple return — noted but not deeply tracked yet.
      break;

    default:
      break;
  }
}

/** Execute an expression that may have side-effects (calls, assignments). */
function executeExpr(node: ASTNode, scope: Scope, steps: string[]): void {
  // Assignment: a = 5
  if (node.type === "AssignmentExpression") {
    if (node.left.type === "Identifier") {
      const value = evaluateExpr(node.right, scope);
      scope[node.left.name] = value as ScopeValue;
      steps.push(`${node.left.name} = ${formatValue(value)} assigned`);
    }
    return;
  }

  if (node.type === "CallExpression") {
    // console.log(...)
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
      const displayArgs = argTexts.join(", ");
      const displayVals = argVals.map(formatValue).join(", ");
      steps.push(`console.log(${displayArgs}) → ${displayVals}`);
      return;
    }

    // Named function call: test()
    if (node.callee.type === "Identifier") {
      const fnName: string = node.callee.name;
      const fn = scope[fnName];

      if (fn && typeof fn === "object" && (fn as FunctionDef).__isFn) {
        steps.push(`Calling function ${fnName}()`);
        const fnDef = fn as FunctionDef;

        // Create a new function scope (simple copy — no closure chain for Week 1)
        const fnScope: Scope = { ...scope };
        steps.push("Function Execution Context created");

        // Hoist inside the function body
        hoistDeclarations(fnDef.node.body.body, fnScope, steps);

        // Execute the function body
        executeBody(fnDef.node.body.body, fnScope, steps);

        steps.push(`Function '${fnName}' execution complete`);
      } else {
        // Unknown function — note it and move on
        steps.push(`Calling function ${fnName}() [not defined in scope]`);
      }
    }
  }
}

/**
 * Pure expression evaluator — returns the JS value without side-effects.
 * Handles literals, identifiers, and basic binary expressions.
 */
function evaluateExpr(node: ASTNode, scope: Scope): unknown {
  switch (node.type) {
    case "NumericLiteral":
      return node.value;
    case "StringLiteral":
      return node.value;
    case "BooleanLiteral":
      return node.value;
    case "NullLiteral":
      return null;
    case "Identifier":
      // Return undefined if variable not declared (TDZ-like behaviour)
      return node.name in scope ? scope[node.name] : undefined;
    case "BinaryExpression": {
      const l = evaluateExpr(node.left, scope) as number;
      const r = evaluateExpr(node.right, scope) as number;
      switch (node.operator) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          return l / r;
        default:
          return undefined;
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

/** Get a short source-text representation of an expression for display. */
function getExprText(node: ASTNode): string {
  if (node.type === "Identifier") return node.name;
  if (node.type === "NumericLiteral") return String(node.value);
  if (node.type === "StringLiteral") return `"${node.value}"`;
  return "(expr)";
}

/** Format a runtime value for display in step descriptions. */
function formatValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "object" && (value as FunctionDef).__isFn)
    return `[Function: ${(value as FunctionDef).name}]`;
  return String(value);
}
