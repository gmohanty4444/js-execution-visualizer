# JS Execution Visualizer

An interactive, browser-based tool that shows you exactly how JavaScript runs — step by step. Paste any snippet of JavaScript, hit **Run Code**, and watch the interpreter walk through hoisting, the call stack, microtask queue, and macrotask queue in plain English.

Live demo: [js-execution-visualizer.replit.app](https://js-execution-visualizer.replit.app)

---

## What it does

The visualizer simulates JavaScript's execution model so you can see what the engine does at every stage:

1. **Hoisting** — `var` declarations and function declarations are lifted to the top of scope before any code runs.
2. **Synchronous execution** — statements execute top-to-bottom; each function call pushes a new execution context onto the call stack.
3. **Event loop** — once the call stack is empty, microtasks (`Promise.resolve().then`) are drained first, then macrotasks (`setTimeout`) are processed one at a time.

Each phase is surfaced as a numbered list of plain-English steps alongside a snapshot of the microtask and macrotask queues at the moment the synchronous phase ended.

---

## Monorepo structure

```
artifacts/
├── api-server/          # Express 5 API — JS interpreter lives here
│   └── src/
│       ├── interpreter.ts   # Babel-AST-based execution simulator
│       └── routes/
│           ├── analyze.ts   # POST /api/analyze
│           └── health.ts    # GET  /api/healthz
└── js-visualizer/       # Angular 19 frontend
    └── src/app/
        ├── editor/          # Monaco Editor (CDN) code input panel
        ├── result/          # Execution-steps output panel
        └── services/        # HTTP client (calls /api/analyze)
```

Shared tooling lives at the repo root. Both artifacts are TypeScript-strict and type-checked together via `pnpm run typecheck`.

---

## Running locally

**Prerequisites:** Node.js 24, pnpm 9+

```bash
# Install all workspace dependencies
pnpm install

# Start the API server (proxied at /api, port 8080)
pnpm --filter @workspace/api-server run dev

# Start the Angular dev server (port 4200)
pnpm --filter @workspace/js-visualizer run dev
```

Then open `http://localhost:4200` in your browser.

### Other useful commands

| Command | What it does |
|---|---|
| `pnpm run typecheck` | Full TypeScript check across all packages |
| `pnpm run build` | Typecheck + build all packages |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API hooks and Zod schemas from OpenAPI spec |

---

## Supported JavaScript constructs

The interpreter handles a deliberate subset of JavaScript to focus on execution-model concepts:

| Construct | Supported | Notes |
|---|---|---|
| `var` declarations | Yes | Hoisted to `undefined` before execution |
| Function declarations | Yes | Hoisted and callable anywhere in scope |
| `console.log()` | Yes | Arguments are resolved and logged as a step |
| Named function calls | Yes | Each call creates its own execution context |
| `setTimeout(cb, delay)` | Yes | Callback queued as a **macrotask** |
| `Promise.resolve().then(cb)` | Yes | Callback queued as a **microtask** |
| Binary expressions (`+`, `-`, `*`, `/`) | Yes | Numeric and string operations |
| Assignment expressions | Yes | Updates the current scope |

### Not supported (by design)

- `let` / `const` — use `var` to see hoisting behaviour
- `for`, `while`, `do…while` loops
- `try` / `catch` / `throw`
- `switch` statements
- `class` declarations
- `import` / `export`
- `async` / `await` — use `Promise.resolve().then()` instead
- Closures / lexical scope chains
- Return value tracking across call frames

---

## How the interpreter works

The API server parses submitted code into a Babel AST (`@babel/parser`), then walks the tree in three phases:

1. **Hoisting pass** — collects all `FunctionDeclaration` nodes first, then all `var` declarators, recording each as a step.
2. **Synchronous execution pass** — evaluates each top-level statement in order. `setTimeout` callbacks are pushed onto the macrotask queue; `Promise.resolve().then` callbacks onto the microtask queue. No callbacks run yet.
3. **Event-loop simulation** — microtasks are drained to completion, then macrotasks are processed one at a time (draining microtasks after each).

The result is a `{ steps: string[], queues: { microtasks: string[], macrotasks: string[] } }` object returned by `POST /api/analyze`.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Angular 19 (standalone components) |
| Code editor | Monaco Editor (loaded from CDN) |
| API | Express 5 + TypeScript |
| JS parser | `@babel/parser` |
| Monorepo | pnpm workspaces |
| Validation | Zod |
| API contract | OpenAPI → Orval codegen |
