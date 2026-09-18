/** Lambda ARNs the ingest state machine invokes - infra/lib/lanes/a2-ingestion.ts supplies these. */
export interface IngestLambdaArns {
  expandWork: string;
  markRunning: string;
  fetchMonth: string;
  loadFixture: string;
  normalizeAndWrite: string;
  markDone: string;
  markFailed: string;
  invokeStats: string;
  buildReference: string;
}
