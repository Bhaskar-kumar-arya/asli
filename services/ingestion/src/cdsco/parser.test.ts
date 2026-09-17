import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseSnapshot } from './parser';
import type { SnapshotMeta } from './types';

const fixturesDir = fileURLToPath(new URL('../../../../packages/contracts/fixtures/cdsco/', import.meta.url));

function loadFixture(name: string): string {
  return readFileSync(`${fixturesDir}${name}`, 'utf-8');
}

const nsqMeta: SnapshotMeta = {
  month: '2026-02',
  tab: 'nsq',
  sourceUrl: 'https://cdscoonline.gov.in/CDSCO/filteredNsqDrugTable?month=Feb-2026&source=All&tab=nsq',
  snapshotKey: 'raw/cdsco/endpoint/2026-02/nsq/abc.json',
};

const spuriousMeta: SnapshotMeta = {
  month: '2026-02',
  tab: 'spurious',
  sourceUrl: 'https://cdscoonline.gov.in/CDSCO/filteredSpuriousDrugTable?month=Feb-2026&source=All',
  snapshotKey: 'raw/cdsco/endpoint/2026-02/spurious/def.json',
};

describe('parseSnapshot', () => {
  it('parses every NSQ row from T01s real fixture (217 rows)', () => {
    const rows = parseSnapshot({ text: loadFixture('endpoint-nsq-2026-02.json') }, nsqMeta);
    expect(rows).toHaveLength(217);
    expect(rows[0]).toMatchObject({
      productName: 'Montelukast & Levocetirizine Dihydrochloride',
      batchRaw: 'E9AIY029',
      mfgRaw: 'Aug-2025',
      expRaw: 'Jul-2027',
      category: 'NSQ',
      alertMonth: '2026-02',
      sourceUrl: nsqMeta.sourceUrl,
      snapshotKey: nsqMeta.snapshotKey,
    });
    expect(rows[0]!.manufacturerRaw).toContain('Pharma Force Lab');
    expect(rows[0]!.reportingLab).toBe('FDTL,Uttarakhand');
  });

  it('parses every Spurious row from T01s real fixture (4 rows), using product_name_from_dtl', () => {
    const rows = parseSnapshot({ text: loadFixture('endpoint-spurious-2026-02.json') }, spuriousMeta);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({
      productName: 'Betamethasone And Clioquinol Cream BP',
      batchRaw: 'K73G',
      category: 'SPURIOUS',
    });
  });

  it('throws a clear error on invalid JSON rather than silently dropping the month', () => {
    expect(() => parseSnapshot({ text: 'not json' }, nsqMeta)).toThrow(/not valid JSON/);
  });

  it('handles an empty aaData array without throwing', () => {
    const rows = parseSnapshot({ text: JSON.stringify({ iTotalDisplayRecords: 0, iTotalRecords: 0, aaData: [] }) }, nsqMeta);
    expect(rows).toEqual([]);
  });
});
