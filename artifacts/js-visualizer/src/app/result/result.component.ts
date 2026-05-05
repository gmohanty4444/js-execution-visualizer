import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Queues, DiffEntry } from "../services/api.service";

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

      <!-- ── Error ── -->
      @if (error) {
        <div class="error-block">
          <div class="error-title">Error</div>
          <pre class="error-body">{{ error }}</pre>
        </div>
      }

      <!-- ── Loading ── -->
      @if (loading) {
        <div class="state-msg">
          <div class="spinner"></div>
          <span>Analyzing…</span>
        </div>
      }

      <!-- ── Empty state ── -->
      @if (!loading && !error && steps.length === 0) {
        <div class="empty-state">
          <p>Paste JavaScript in the editor and click <strong>Run Code</strong> to see execution steps.</p>
          <p class="empty-hint">Optionally, type your predicted output in the panel below the editor before running — the tool will compare your prediction against the actual result.</p>
        </div>
      }

      <!-- ══ COMPARISON MODE (prediction provided) ══ -->
      @if (!loading && !error && hasPrediction && actualOutput.length > 0) {

        <!-- Section 1 & 2: Side-by-side prediction vs actual -->
        <div class="compare-grid">
          <div class="compare-col">
            <div class="col-label">Your Prediction</div>
            <ol class="output-list">
              @for (line of predictedOutput; track $index) {
                <li class="output-item"
                  [class.match]="actualOutput[$index] === line"
                  [class.mismatch]="actualOutput[$index] !== line">
                  <span class="output-num">{{ $index + 1 }}</span>
                  <span class="output-text">{{ line }}</span>
                  @if (actualOutput[$index] === line) {
                    <span class="match-icon">✓</span>
                  } @else {
                    <span class="mismatch-icon">✗</span>
                  }
                </li>
              }
              @if (predictedOutput.length < actualOutput.length) {
                @for (extra of missingLines; track $index) {
                  <li class="output-item missing">
                    <span class="output-num">{{ predictedOutput.length + $index + 1 }}</span>
                    <span class="output-text missing-text">(missing)</span>
                    <span class="mismatch-icon">✗</span>
                  </li>
                }
              }
            </ol>
          </div>

          <div class="compare-divider"></div>

          <div class="compare-col">
            <div class="col-label">Actual Output</div>
            <ol class="output-list">
              @for (line of actualOutput; track $index) {
                <li class="output-item"
                  [class.match]="predictedOutput[$index] === line"
                  [class.mismatch]="predictedOutput[$index] !== line">
                  <span class="output-num">{{ $index + 1 }}</span>
                  <span class="output-text">{{ line }}</span>
                  @if (predictedOutput[$index] === line) {
                    <span class="match-icon">✓</span>
                  } @else {
                    <span class="mismatch-icon">✗</span>
                  }
                </li>
              }
            </ol>
          </div>
        </div>

        <!-- Section 3: Mistake breakdown -->
        @if (diff.length > 0) {
          <div class="section">
            <div class="section-label">Mistake Breakdown</div>
            <div class="diff-list">
              @for (entry of diff; track entry.index) {
                <div class="diff-item">
                  <div class="diff-pos">Position {{ entry.index + 1 }}</div>
                  <div class="diff-row">
                    <span class="diff-tag correct-tag">Expected</span>
                    <code class="diff-val correct-val">{{ entry.expected ?? "(nothing)" }}</code>
                  </div>
                  <div class="diff-row">
                    <span class="diff-tag wrong-tag">You wrote</span>
                    <code class="diff-val wrong-val">{{ entry.got ?? "(nothing)" }}</code>
                  </div>
                  <div class="diff-reason">
                    <span class="reason-icon">💡</span>
                    {{ entry.reason }}
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Section 4: Concepts -->
        @if (concepts.length > 0) {
          <div class="section">
            <div class="section-label">Concepts Involved</div>
            <div class="concept-badges">
              @for (tag of concepts; track tag) {
                <span class="concept-badge">{{ tag }}</span>
              }
            </div>
          </div>
        }

        <div class="steps-divider">
          <span>Execution Steps</span>
        </div>
      }

      <!-- ══ EXECUTION STEPS (always shown when results exist) ══ -->
      @if (!loading && !error && steps.length > 0) {

        <!-- Queue panels -->
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
      gap: 14px;
      min-height: 0;
    }

    /* ── Empty state ────────────────────────────────── */
    .empty-state {
      padding-top: 20px;
      color: #64748b;
      font-size: 0.88rem;
      line-height: 1.7;
    }
    .empty-state strong { color: #94a3b8; }
    .empty-hint { margin-top: 8px; color: #3d4f66; font-size: 0.8rem; }

    /* ── Comparison grid ────────────────────────────── */
    .compare-grid {
      display: flex;
      gap: 0;
      background: #161b27;
      border: 1px solid #2d3748;
      border-radius: 8px;
      overflow: hidden;
    }

    .compare-col {
      flex: 1;
      padding: 12px 14px;
      min-width: 0;
    }

    .compare-divider {
      width: 1px;
      background: #2d3748;
      flex-shrink: 0;
    }

    .col-label {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 10px;
    }

    .output-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .output-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 8px;
      border-radius: 4px;
      font-family: 'Fira Code', Consolas, monospace;
      font-size: 0.82rem;
    }

    .output-item.match    { background: #052e16; border: 1px solid #166534; }
    .output-item.mismatch { background: #2d0a0a; border: 1px solid #7f1d1d; }
    .output-item.missing  { background: #1a1a0a; border: 1px solid #44400a; opacity: 0.7; }

    .output-num {
      font-size: 0.68rem;
      color: #475569;
      min-width: 16px;
      text-align: right;
      flex-shrink: 0;
    }

    .output-text { flex: 1; color: #cbd5e1; }
    .missing-text { color: #475569; font-style: italic; }

    .match-icon    { color: #4ade80; font-size: 0.75rem; flex-shrink: 0; }
    .mismatch-icon { color: #f87171; font-size: 0.75rem; flex-shrink: 0; }

    /* ── Section wrapper ────────────────────────────── */
    .section { display: flex; flex-direction: column; gap: 8px; }

    .section-label {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #64748b;
    }

    /* ── Diff list ──────────────────────────────────── */
    .diff-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .diff-item {
      background: #161b27;
      border: 1px solid #2d3748;
      border-left: 3px solid #f87171;
      border-radius: 6px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .diff-pos {
      font-size: 0.68rem;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .diff-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .diff-tag {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      flex-shrink: 0;
      min-width: 68px;
      text-align: center;
    }

    .correct-tag { background: #052e16; color: #4ade80; border: 1px solid #166534; }
    .wrong-tag   { background: #2d0a0a; color: #f87171; border: 1px solid #7f1d1d; }

    .diff-val {
      font-family: 'Fira Code', Consolas, monospace;
      font-size: 0.85rem;
      padding: 2px 8px;
      border-radius: 3px;
    }

    .correct-val { background: #052e16; color: #86efac; }
    .wrong-val   { background: #2d0a0a; color: #fca5a5; }

    .diff-reason {
      font-size: 0.8rem;
      color: #94a3b8;
      line-height: 1.5;
      display: flex;
      gap: 6px;
      align-items: flex-start;
      padding-top: 2px;
    }

    .reason-icon { flex-shrink: 0; }

    /* ── Concepts ───────────────────────────────────── */
    .concept-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .concept-badge {
      font-size: 0.72rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 999px;
      background: #1e2d4a;
      color: #93c5fd;
      border: 1px solid #1d4ed8;
      letter-spacing: 0.03em;
      cursor: default;
    }

    .concept-badge:hover { background: #1e3a5f; }

    /* ── Steps divider ──────────────────────────────── */
    .steps-divider {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #2d3748;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .steps-divider::before,
    .steps-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #2d3748;
    }

    /* ── Queue panels ───────────────────────────────── */
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

    .queue-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .micro-dot { background: #a78bfa; }
    .macro-dot { background: #f59e0b; }

    .queue-empty { font-size: 0.78rem; color: #475569; font-style: italic; }

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

    /* ── Phase legend ───────────────────────────────── */
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

    /* ── Steps ──────────────────────────────────────── */
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

    /* ── Misc ───────────────────────────────────────── */
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
  @Input() actualOutput: string[] = [];
  @Input() predictedOutput: string[] = [];
  @Input() diff: DiffEntry[] = [];
  @Input() concepts: string[] = [];
  @Input() isCorrect: boolean | undefined = undefined;
  @Input() hasPrediction = false;

  get missingLines(): null[] {
    const count = this.actualOutput.length - this.predictedOutput.length;
    return count > 0 ? Array(count).fill(null) : [];
  }

  classify(step: string): string {
    return classifyStep(step);
  }
}
