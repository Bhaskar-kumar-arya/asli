#!/usr/bin/env tsx
/**
 * Pre-renders static (placeholder-free) `packages/content` guidance text to MP3 with Amazon
 * Polly, uploaded to `asli-<stage>-public/audio/<lang>/<key>.mp3` (docs/SAFETY_AND_CONTENT.md
 * "Read-aloud"). Dynamic parts (product, batch, alert month, ...) are never spoken from here -
 * only title, per-reason-code plain text, and the shared "what to do next" steps, which is
 * all the reviewed English guidance needs without a placeholder.
 *
 * IMPORTANT (plan/tasks/T01-spikes.md spike 7): Polly in ap-south-1 has voices for `en-IN`
 * only - zero voices for `hi-IN` and `kn-IN`. This contradicts docs/SAFETY_AND_CONTENT.md's
 * original assumption that Hindi read-aloud uses pre-rendered Polly MP3s. This script checks
 * `DescribeVoices` per language before rendering and skips (not fails) any language with no
 * voice - today that's every language except `en`. apps/web's `playReadAloud()` already falls
 * back to browser `speechSynthesis` for any language whose MP3 is missing, so hi/kn read-aloud
 * works end-to-end without this script producing hi/kn files.
 *
 * Usage: pnpm content:audio --stage dev-shared [--voice Kajal]
 */
import { PollyClient, DescribeVoicesCommand, SynthesizeSpeechCommand, type Engine, type LanguageCode } from '@aws-sdk/client-polly';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { GUIDANCE_KEYS, GUIDANCE_TEMPLATES, REASON_PLAIN_TEXT_EN, type ContentLang } from '@asli/content';

const REGION = 'ap-south-1';
/** docs/SAFETY_AND_CONTENT.md language list; T01 found only en-IN has Polly voices today. */
const POLLY_LANGUAGE_CODE: Record<ContentLang, string> = { en: 'en-IN', hi: 'hi-IN', kn: 'kn-IN' };

function parseArgs(): { stage: string; voice: string } {
  const stageIdx = process.argv.indexOf('--stage');
  const voiceIdx = process.argv.indexOf('--voice');
  const stage = stageIdx !== -1 ? process.argv[stageIdx + 1] : undefined;
  if (!stage) throw new Error('Usage: pnpm content:audio --stage <stage> [--voice <PollyVoiceId>]');
  return { stage, voice: voiceIdx !== -1 ? (process.argv[voiceIdx + 1] ?? 'Kajal') : 'Kajal' };
}

async function findVoice(polly: PollyClient, lang: ContentLang, preferred?: string): Promise<{ id: string; engine: Engine } | undefined> {
  const res = await polly.send(new DescribeVoicesCommand({ LanguageCode: POLLY_LANGUAGE_CODE[lang] as LanguageCode }));
  const voices = res.Voices ?? [];
  if (voices.length === 0) return undefined;
  const pick = (preferred ? voices.find((v) => v.Id === preferred) : undefined) ?? voices[0];
  if (!pick?.Id) return undefined;
  const engine = (pick.SupportedEngines?.includes('neural') ? 'neural' : 'standard') as Engine;
  return { id: pick.Id, engine };
}

let charactersSynthesized = 0;

async function synthesizeAndUpload(
  polly: PollyClient,
  s3: S3Client,
  bucket: string,
  lang: ContentLang,
  key: string,
  voiceId: string,
  engine: Engine,
  text: string,
): Promise<void> {
  if (!text.trim()) return;
  const res = await polly.send(
    new SynthesizeSpeechCommand({ Text: text, OutputFormat: 'mp3', VoiceId: voiceId as never, Engine: engine }),
  );
  charactersSynthesized += text.length;
  const bytes = await res.AudioStream?.transformToByteArray();
  if (!bytes) throw new Error(`Polly returned no audio for ${lang}/${key}`);
  await s3.send(
    new PutObjectCommand({ Bucket: bucket, Key: `audio/${lang}/${key}.mp3`, Body: bytes, ContentType: 'audio/mpeg' }),
  );
  console.log(`Uploaded audio/${lang}/${key}.mp3 (${bytes.length} bytes)`);
}

async function main(): Promise<void> {
  const { stage, voice } = parseArgs();
  const polly = new PollyClient({ region: REGION });
  const s3 = new S3Client({ region: REGION });
  const bucket = `asli-${stage}-public`;

  for (const lang of ['en', 'hi', 'kn'] as ContentLang[]) {
    const found = await findVoice(polly, lang, lang === 'en' ? voice : undefined);
    if (!found) {
      console.log(`Skipping ${lang}: no Polly voice for ${POLLY_LANGUAGE_CODE[lang]} in ${REGION} (browser speechSynthesis fallback covers this language client-side).`);
      continue;
    }
    console.log(`${lang}: using voice ${found.id} (${found.engine})`);

    for (const key of GUIDANCE_KEYS) {
      const template = GUIDANCE_TEMPLATES[key][lang] ?? GUIDANCE_TEMPLATES[key].en;
      if (!template) continue;
      // Title + steps only - never the body, which carries {batch}/{product}/... placeholders.
      const speakable = [template.title, ...template.steps].join('. ');
      await synthesizeAndUpload(polly, s3, bucket, lang, key, found.id, found.engine, speakable);
    }

    if (lang === 'en') {
      for (const [code, text] of Object.entries(REASON_PLAIN_TEXT_EN)) {
        await synthesizeAndUpload(polly, s3, bucket, lang, `reason.${code}`, found.id, found.engine, text);
      }
    }
  }

  const cloudwatch = new CloudWatchClient({ region: REGION });
  await cloudwatch.send(
    new PutMetricDataCommand({
      Namespace: 'Asli',
      MetricData: [
        { MetricName: 'PollyCharacters', Value: charactersSynthesized, Unit: 'Count', Dimensions: [{ Name: 'stage', Value: stage }] },
      ],
    }),
  );
  console.log(`PollyCharacters: ${charactersSynthesized}`);
}

main().catch((err) => {
  console.error('ERROR:', err.name, err.message);
  process.exitCode = 1;
});
