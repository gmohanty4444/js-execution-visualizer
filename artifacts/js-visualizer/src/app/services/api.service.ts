import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface AnalysisResult {
  steps: string[];
}

@Injectable({
  providedIn: "root",
})
export class ApiService {
  /** Relative URL — routed through the dev proxy (dev) or Replit proxy (prod). */
  private readonly analyzeUrl = "/api/analyze";

  constructor(private http: HttpClient) {}

  analyze(code: string): Observable<AnalysisResult> {
    return this.http.post<AnalysisResult>(this.analyzeUrl, { code });
  }
}
