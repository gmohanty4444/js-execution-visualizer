import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface Queues {
  microtasks: string[];
  macrotasks: string[];
}

export interface AnalysisResult {
  steps: string[];
  queues: Queues;
}

@Injectable({ providedIn: "root" })
export class ApiService {
  private readonly analyzeUrl = "/api/analyze";

  constructor(private http: HttpClient) {}

  analyze(code: string): Observable<AnalysisResult> {
    return this.http.post<AnalysisResult>(this.analyzeUrl, { code });
  }
}
