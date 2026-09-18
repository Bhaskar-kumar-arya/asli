import { BedrockClient, ListFoundationModelsCommand, ListInferenceProfilesCommand } from '@aws-sdk/client-bedrock';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const region = 'ap-south-1';

async function main(): Promise<void> {
  const bedrock = new BedrockClient({ region });

  console.log('--- Foundation models with IMAGE input + TEXT output, by Anthropic ---');
  const models = await bedrock.send(new ListFoundationModelsCommand({ byProvider: 'Anthropic' }));
  const visionModels = (models.modelSummaries ?? []).filter(
    (m) => m.inputModalities?.includes('IMAGE') && m.outputModalities?.includes('TEXT'),
  );
  for (const m of visionModels) {
    console.log(m.modelId, '| inference types:', m.inferenceTypesSupported?.join(','));
  }

  console.log('\n--- Cross-region inference profiles (Anthropic) ---');
  try {
    const profiles = await bedrock.send(new ListInferenceProfilesCommand({}));
    for (const p of profiles.inferenceProfileSummaries ?? []) {
      if (p.inferenceProfileId?.toLowerCase().includes('claude') || p.inferenceProfileId?.toLowerCase().includes('anthropic')) {
        console.log(p.inferenceProfileId, '|', p.inferenceProfileName, '| status:', p.status);
      }
    }
  } catch (err) {
    console.log('ListInferenceProfiles failed:', (err as Error).message);
  }
}

main().catch((err) => {
  console.error('ERROR:', err);
  process.exitCode = 1;
});
