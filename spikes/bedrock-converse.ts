import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const region = 'ap-south-1';
const modelId = 'global.anthropic.claude-haiku-4-5-20251001-v1:0';

const extractionTool = {
  toolSpec: {
    name: 'record_medicines',
    description: 'Record fields read from a medicine strip photo, per docs/SCANNING.md extraction schema.',
    inputSchema: {
      json: {
        type: 'object',
        properties: {
          isMedicinePack: { type: 'boolean' },
          productName: { type: ['string', 'null'] },
          brandName: { type: ['string', 'null'] },
          batchNumber: { type: ['string', 'null'] },
          manufacturer: { type: ['string', 'null'] },
          mfgDate: { type: ['string', 'null'] },
          expDate: { type: ['string', 'null'] },
          strength: { type: ['string', 'null'] },
          dosageForm: { type: ['string', 'null'] },
          mrp: { type: ['string', 'null'] },
          confidence: {
            type: 'object',
            properties: {
              batchNumber: { type: 'number' },
              manufacturer: { type: 'number' },
              productName: { type: 'number' },
              expDate: { type: 'number' },
            },
          },
          notes: { type: ['string', 'null'] },
        },
        required: ['isMedicinePack'],
      },
    },
  },
};

async function main(): Promise<void> {
  const client = new BedrockRuntimeClient({ region });

  // No real strip photo available in this environment yet (testset/README.md: 0/30 collected) -
  // this is a text-only smoke test of the Converse + forced-tool-choice + temperature:0 path,
  // not a real vision extraction accuracy test. That needs a real photo (lane E collects them).
  const res = await client.send(
    new ConverseCommand({
      modelId,
      messages: [
        {
          role: 'user',
          content: [
            {
              text: 'A medicine strip is printed with: "Paracetamol 500mg", "B.No: GTL1258", "Mfd by: Gidsha Pharmaceuticals Pvt Ltd", "Exp: 10/2027". Call record_medicines with these exact values, do not correct or guess.',
            },
          ],
        },
      ],
      toolConfig: {
        tools: [extractionTool],
        toolChoice: { tool: { name: 'record_medicines' } },
      },
      inferenceConfig: { temperature: 0 },
    }),
  );

  console.log('stopReason:', res.stopReason);
  console.log('usage:', JSON.stringify(res.usage));
  const toolUse = res.output?.message?.content?.find((c) => 'toolUse' in c);
  console.log('toolUse input:', JSON.stringify(toolUse && 'toolUse' in toolUse ? toolUse.toolUse?.input : undefined, null, 2));
}

main().catch((err) => {
  console.error('ERROR:', err.name, err.message);
  process.exitCode = 1;
});
