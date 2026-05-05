/**
 * Concept Detector — Week 3
 *
 * Rule-based detection of JS concepts from Babel AST.
 * Returns an array of concept tag strings.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ASTNode = any;

function walk(node: ASTNode, visitor: (n: ASTNode) => void): void {
  if (!node || typeof node !== "object") return;
  visitor(node);
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach((c) => walk(c, visitor));
    } else if (child && typeof child === "object" && child.type) {
      walk(child, visitor);
    }
  }
}

export function detectConcepts(ast: ASTNode): string[] {
  const tags = new Set<string>();

  let hasSetTimeout    = false;
  let hasPromise       = false;
  let hasVarDecl       = false;
  let hasFnDecl        = false;
  let hasConsoleLog    = false;
  let hasAssignment    = false;

  walk(ast, (node) => {
    // setTimeout
    if (
      node.type === "CallExpression" &&
      node.callee?.type === "Identifier" &&
      node.callee?.name === "setTimeout"
    ) {
      hasSetTimeout = true;
    }

    // Promise.resolve().then
    if (
      node.type === "CallExpression" &&
      node.callee?.type === "MemberExpression" &&
      node.callee?.property?.name === "then" &&
      node.callee?.object?.type === "CallExpression" &&
      node.callee?.object?.callee?.type === "MemberExpression" &&
      node.callee?.object?.callee?.object?.name === "Promise" &&
      node.callee?.object?.callee?.property?.name === "resolve"
    ) {
      hasPromise = true;
    }

    // var declarations
    if (node.type === "VariableDeclaration" && node.kind === "var") {
      hasVarDecl = true;
    }

    // function declarations
    if (node.type === "FunctionDeclaration") {
      hasFnDecl = true;
    }

    // console.log
    if (
      node.type === "CallExpression" &&
      node.callee?.type === "MemberExpression" &&
      node.callee?.object?.name === "console" &&
      node.callee?.property?.name === "log"
    ) {
      hasConsoleLog = true;
    }

    // assignments
    if (node.type === "AssignmentExpression") {
      hasAssignment = true;
    }
  });

  // Always present
  if (hasConsoleLog) tags.add("call stack");
  tags.add("execution context");

  if (hasVarDecl || hasFnDecl) {
    tags.add("hoisting");
  }

  if (hasFnDecl) {
    tags.add("function execution context");
  }

  if (hasSetTimeout) {
    tags.add("macrotask queue");
    tags.add("event loop");
    tags.add("Web APIs");
  }

  if (hasPromise) {
    tags.add("microtask queue");
    tags.add("event loop");
  }

  if (hasSetTimeout && hasPromise) {
    tags.add("task queue priority");
  }

  if (hasAssignment && hasVarDecl) {
    tags.add("variable scope");
  }

  return Array.from(tags);
}
