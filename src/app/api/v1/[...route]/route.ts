import { NextRequest, NextResponse } from 'next/server';
import { handleApiRequest, AppRequest } from '@/server/router';

async function processRequest(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.pathname;
  const query: Record<string, string | undefined> = {};
  url.searchParams.forEach((val, key) => {
    query[key] = val;
  });

  let body: any = undefined;
  if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') {
    try {
      body = await req.json();
    } catch {
      body = undefined;
    }
  }

  const appReq: AppRequest = {
    method: req.method,
    path,
    query,
    headers: Object.fromEntries(req.headers.entries()),
    body,
  };

  const appRes = await handleApiRequest(appReq);

  return NextResponse.json(appRes.body, {
    status: appRes.statusCode,
    headers: appRes.headers,
  });
}

export const GET = processRequest;
export const POST = processRequest;
export const PATCH = processRequest;
export const OPTIONS = processRequest;
