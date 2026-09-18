import type { ExpandWorkOutput, IngestExecutionInput, WorkItem } from './types';

/** First state: turns `{months, tabs}` into the flat `months x tabs` list the Map state iterates. */
export async function handler(event: IngestExecutionInput): Promise<ExpandWorkOutput> {
  const items: WorkItem[] = [];
  for (const month of event.months) {
    for (const tab of event.tabs) {
      items.push({ month, tab, sourceType: event.sourceType, fixtureKey: event.fixtureKey });
    }
  }
  return { items };
}
