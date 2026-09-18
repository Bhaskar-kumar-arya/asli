import { randomUUID } from 'node:crypto';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
  UpdateCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import {
  cabinetMatchSk,
  cabinetMedicineGsi3Pk,
  cabinetMedicineGsi3Sk,
  cabinetMedicineSk,
  cabinetMemberGsi1Pk,
  cabinetMemberGsi1Sk,
  cabinetMemberSk,
  cabinetMetaSk,
  cabinetPk,
  flaggedBatchGsi1Pk,
  flaggedBatchPk,
  type CabinetMetaItem,
  type FlaggedBatch,
  type MatchItem,
  type MedicineIdentity,
  type MedicineItem,
  type MemberItem,
  type Role,
} from '@asli/contracts';
import { batchSkeleton, normalizeBatch } from '@asli/matching';

export interface CabinetRepo {
  listMembershipsForUser(userId: string): Promise<MemberItem[]>;
  getCabinetMeta(cabinetId: string): Promise<CabinetMetaItem | undefined>;
  getMember(cabinetId: string, userId: string): Promise<MemberItem | undefined>;
  listMembers(cabinetId: string): Promise<MemberItem[]>;
  listMedicines(cabinetId: string): Promise<MedicineItem[]>;
  listMatches(cabinetId: string): Promise<MatchItem[]>;
  createCabinetWithOwner(input: { cabinetId: string; name: string; ownerId: string; now: string }): Promise<void>;
  addMedicine(item: MedicineItem): Promise<void>;
  deleteMedicineAndMatches(cabinetId: string, medId: string): Promise<void>;
  updateMedicineTier(
    cabinetId: string,
    medId: string,
    latestTier: MedicineItem['latestTier'],
    lastCheckedAt: string,
  ): Promise<void>;
  putMatchIfAbsent(item: MatchItem): Promise<boolean>;
}

/** Read-only lookups against FlaggedBatches + IngestionState, for the retroactive check. */
export interface MatchLookupRepo {
  findCandidatesForIdentity(identity: MedicineIdentity): Promise<FlaggedBatch[]>;
  findCandidatesBySkeleton(skeleton: string): Promise<FlaggedBatch[]>;
  checkedAgainst(): Promise<{ monthCount: number; latestMonth: string }>;
}

export function newMedId(): string {
  return randomUUID();
}
export function newCabinetId(): string {
  return randomUUID();
}

export function createCabinetRepo(opts: { ddb: DynamoDBDocumentClient; tableName: string }): CabinetRepo {
  const { ddb, tableName: cabTable } = opts;

  return {
    async listMembershipsForUser(userId) {
      const out = await ddb.send(
        new QueryCommand({
          TableName: cabTable,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk',
          ExpressionAttributeValues: { ':pk': cabinetMemberGsi1Pk(userId) },
        }),
      );
      return (out.Items ?? []) as MemberItem[];
    },

    async getCabinetMeta(cabinetId) {
      const out = await ddb.send(
        new GetCommand({ TableName: cabTable, Key: { PK: cabinetPk(cabinetId), SK: cabinetMetaSk() } }),
      );
      return out.Item as CabinetMetaItem | undefined;
    },

    async getMember(cabinetId, userId) {
      const out = await ddb.send(
        new GetCommand({ TableName: cabTable, Key: { PK: cabinetPk(cabinetId), SK: cabinetMemberSk(userId) } }),
      );
      return out.Item as MemberItem | undefined;
    },

    async listMembers(cabinetId) {
      const out = await ddb.send(
        new QueryCommand({
          TableName: cabTable,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: { ':pk': cabinetPk(cabinetId), ':prefix': 'MEMBER#' },
        }),
      );
      return (out.Items ?? []) as MemberItem[];
    },

    async listMedicines(cabinetId) {
      const out = await ddb.send(
        new QueryCommand({
          TableName: cabTable,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: { ':pk': cabinetPk(cabinetId), ':prefix': 'MED#' },
        }),
      );
      return (out.Items ?? []) as MedicineItem[];
    },

    async listMatches(cabinetId) {
      const out = await ddb.send(
        new QueryCommand({
          TableName: cabTable,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: { ':pk': cabinetPk(cabinetId), ':prefix': 'MATCH#' },
        }),
      );
      return (out.Items ?? []) as MatchItem[];
    },

    async createCabinetWithOwner({ cabinetId, name, ownerId, now }) {
      const meta: CabinetMetaItem = {
        PK: cabinetPk(cabinetId),
        SK: 'META',
        name,
        createdBy: ownerId,
        createdAt: now,
      };
      const member: MemberItem = {
        PK: cabinetPk(cabinetId),
        SK: cabinetMemberSk(ownerId),
        role: 'OWNER',
        alertsEnabled: true,
        joinedAt: now,
        GSI1PK: cabinetMemberGsi1Pk(ownerId),
        GSI1SK: cabinetMemberGsi1Sk(cabinetId),
      };
      await ddb.send(
        new TransactWriteCommand({
          TransactItems: [
            { Put: { TableName: cabTable, Item: meta, ConditionExpression: 'attribute_not_exists(PK)' } },
            { Put: { TableName: cabTable, Item: member, ConditionExpression: 'attribute_not_exists(PK)' } },
          ],
        }),
      );
    },

    async addMedicine(item) {
      await ddb.send(new PutCommand({ TableName: cabTable, Item: item }));
    },

    async deleteMedicineAndMatches(cabinetId, medId) {
      const matches = await ddb.send(
        new QueryCommand({
          TableName: cabTable,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: { ':pk': cabinetPk(cabinetId), ':prefix': `MATCH#${medId}#` },
        }),
      );
      for (const match of matches.Items ?? []) {
        await ddb.send(new DeleteCommand({ TableName: cabTable, Key: { PK: match.PK, SK: match.SK } }));
      }
      await ddb.send(
        new DeleteCommand({ TableName: cabTable, Key: { PK: cabinetPk(cabinetId), SK: cabinetMedicineSk(medId) } }),
      );
    },

    async updateMedicineTier(cabinetId, medId, latestTier, lastCheckedAt) {
      await ddb.send(
        new UpdateCommand({
          TableName: cabTable,
          Key: { PK: cabinetPk(cabinetId), SK: cabinetMedicineSk(medId) },
          UpdateExpression: 'SET latestTier = :tier, lastCheckedAt = :checkedAt',
          ExpressionAttributeValues: { ':tier': latestTier, ':checkedAt': lastCheckedAt },
        }),
      );
    },

    async putMatchIfAbsent(item) {
      try {
        await ddb.send(
          new PutCommand({ TableName: cabTable, Item: item, ConditionExpression: 'attribute_not_exists(PK)' }),
        );
        return true;
      } catch (err) {
        if (err instanceof Error && err.name === 'ConditionalCheckFailedException') return false;
        throw err;
      }
    },
  };
}

