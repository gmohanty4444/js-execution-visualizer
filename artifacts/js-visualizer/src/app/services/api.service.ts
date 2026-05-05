import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface Queues {
  microtasks: string[];
  macrotasks: string[];
}

export interface DiffEntry {
  index: number;
  expected: string;
  got: string | undefined;
  reason: string;
}

export interface AnalysisResult {
  steps: string[];
  actualOutput: string[];
  queues: Queues;
  predictedOutput?: string[];
  isCorrect?: boolean;
  diff?: DiffEntry[];
  concepts?: string[];
}

@Injectable({ providedIn: "root" })
export class ApiService {
  private readonly analyzeUrl = "/api/analyze";

  constructor(private http: HttpClient) {}

  analyze(code: string, predictedOutput?: string[]): Observable<AnalysisResult> {
    const body: { code: string; predictedOutput?: string[] } = { code };
    if (predictedOutput && predictedOutput.length > 0) {
      body.predictedOutput = predictedOutput;
    }
    return this.http.post<AnalysisResult>(this.analyzeUrl, body);
  }
}
