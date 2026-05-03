import { Component } from "@angular/core";
import { EditorComponent } from "./editor/editor.component";
import { ResultComponent } from "./result/result.component";
import { ApiService, AnalysisResult } from "./services/api.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [EditorComponent, ResultComponent],
  template: `
    <div class="app-container">
      <header class="app-header">
        <div class="header-content">
          <h1>JS Execution Visualizer</h1>
          <p class="subtitle">
            Step-by-step synchronous JavaScript execution — Week 1
          </p>
        </div>
      </header>

      <main class="main-layout">
        <section class="panel editor-panel">
          <div class="panel-header">
            <span class="panel-label">Code Input</span>
            <button
              class="run-btn"
              (click)="runCode()"
              [disabled]="loading"
            >
              {{ loading ? "Analyzing..." : "Run Code" }}
            </button>
          </div>
          <app-editor (codeChange)="onCodeChange($event)" />
        </section>

        <section class="panel result-panel">
          <div class="panel-header">
            <span class="panel-label">Execution Steps</span>
            @if (steps.length > 0) {
              <span class="step-count">{{ steps.length }} steps</span>
            }
          </div>
          <app-result [steps]="steps" [loading]="loading" [error]="error" />
        </section>
      </main>
    </div>
  `,
  styles: [
    `
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
        gap: 0;
      }

      .panel {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
        min-width: 0;
      }

      .editor-panel {
        border-right: 1px solid #2d3748;
      }

      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        background: #161b27;
        border-bottom: 1px solid #2d3748;
        flex-shrink: 0;
        gap: 12px;
      }

      .panel-label {
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #64748b;
      }

      .step-count {
        font-size: 0.72rem;
        color: #4ade80;
        font-variant-numeric: tabular-nums;
      }

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
        flex-shrink: 0;
      }

      .run-btn:hover:not(:disabled) {
        background: #2563eb;
      }

      .run-btn:disabled {
        background: #1e3a5f;
        color: #64748b;
        cursor: not-allowed;
      }
    `,
  ],
})
export class AppComponent {
  code = "";
  steps: string[] = [];
  loading = false;
  error = "";

  constructor(private apiService: ApiService) {}

  onCodeChange(code: string): void {
    this.code = code;
  }

  runCode(): void {
    if (!this.code.trim()) return;
    this.loading = true;
    this.error = "";
    this.steps = [];

    this.apiService.analyze(this.code).subscribe({
      next: (result: AnalysisResult) => {
        this.steps = result.steps;
        this.loading = false;
      },
      error: (err) => {
        this.error =
          err?.error?.error ?? err?.message ?? "Failed to analyze code.";
        this.loading = false;
      },
    });
  }
}
