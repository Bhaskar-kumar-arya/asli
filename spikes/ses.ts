import { SESv2Client, GetAccountCommand, ListEmailIdentitiesCommand } from '@aws-sdk/client-sesv2';

const region = 'ap-south-1';

async function main(): Promise<void> {
  const client = new SESv2Client({ region });
  const account = await client.send(new GetAccountCommand({}));
  console.log('SendingEnabled:', account.SendingEnabled);
  console.log('production access request status:', JSON.stringify(account.EnforcementStatus));
  console.log('sandbox (details):', JSON.stringify(account.Details));

  const identities = await client.send(new ListEmailIdentitiesCommand({}));
  console.log('Verified identities:', identities.EmailIdentities?.length ?? 0);
}

main().catch((err) => {
  console.error('ERROR:', err.name, err.message);
  process.exitCode = 1;
});
