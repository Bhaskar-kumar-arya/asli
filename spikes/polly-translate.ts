import { PollyClient, DescribeVoicesCommand } from '@aws-sdk/client-polly';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';

const region = 'ap-south-1';

async function main(): Promise<void> {
  const polly = new PollyClient({ region });
  console.log('--- Polly voices for hi-IN, en-IN, kn-IN ---');
  for (const languageCode of ['hi-IN', 'en-IN', 'kn-IN'] as const) {
    try {
      const res = await polly.send(new DescribeVoicesCommand({ LanguageCode: languageCode }));
      if (!res.Voices?.length) {
        console.log(languageCode, '-> no voices');
        continue;
      }
      for (const v of res.Voices) {
        console.log(languageCode, '->', v.Id, '| engines:', v.SupportedEngines?.join(','), '| gender:', v.Gender);
      }
    } catch (err) {
      console.log(languageCode, '-> ERROR', (err as Error).name, (err as Error).message);
    }
  }

  const translate = new TranslateClient({ region });
  console.log('\n--- Translate: NO_ALERT_FOUND template to hi, kn ---');
  const sample =
    'No alert found for this batch. We checked {monthCount} CDSCO lists up to {latestMonth}. This does not certify the medicine; it means this batch is not on those lists.';
  for (const target of ['hi', 'kn'] as const) {
    try {
      const res = await translate.send(
        new TranslateTextCommand({ Text: sample, SourceLanguageCode: 'en', TargetLanguageCode: target }),
      );
      console.log(target, '->', res.TranslatedText);
    } catch (err) {
      console.log(target, '-> ERROR', (err as Error).name, (err as Error).message);
    }
  }
}

main().catch((err) => {
  console.error('ERROR:', err.name, err.message);
  process.exitCode = 1;
});
