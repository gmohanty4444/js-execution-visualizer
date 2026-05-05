import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { EditorComponent } from "./editor/editor.component";
import { ResultComponent } from "./result/result.component";
import { ApiService, AnalysisResult, Queues, DiffEntry } from "./services/api.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [EditorComponent, ResultComponent, FormsModule],
  template: `
    <div class="app-container">
      <header class="app-header">
        <div class="header-content">
          <h1>JS Execution Visualizer</h1>
          <p class="subtitle">Event loop · Microtask &amp; Macrotask queue simulation — Week 3: Expectation vs Reality</p>
        </div>
      </header>

      <main class="main-layout">
        <!-- ── Left panel: editor + prediction ── -->
        <div class="left-col">
          <section class="panel editor-panel">
            <div class="panel-header">
              <span class="panel-label">Code Input</span>
              <button class="run-btn" (click)="runCode()" [disabled]="loading">
                {{ loading ? "Analyzing..." : "Run Code" }}
              </button>
            </div>
            <app-editor (codeChange)="onCodeChange($event)" />
          </section>

          <section class="panel prediction-panel">
            <div class="panel-header">
              <span class="panel-label">Your Prediction</span>
              <span class="panel-hint">one output per line</span>
            </div>
            <div class="prediction-body">
              <textarea
                class="prediction-input"
                [(ngModel)]="predictionText"
                placeholder="What do you think the output will be?&#10;&#10;start&#10;end&#10;promise&#10;timeout"
                spellcheck="false"
              ></textarea>
            </div>
          </section>
        </div>

        <!-- ── Right panel: result ── -->
        <section class="panel result-panel">
          <div class="panel-header">
            <span class="panel-label">
              {{ hasPrediction ? "Expectation vs Reality" : "Execution Steps" }}
            </span>
            @if (steps.length > 0 && !hasPrediction) {
              <span class="step-count">{{ steps.length }} steps</span>
            }
            @if (result?.isCorrect === true) {
              <span class="badge correct-badge">✅ Correct</span>
            }
            @if (result?.isCorrect === false) {
              <span class="badge incorrect-badge">❌ Incorrect</span>
            }
          </div>
          <app-result
            [steps]="steps"
            [queues]="queues"
            [loading]="loading"
            [error]="error"
            [actualOutput]="result?.actualOutput ?? []"
            [predictedOutput]="result?.predictedOutput ?? []"
            [diff]="result?.diff ?? []"
            [concepts]="result?.concepts ?? []"
            [isCorrect]="result?.isCorrect"
            [hasPrediction]="hasPrediction"
          />
        </section>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    .app-header {
      background: #161b27;
      border-bottom: 1px solid #2d3748;
      padding: 14px 24px;
      flex-shrink: 0;
    }

    .header-content h1 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #f0f4ff;
      letter-spacing: -0.02em;
    }

    .subtitle {
      font-size: 0.78rem;
      color: #64748b;
      margin-top: 2px;
    }

    .main-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* Left column: editor (flex) + prediction (fixed) */
    .left-col {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
      border-right: 1px solid #2d3748;
      overflow: hidden;
    }

    .panel {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }

    .editor-panel {
      flex: 1;
      min-height: 0;
    }

    .prediction-panel {
      flex-shrink: 0;
      height: 160px;
      border-top: 1px solid #2d3748;
    }

    .result-panel {
      flex: 1;
      min-width: 0;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      background: #161b27;
      border-bottom: 1px solid #2d3748;
      flex-shrink: 0;
      gap: 8px;
    }

    .panel-label {
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #64748b;
    }

    .panel-hint {
      font-size: 0.7rem;
      color: #3d4f66;
      margin-left: auto;
      font-style: italic;
    }

    .step-count {
      font-size: 0.72rem;
      color: #4ade80;
      font-variant-numeric: tabular-nums;
    }

    .badge {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 999px;
      letter-spacing: 0.04em;
    }

    .correct-badge   { background: #052e16; color: #4ade80; border: 1px solid #166534; }
    .incorrect-badge { background: #2d0a0a; color: #f87171; border: 1px solid #7f1d1d; }

    /* Prediction textarea */
    .prediction-body {
      flex: 1;
      display: flex;
      overflow: hidden;
    }

    .prediction-input {
      flex: 1;
      background: #0a0d14;
      color: #cbd5e1;
      border: none;
      outline: none;
      resize: none;
      padding: 12px 16px;
      font-family: 'Fira Code', Consolas, monospace;
      font-size: 0.85rem;
      line-height: 1.6;
    }

    .prediction-input::placeholder { color: #2d3748; }

    .run-btn {
      padding: 6px 18px;
      background: #3b82f6;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }

    .run-btn:hover:not(:disabled) { background: #2563eb; }
    .run-btn:disabled {
      background: #1e3a5f;
      color: #64748b;
      cursor: not-allowed;
    }
  `],
})
export class AppComponent {
  code = "";
  predictionText = "";
  steps: string[] = [];
  queues: Queues = { microtasks: [], macrotasks: [] };
  result: AnalysisResult | null = null;
  loading = false;
  error = "";

  get hasPrediction(): boolean {
    return this.predictionText.trim().length > 0;
  }

  constructor(private apiService: ApiService) {}

  onCodeChange(code: string): void {
    this.code = code;
  }

  private parsePrediction(): string[] {
    return this.predictionText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  runCode(): void {
    if (!this.code.trim()) return;
    this.loading = true;
    this.error = "";
    this.steps = [];
    this.queues = { microtasks: [], macrotasks: [] };
    this.result = null;

    const prediction = this.hasPrediction ? this.parsePrediction() : undefined;

    this.apiService.analyze(this.code, prediction).subscribe({
      next: (res: AnalysisResult) => {
        this.result = res;
        this.steps = res.steps;
        this.queues = res.queues ?? { microtasks: [], macrotasks: [] };
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.error ?? err?.message ?? "Failed to analyze code.";
        this.loading = false;
      },
    });
  }
}
