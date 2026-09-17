import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { parseMonth } from '@asli/matching';
import { createRateLimiter } from './limiter';
import { politeGet } from './http';
import type { CdscoTab, FetchMonthDeps, RawSnapshot } from './types';

/**
 * Minimal working request recorded by T01's spike (plan/tasks/T01-spikes.md
 * Handoff): no browser User-Agent/Referer/cookies needed. `tab` on
 * filteredNsqDrugTable does nothing - Spurious rows come from a separate
 * endpoint entirely.
 */
const BASE_URL = 'https://cdscoonline.gov.in/CDSCO';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toCdscoMonthParam(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-');
  const abbr = MONTH_ABBR[Number(month) - 1];
  if (!abbr) throw new Error(`Invalid month "${yyyyMm}"`);
  return `${abbr}-${year}`;
}

function endpointUrl(tab: CdscoTab, month: string): string {
  const monthParam = toCdscoMonthParam(month);
  return tab === 'nsq'
    ? `${BASE_URL}/filteredNsqDrugTable?month=${monthParam}&source=All&tab=nsq`
    : `${BASE_URL}/filteredSpuriousDrugTable?month=${monthParam}&source=All`;
}

export interface CdscoClient {
  listAvailableMonths(year: number): Promise<string[]>;
  fetchMonth(month: string, tab: CdscoTab): Promise<RawSnapshot & { body: string }>;
}

/**
 * Factory so A2 injects its own S3 client/bucket (from the `/asli/<stage>/bucket/raw`
 * SSM param) and this package stays free of AWS SDK calls at import time.
 */
export function createCdscoClient(deps: FetchMonthDeps): CdscoClient {
  const throttle = createRateLimiter(deps.sleepImpl);
  const getOptions = {
    fetchImpl: deps.fetchImpl,
    sleepImpl: deps.sleepImpl,
    userAgent: deps.userAgent,
    throttle,
  };

  async function listAvailableMonths(year: number): Promise<string[]> {
    const res = await politeGet(`${BASE_URL}/reportingMonths?year=${year}`, getOptions);
    const abbrs = (await res.json()) as string[];
    return abbrs
      .map((abbr) => parseMonth(`${abbr}-${year}`))
      .filter((m): m is string => m !== null);
  }

  async function fetchMonth(month: string, tab: CdscoTab): Promise<RawSnapshot & { body: string }> {
    const url = endpointUrl(tab, month);
    const res = await politeGet(url, getOptions);
    const body = await res.text();
    const sha256 = createHash('sha256').update(body).digest('hex');
    const contentType = res.headers.get('content-type') ?? 'application/json';
    const key = `raw/cdsco/endpoint/${month}/${tab}/${sha256}.json`;

    await deps.s3Client.send(
      new PutObjectCommand({
        Bucket: deps.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    return { key, sha256, url, contentType, body };
  }

  return { listAvailableMonths, fetchMonth };
}
