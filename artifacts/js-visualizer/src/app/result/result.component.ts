import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Queues } from "../services/api.service";

function classifyStep(step: string): string {
  if (step.includes("Execution Context created"))      return "context";
  if (step.includes("hoisted"))                        return "hoist";
  if (step.startsWith("Execution starts"))             return "start";
  if (step.startsWith("console.log"))                  return "log";
  if (step.startsWith("Call Stack →"))                 return "callstack";
  if (step.includes("assigned"))                       return "assign";
  if (step.includes("execution complete"))             return "return";
  if (step.includes("setTimeout registered"))          return "macro";
  if (step.includes("Promise.then registered"))        return "micro";
  if (step.includes("Macrotask"))                      return "macro";
  if (step.includes("Microtask"))                      return "micro";
  if (step.includes("Event Loop"))                     return "eventloop";
  return "default";
}

@Component({
  selector: "app-result",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="result-wrapper">

      <!-- ── Queue Panels (shown once results arrive) ── -->
      @if (!loading && steps.length > 0) {
        <div class="queues-section">
          <div class="queue-card micro-card">
            <div class="queue-title">
              <span class="queue-dot micro-dot"></span>
              Microtask Queue
            </div>
            @if (queues.microtasks.length === 0) {
              <div class="queue-empty">empty</div>
            } @else {
              <ul class="queue-list">
                @for (item of queues.microtasks; track $index) {
                  <li class="queue-item micro-item">{{ item }}</li>
                }
              </ul>
            }
          </div>

          <div class="queue-card macro-card">
            <div class="queue-title">
              <span class="queue-dot macro-dot"></span>
              Macrotask Queue
            </div>
            @if (queues.macrotasks.length === 0) {
              <div class="queue-empty">empty</div>
            } @else {
              <ul class="queue-list">
                @for (item of queues.macrotasks; track $index) {
                  <li class="queue-item macro-item">{{ item }}</li>
                }
              </ul>
            }
          </div>

          <div class="phase-legend">
            <div class="phase-badge sync-badge">Sync Phase</div>
            <div class="phase-arrow">→</div>
            <div class="phase-badge micro-badge">Microtask Phase</div>
            <div class="phase-arrow">→</div>
            <div class="phase-badge macro-badge">Macrotask Phase</div>
          </div>
        </div>
      }

      <!-- ── States ── -->
      @if (loading) {
        <div class="state-msg">
          <div class="spinner"></div>
          <span>Analyzing…</span>
        </div>
      } @else if (error) {
        <div class="error-block">
          <div class="error-title">Error</div>
          <pre class="error-body">{{ error }}</pre>
        </div>
      } @else if (steps.length === 0) {
        <div class="state-msg empty">
          Paste JavaScript in the editor and click <strong>Run Code</strong> to see the execution steps.
        </div>
      } @else {
        <div class="steps-label">Execution Steps</div>
        <ol class="steps-list">
          @for (step of steps; track $index) {
            <li class="step-item" [attr.data-kind]="classify(step)">
              <span class="step-num">{{ $index + 1 }}</span>
              <span class="step-text">{{ step }}</span>
            </li>
          }
        </ol>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .result-wrapper {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #0f1117;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 0;
    }

    /* ── Queue panels ─────────────────────────────────── */
    .queues-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .queue-card {
      border-radius: 8px;
      padding: 10px 14px;
      border: 1px solid #2d3748;
      background: #161b27;
    }

    .micro-card { border-left: 3px solid #a78bfa; }
    .macro-card { border-left: 3px solid #f59e0b; }

    .queue-title {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 8px;
    }

    .queue-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .micro-dot { background: #a78bfa; }
    .macro-dot { background: #f59e0b; }

    .queue-empty {
      font-size: 0.78rem;
      color: #475569;
      font-style: italic;
    }

    .queue-list {
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .queue-item {
      font-size: 0.78rem;
      padding: 3px 10px;
      border-radius: 4px;
      font-family: 'Fira Code', Consolas, monospace;
    }

    .micro-item { background: #2d1f4e; color: #c4b5fd; border: 1px solid #5b21b6; }
    .macro-item { background: #3d2400; color: #fbbf24; border: 1px solid #92400e; }

    /* ── Phase legend ─────────────────────────────────── */
    .phase-legend {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 4px;
    }

    .phase-badge {
      font-size: 0.68rem;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: 999px;
      letter-spacing: 0.04em;
    }

    .sync-badge  { background: #1e3a5f; color: #93c5fd; }
    .micro-badge { background: #2d1f4e; color: #c4b5fd; }
    .macro-badge { background: #3d2400; color: #fbbf24; }

    .phase-arrow { color: #475569; font-size: 0.75rem; }

    /* ── Steps ────────────────────────────────────────── */
    .steps-label {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: #475569;
      padding: 0 2px;
    }

    .steps-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .step-item {
      display: flex;
      align-items: baseline;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 6px;
      background: #161b27;
      border-left: 3px solid transparent;
      transition: background 0.1s;
    }

    .step-item:hover { background: #1e2636; }

    .step-item[data-kind="context"]   { border-left-color: #6366f1; }
    .step-item[data-kind="hoist"]     { border-left-color: #f59e0b; }
    .step-item[data-kind="start"]     { border-left-color: #4ade80; }
    .step-item[data-kind="log"]       { border-left-color: #22d3ee; }
    .step-item[data-kind="callstack"] { border-left-color: #94a3b8; }
    .step-item[data-kind="assign"]    { border-left-color: #fb923c; }
    .step-item[data-kind="return"]    { border-left-color: #64748b; }
    .step-item[data-kind="micro"]     { border-left-color: #a78bfa; }
    .step-item[data-kind="macro"]     { border-left-color: #f59e0b; }
    .step-item[data-kind="eventloop"] { border-left-color: #4ade80; }
    .step-item[data-kind="default"]   { border-left-color: #2d3748; }

    .step-num {
      font-size: 0.7rem;
      color: #475569;
      font-variant-numeric: tabular-nums;
      min-width: 20px;
      text-align: right;
      flex-shrink: 0;
      font-family: Consolas, monospace;
    }

    .step-text {
      font-size: 0.88rem;
      color: #cbd5e1;
      font-family: 'Fira Code', Consolas, monospace;
      line-height: 1.4;
      word-break: break-word;
    }

    /* ── Misc states ──────────────────────────────────── */
    .state-msg {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #64748b;
      font-size: 0.88rem;
      padding-top: 24px;
      line-height: 1.6;
    }

    .state-msg strong { color: #94a3b8; }

    .spinner {
      width: 16px; height: 16px;
      border: 2px solid #2d3748;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      flex-shrink: 0;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .error-block {
      background: #1c1016;
      border: 1px solid #7f1d1d;
      border-radius: 6px;
      padding: 12px 16px;
    }

    .error-title {
      font-size: 0.78rem;
      font-weight: 700;
      color: #f87171;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 6px;
    }

    .error-body {
      font-size: 0.84rem;
      color: #fca5a5;
      white-space: pre-wrap;
      font-family: Consolas, monospace;
      line-height: 1.5;
    }
  `],
})
export class ResultComponent {
  @Input() steps: string[] = [];
  @Input() queues: Queues = { microtasks: [], macrotasks: [] };
  @Input() loading = false;
  @Input() error = "";

  classify(step: string): string {
    return classifyStep(step);
  }
}
