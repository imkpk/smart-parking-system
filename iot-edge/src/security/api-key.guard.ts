import type { IncomingMessage, ServerResponse } from 'node:http';

const API_KEY_HEADER = 'x-api-key';

export function extractApiKey(req: IncomingMessage): string | undefined {
  const header = req.headers[API_KEY_HEADER];
  if (typeof header === 'string') {
    return header.trim();
  }

  if (Array.isArray(header)) {
    return header[0]?.trim();
  }

  return undefined;
}

export function isAuthorized(req: IncomingMessage, expectedApiKey: string): boolean {
  const provided = extractApiKey(req);
  return Boolean(provided && provided === expectedApiKey);
}

export function sendUnauthorized(res: ServerResponse): void {
  res.statusCode = 401;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Unauthorized', message: 'Invalid or missing x-api-key header' }));
}