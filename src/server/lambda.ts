import { handleApiRequest, AppRequest } from './router';

export interface ApiGatewayV2Event {
  version?: string;
  rawPath: string;
  rawQueryString?: string;
  requestContext?: {
    http?: {
      method: string;
      path: string;
      protocol?: string;
      sourceIp?: string;
      userAgent?: string;
    };
  };
  queryStringParameters?: Record<string, string | undefined>;
  headers?: Record<string, string | undefined>;
  body?: string;
  isBase64Encoded?: boolean;
}

export interface ApiGatewayV2Response {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  isBase64Encoded?: boolean;
}

/**
 * AWS Lambda handler for Amazon API Gateway HTTP API v2
 */
export async function handler(event: ApiGatewayV2Event): Promise<ApiGatewayV2Response> {
  const method = event.requestContext?.http?.method || 'GET';
  const path = event.rawPath || event.requestContext?.http?.path || '/';
  const query = event.queryStringParameters || {};

  let parsedBody: any = undefined;
  if (event.body) {
    try {
      const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : event.body;
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = event.body;
    }
  }

  const appReq: AppRequest = {
    method,
    path,
    query,
    headers: event.headers,
    body: parsedBody,
  };

  const appRes = await handleApiRequest(appReq);

  return {
    statusCode: appRes.statusCode,
    headers: appRes.headers,
    body: typeof appRes.body === 'string' ? appRes.body : JSON.stringify(appRes.body),
    isBase64Encoded: false,
  };
}
