import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";

function classifyStep(step: string): string {
  if (step.includes("Execution Context created")) return "context";
  if (step.includes("hoisted")) return "hoist";
  if (step.startsWith("Execution starts")) return "start";
  if (step.startsWith("console.log")) return "log";
  if (step.startsWith("Calling function")) return "call";
  if (step.includes("assigned")) return "assign";
  if (step.includes("execution complete")) return "return";
  return "default";
}

@Component({
  selector: "app-result",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="result-wrapper">
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
    .result-wrapper {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #0f1117;
    }

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

    .step-item[data-kind="context"] { border-left-color: #6366f1; }
    .step-item[data-kind="hoist"]   { border-left-color: #f59e0b; }
    .step-item[data-kind="start"]   { border-left-color: #4ade80; }
    .step-item[data-kind="log"]     { border-left-color: #22d3ee; }
    .step-item[data-kind="call"]    { border-left-color: #a78bfa; }
    .step-item[data-kind="assign"]  { border-left-color: #fb923c; }
    .step-item[data-kind="return"]  { border-left-color: #64748b; }
    .step-item[data-kind="default"] { border-left-color: #2d3748; }

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
  `],
})
export class ResultComponent {
  @Input() steps: string[] = [];
  @Input() loading = false;
  @Input() error = "";

  classify(step: string): string {
    return classifyStep(step);
  }
}
