#!/usr/bin/env tsx
/**
 * Draft hi/kn translations of the reviewed English `packages/content` templates with Amazon
 * Translate, protecting `{placeholder}` tokens (docs/SAFETY_AND_CONTENT.md "Languages").
 *
 * Writes `packages/content/drafts/<lang>.json` - NOT loaded at runtime. A human compares these
 * against the hand-drafted hi/kn text already committed in packages/content/src/templates/*.ts
 * and packages/content/src/reasons.ts, fixes any placeholder corruption, and only then merges
 * reviewed text into those files with `reviewedBy`/`reviewedAt` set - see
 * scripts/content/review.md. Never loaded directly by render(); translate.ts only ever
 * produces drafts, never reviewed content.
 *
 * As of 2026-09-18 (plan/tasks/T01-spikes.md spike 7), Amazon Translate on this AWS account
 * returns `SubscriptionRequiredException` for every call - this script is written for when
 * that clears (or for `int`/production accounts that already have access), and fails loudly
 * with that guidance if it's still blocked.
 *
 * Usage: pnpm content:translate --stage dev-shared
 */
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { ALL_TEMPLATES, REASON_PLAIN_TEXT_EN } from '@asli/content';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REGION = 'ap-south-1';
const TARGET_LANGS = ['hi', 'kn'] as const;

function parseStage(): string {
  const idx = process.argv.indexOf('--stage');
  return idx !== -1 ? (process.argv[idx + 1] ?? 'dev-shared') : 'dev-shared';
}

/** Swaps `{name}` tokens for Translate-opaque placeholders so Translate can't mangle them, then restores them. */
function protectPlaceholders(text: string): { protected: string; restore: (translated: string) => string } {
  const tokens: string[] = [];
  const protectedText = text.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const token = `XPLACEHOLDERX${tokens.length}X`;
    tokens.push(`{${name}}`);
    return token;
  });
  return {
    protected: protectedText,
    restore: (translated) =>
      tokens.reduce((acc, original, i) => acc.split(`XPLACEHOLDERX${i}X`).join(original), translated),
  };
}

let charactersTranslated = 0;

async function translateText(client: TranslateClient, text: string, target: 'hi' | 'kn'): Promise<string> {
  if (!text) return text;
  const { protected: safeText, restore } = protectPlaceholders(text);
  const res = await client.send(
    new TranslateTextCommand({ Text: safeText, SourceLanguageCode: 'en', TargetLanguageCode: target }),
  );
  charactersTranslated += safeText.length;
  return restore(res.TranslatedText ?? safeText);
}

async function main(): Promise<void> {
  const stage = parseStage();
  const client = new TranslateClient({ region: REGION });
  const drafts: Record<string, Record<string, { title: string; body: string; steps: string[] }>> = {
    hi: {},
    kn: {},
  };
  const reasonDrafts: Record<string, Record<string, string>> = { hi: {}, kn: {} };

  for (const target of TARGET_LANGS) {
    for (const [key, byLang] of Object.entries(ALL_TEMPLATES)) {
      const en = byLang.en;
      if (!en) continue;
      drafts[target][key] = {
        title: await translateText(client, en.title, target),
        body: await translateText(client, en.body, target),
        steps: await Promise.all(en.steps.map((step) => translateText(client, step, target))),
      };
    }
    for (const [code, text] of Object.entries(REASON_PLAIN_TEXT_EN)) {
      reasonDrafts[target][code] = await translateText(client, text, target);
    }
  }

  const outDir = path.join(__dirname, '../../packages/content/drafts');
  fs.mkdirSync(outDir, { recursive: true });
  for (const target of TARGET_LANGS) {
    fs.writeFileSync(
      path.join(outDir, `${target}.json`),
      JSON.stringify({ generatedAt: new Date().toISOString(), templates: drafts[target], reasons: reasonDrafts[target] }, null, 2),
    );
    console.log(`Wrote packages/content/drafts/${target}.json`);
  }

  // docs/OBSERVABILITY_AND_COST.md "TranslateCharacters" cost metric.
  const cloudwatch = new CloudWatchClient({ region: REGION });
  await cloudwatch.send(
    new PutMetricDataCommand({
      Namespace: 'Asli',
      MetricData: [
        {
          MetricName: 'TranslateCharacters',
          Value: charactersTranslated,
          Unit: 'Count',
          Dimensions: [{ Name: 'stage', Value: stage }],
        },
      ],
    }),
  );
  console.log(`TranslateCharacters: ${charactersTranslated}`);
}

main().catch((err) => {
  console.error('ERROR:', err.name, err.message);
  if (err.name === 'SubscriptionRequiredException') {
    console.error(
      'Amazon Translate is not enabled on this AWS account/subscription (see plan/tasks/T01-spikes.md spike 7). ' +
        'hi/kn content stays hand-drafted in packages/content until this clears.',
    );
  }
  process.exitCode = 1;
});
