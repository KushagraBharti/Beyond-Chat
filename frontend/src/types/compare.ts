export interface ModelResponse {
  model: string;
  content: string;
  tokens: number | null;
  duration_ms: number;
  error: string | null;
}

export interface CompareResponse {
  results: ModelResponse[];
}