export function createMatchLookupRepo(opts: {
  ddb: DynamoDBDocumentClient;
  flaggedBatchesTableName: string;
  ingestionStateTableName: string;
}): MatchLookupRepo {
  const { ddb, flaggedBatchesTableName: batchTable, ingestionStateTableName: ingestTable } = opts;

  return {
    async findCandidatesForIdentity(identity) {
      const batchNorm = normalizeBatch(identity.batchNumber);
      const out = await ddb.send(
        new QueryCommand({
          TableName: batchTable,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: { ':pk': flaggedBatchPk(batchNorm) },
        }),
      );
      return (out.Items ?? []) as FlaggedBatch[];
    },

    async findCandidatesBySkeleton(skeleton) {
      const out = await ddb.send(
        new QueryCommand({
          TableName: batchTable,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :pk',
          ExpressionAttributeValues: { ':pk': flaggedBatchGsi1Pk(skeleton) },
        }),
      );
      return (out.Items ?? []) as FlaggedBatch[];
    },

    async checkedAgainst() {
      // IngestionState is small (grows one row per month per tab) - a full scan
      // is cheap and avoids needing a maintained aggregate for this lane.
      const out = await ddb.send(
        new ScanCommand({
          TableName: ingestTable,
          FilterExpression: '#s = :done',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: { ':done': 'DONE' },
        }),
      );
      const months = new Set<string>();
      for (const item of out.Items ?? []) {
        const pk = item.PK as string;
        const month = pk.startsWith('MONTH#') ? pk.slice('MONTH#'.length) : undefined;
        if (month) months.add(month);
      }
      const sorted = [...months].sort();
      return { monthCount: sorted.length, latestMonth: sorted[sorted.length - 1] ?? '1970-01' };
    },
  };
}

export function candidateSkeletonFor(identity: MedicineIdentity): string {
  return batchSkeleton(normalizeBatch(identity.batchNumber));
}

export function medicineGsi3Keys(cabinetId: string, medId: string, identity: MedicineIdentity) {
  return {
    GSI3PK: cabinetMedicineGsi3Pk(candidateSkeletonFor(identity)),
    GSI3SK: cabinetMedicineGsi3Sk(cabinetId, medId),
  };
}

export function matchKeyFor(cabinetId: string, medId: string, alertId: string) {
  return { PK: cabinetPk(cabinetId), SK: cabinetMatchSk(medId, alertId) };
}

export function roleOf(member: MemberItem | undefined): Role | undefined {
  return member?.role;
}
