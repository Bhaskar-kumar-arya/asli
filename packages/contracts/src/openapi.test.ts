import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** docs/API.md endpoints, method + path. Kept in sync by hand since it's the source of truth. */
const DOCUMENTED_ENDPOINTS = [
  'post /v1/uploads',
  'post /v1/scans',
  'post /v1/checks',
  'get /v1/alerts/{alertRef}',
  'get /v1/cabinets',
  'post /v1/cabinets',
  'get /v1/cabinets/{cabinetId}',
  'post /v1/cabinets/{cabinetId}/medicines',
  'delete /v1/cabinets/{cabinetId}/medicines/{medId}',
  'post /v1/cabinets/{cabinetId}/invites',
  'post /v1/invites/{code}/accept',
  'patch /v1/cabinets/{cabinetId}/members/{userId}',
  'delete /v1/cabinets/{cabinetId}/members/{userId}',
  'post /v1/push/subscriptions',
  'delete /v1/push/subscriptions',
  'get /v1/push/vapid-public-key',
  'post /v1/push/test',
  'get /v1/content/guidance/{guidanceKey}',
  'post /v1/reports',
  'get /v1/public/stats',
  'get /v1/public/insights',
  'get /v1/public/metrics',
  'post /v1/pharmacy/checks',
  'post /v1/admin/demo/replay-month',
];

describe('openapi.yaml', () => {
  it('has one operation per docs/API.md endpoint', () => {
    const doc = parse(readFileSync(join(__dirname, '..', 'openapi.yaml'), 'utf8')) as {
      paths: Record<string, Record<string, unknown>>;
    };
    const generated = Object.entries(doc.paths).flatMap(([path, methods]) =>
      Object.keys(methods).map((method) => `${method} ${path}`),
    );
    expect(new Set(generated)).toEqual(new Set(DOCUMENTED_ENDPOINTS));
  });
});
