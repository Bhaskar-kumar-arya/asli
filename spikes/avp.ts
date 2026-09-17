import {
  VerifiedPermissionsClient,
  CreatePolicyStoreCommand,
  PutSchemaCommand,
  CreatePolicyCommand,
  IsAuthorizedCommand,
  DeletePolicyStoreCommand,
} from '@aws-sdk/client-verifiedpermissions';

const region = 'ap-south-1';
const client = new VerifiedPermissionsClient({ region });

// docs/PERMISSIONS.md schema, in AVP's JSON schema representation (same as
// infra/lib/shared-stack.ts AVP_SCHEMA - kept in sync by hand for now).
const schema = {
  Asli: {
    entityTypes: {
      User: { shape: { type: 'Record', attributes: {} } },
      MemberGroup: { shape: { type: 'Record', attributes: {} } },
      Cabinet: {
        shape: {
          type: 'Record',
          attributes: {
            owners: { type: 'Entity', name: 'MemberGroup' },
            editors: { type: 'Entity', name: 'MemberGroup' },
            viewers: { type: 'Entity', name: 'MemberGroup' },
          },
        },
      },
    },
    actions: {
      ViewCabinet: { appliesTo: { principalTypes: ['User'], resourceTypes: ['Cabinet'] } },
      AddMedicine: { appliesTo: { principalTypes: ['User'], resourceTypes: ['Cabinet'] } },
      RemoveMedicine: { appliesTo: { principalTypes: ['User'], resourceTypes: ['Cabinet'] } },
      ManageMembers: { appliesTo: { principalTypes: ['User'], resourceTypes: ['Cabinet'] } },
      ReceiveAlerts: { appliesTo: { principalTypes: ['User'], resourceTypes: ['Cabinet'] } },
    },
  },
};

const viewPolicy = `permit (principal, action in [Asli::Action::"ViewCabinet", Asli::Action::"ReceiveAlerts"], resource)
when { principal in resource.owners || principal in resource.editors || principal in resource.viewers };`;

const editPolicy = `permit (principal, action in [Asli::Action::"AddMedicine", Asli::Action::"RemoveMedicine"], resource)
when { principal in resource.owners || principal in resource.editors };`;

const managePolicy = `permit (principal, action == Asli::Action::"ManageMembers", resource)
when { principal in resource.owners };`;

async function main(): Promise<void> {
  const store = await client.send(
    new CreatePolicyStoreCommand({ validationSettings: { mode: 'STRICT' }, description: 'T01 spike - throwaway' }),
  );
  const policyStoreId = store.policyStoreId!;
  console.log('Created policy store:', policyStoreId);

  try {
    await client.send(
      new PutSchemaCommand({ policyStoreId, definition: { cedarJson: JSON.stringify(schema) } }),
    );
    console.log('Schema loaded OK (STRICT validation passed)');

    for (const [name, statement] of [
      ['view', viewPolicy],
      ['edit', editPolicy],
      ['manage', managePolicy],
    ] as const) {
      await client.send(
        new CreatePolicyCommand({
          policyStoreId,
          definition: { static: { statement, description: `${name}.cedar` } },
        }),
      );
      console.log(`Policy ${name} created OK`);
    }

    // A VIEWER trying to ManageMembers should be denied; an EDITOR trying to ManageMembers
    // should also be denied (only OWNER can manage) - the PERMISSIONS.md demo moment.
    const editorId = 'User::"vikram"';
    const cabinetId = 'Cabinet::"cab-mom-001"';
    const entities = {
      entityList: [
        { identifier: { entityType: 'User', entityId: 'vikram' }, parents: [{ entityType: 'MemberGroup', entityId: 'cab-mom-001#EDITOR' }] },
        { identifier: { entityType: 'MemberGroup', entityId: 'cab-mom-001#OWNER' } },
        { identifier: { entityType: 'MemberGroup', entityId: 'cab-mom-001#EDITOR' } },
        { identifier: { entityType: 'MemberGroup', entityId: 'cab-mom-001#VIEWER' } },
        {
          identifier: { entityType: 'Cabinet', entityId: 'cab-mom-001' },
          attributes: {
            owners: { entityIdentifier: { entityType: 'MemberGroup', entityId: 'cab-mom-001#OWNER' } },
            editors: { entityIdentifier: { entityType: 'MemberGroup', entityId: 'cab-mom-001#EDITOR' } },
            viewers: { entityIdentifier: { entityType: 'MemberGroup', entityId: 'cab-mom-001#VIEWER' } },
          },
        },
      ],
    };

    const manageCheck = await client.send(
      new IsAuthorizedCommand({
        policyStoreId,
        principal: { entityType: 'User', entityId: 'vikram' },
        action: { actionType: 'Asli::Action', actionId: 'ManageMembers' },
        resource: { entityType: 'Cabinet', entityId: 'cab-mom-001' },
        entities,
      }),
    );
    console.log('EDITOR ManageMembers decision (expect DENY):', manageCheck.decision);

    const addMedicineCheck = await client.send(
      new IsAuthorizedCommand({
        policyStoreId,
        principal: { entityType: 'User', entityId: 'vikram' },
        action: { actionType: 'Asli::Action', actionId: 'AddMedicine' },
        resource: { entityType: 'Cabinet', entityId: 'cab-mom-001' },
        entities,
      }),
    );
    console.log('EDITOR AddMedicine decision (expect ALLOW):', addMedicineCheck.decision);
    void editorId;
  } finally {
    await client.send(new DeletePolicyStoreCommand({ policyStoreId }));
    console.log('Deleted throwaway policy store', policyStoreId);
  }
}

main().catch((err) => {
  console.error('ERROR:', err.name, err.message);
  process.exitCode = 1;
});
