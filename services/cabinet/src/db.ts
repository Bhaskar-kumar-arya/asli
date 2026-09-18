import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';

let ddbDocClient: DynamoDBDocumentClient | undefined;
export function getDdb(): DynamoDBDocumentClient {
  if (!ddbDocClient) {
    ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return ddbDocClient;
}

let snsClient: SNSClient | undefined;
export function getSns(): SNSClient {
  if (!snsClient) {
    snsClient = new SNSClient({});
  }
  return snsClient;
}

export function cabinetsTableName(): string {
  const name = process.env.CABINETS_TABLE_NAME;
  if (!name) throw new Error('CABINETS_TABLE_NAME env var is required');
  return name;
}

export function flaggedBatchesTableName(): string {
  const name = process.env.FLAGGED_BATCHES_TABLE_NAME;
  if (!name) throw new Error('FLAGGED_BATCHES_TABLE_NAME env var is required');
  return name;
}

export function ingestionStateTableName(): string {
  const name = process.env.INGESTION_STATE_TABLE_NAME;
  if (!name) throw new Error('INGESTION_STATE_TABLE_NAME env var is required');
  return name;
}

export function referenceTableName(): string {
  const name = process.env.REFERENCE_TABLE_NAME;
  if (!name) throw new Error('REFERENCE_TABLE_NAME env var is required');
  return name;
}

export function alertsTopicArn(): string {
  const arn = process.env.ALERTS_TOPIC_ARN;
  if (!arn) throw new Error('ALERTS_TOPIC_ARN env var is required');
  return arn;
}
