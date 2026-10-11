import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'JalSentry';
export const AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

let docClient: DynamoDBDocumentClient | null = null;

export function getDynamoDBClient(): DynamoDBDocumentClient | null {
  // If explicitly in memory/local mode or lacking AWS credentials in local dev
  if (process.env.JALSENTRY_STORAGE === 'memory') {
    return null;
  }

  if (docClient) {
    return docClient;
  }

  // Check if AWS credentials or endpoint exist
  const hasAwsCreds = Boolean(
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.AWS_EXECUTION_ENV
  );

  const endpoint = process.env.DYNAMODB_ENDPOINT;

  if (hasAwsCreds || endpoint) {
    try {
      const client = new DynamoDBClient({
        region: AWS_REGION,
        ...(endpoint ? { endpoint } : {}),
      });
      docClient = DynamoDBDocumentClient.from(client, {
        marshallOptions: {
          removeUndefinedValues: true,
        },
      });
      return docClient;
    } catch (e) {
      console.warn('Failed to initialize AWS DynamoDB client, falling back to local storage adapter:', e);
      return null;
    }
  }

  return null;
}
