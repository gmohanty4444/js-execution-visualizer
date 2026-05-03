import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  Output,
  EventEmitter,
} from "@angular/core";

// Monaco is loaded via CDN AMD loader — declare as any to avoid type errors.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;

const DEFAULT_CODE = `function test() {
  console.log(a);
  var a = 10;
}
test();`;

@Component({
  selector: "app-editor",
  standalone: true,
  template: `
    <div class="editor-wrapper">
      <div #editorContainer class="monaco-container"></div>
    </div>
  `,
  styles: [
    `
      .editor-wrapper {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .monaco-container {
        flex: 1;
        height: 100%;
        min-height: 0;
      }
    `,
  ],
})
export class EditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild("editorContainer", { static: true })
  editorContainer!: ElementRef<HTMLDivElement>;

  /** Emits the current editor value whenever it changes. */
  @Output() codeChange = new EventEmitter<string>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private editor: any = null;

  ngAfterViewInit(): void {
    // The Monaco AMD loader is already configured in index.html.
    // We only need to load the editor.main module.
    require(["vs/editor/editor.main"], () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const monaco = (window as any).monaco;

      this.editor = monaco.editor.create(this.editorContainer.nativeElement, {
        value: DEFAULT_CODE,
        language: "javascript",
        theme: "vs-dark",
        fontSize: 14,
        fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        lineNumbers: "on",
        renderWhitespace: "selection",
        wordWrap: "on",
        padding: { top: 12, bottom: 12 },
      });

      // Emit initial value so parent has the default code on mount.
      this.codeChange.emit(DEFAULT_CODE);

      // Emit on every content change.
      this.editor.onDidChangeModelContent(() => {
        this.codeChange.emit(this.editor.getValue());
      });
    });
  }

  ngOnDestroy(): void {
    this.editor?.dispose();
  }
}
