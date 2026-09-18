import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

let ddbDocClient: DynamoDBDocumentClient | undefined;
export function getDdb(): DynamoDBDocumentClient {
  if (!ddbDocClient) {
    ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return ddbDocClient;
}

export function reportsTableName(): string {
  const name = process.env.REPORTS_TABLE_NAME;
  if (!name) throw new Error('REPORTS_TABLE_NAME env var is required');
  return name;
}
