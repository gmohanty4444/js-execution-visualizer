# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9 (root), 5.7 (Angular artifact)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Applications

### JS Execution Visualizer (`artifacts/js-visualizer`)
- **Frontend**: Angular 19 standalone components, Monaco Editor (CDN), port 4200
- **Workflow**: `JS Visualizer (Angular)`
- **Purpose**: Step-by-step synchronous JS execution visualizer (Week 1)
- **Features**: var hoisting, function hoisting, console.log tracing, function call simulation

### API Server (`artifacts/api-server`)
- **Port**: 8080 (proxied at `/api`)
- **Key routes**:
  - `GET /api/healthz` — health check
  - `POST /api/analyze` — JS execution analysis (body: `{ code: string }`, returns `{ steps: string[] }`)
- **Interpreter**: `src/interpreter.ts` — Babel AST-based custom JS execution simulator

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/js-visualizer run dev` — run Angular dev server (port 4200)

## Interpreter Scope (Week 1)

- `var` declarations (hoisting)
- Function declarations (hoisting)
- `console.log` calls (value resolution)
- Named function calls (new execution context)
- Binary expressions (+, -, *, /)
- Assignment expressions

## Out of Scope (Week 2+)

- `let`/`const`
- Async/await, Promises, setTimeout
- Closures / lexical scope chain
- Arguments, return values tracking

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
