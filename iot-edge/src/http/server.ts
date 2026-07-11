import http, { type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import {
  normalizeAnprDetection,
  normalizeQrDetection,
  normalizeRfidDetection,
  type DetectionBuildContext,
  type VendorAnprPayload,
  type VendorQrPayload,
  type VendorRfidPayload,
} from '../adapters/detection-adapter.js';
import type { Config } from '../config.js';
import type { DetectionMessage, EdgeContext } from '../contracts/messages.js';
import { isAuthorized, sendUnauthorized } from '../security/api-key.guard.js';

export interface HttpServerDeps {
  config: Config;
  ctx: EdgeContext;
  detectionCtx: DetectionBuildContext;
  publishDetection: (message: DetectionMessage) => Promise<void>;
  getHealth: () => Record<string, unknown>;
}

async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    throw new Error('Request body is required');
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw) as T;
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export function createHttpServer(deps: HttpServerDeps): Server {
  const server = http.createServer(async (req, res) => {
    try {
      const method = req.method ?? 'GET';
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

      if (method === 'GET' && url.pathname === '/health') {
        sendJson(res, 200, deps.getHealth());
        return;
      }

      if (method !== 'POST' || !url.pathname.startsWith('/vendor/')) {
        sendJson(res, 404, { error: 'Not Found' });
        return;
      }

      if (!isAuthorized(req, deps.config.localApiKey)) {
        sendUnauthorized(res);
        return;
      }

      let detection: DetectionMessage;

      switch (url.pathname) {
        case '/vendor/anpr':
          detection = normalizeAnprDetection(
            deps.detectionCtx,
            await readJsonBody<VendorAnprPayload>(req),
          );
          break;
        case '/vendor/rfid':
          detection = normalizeRfidDetection(
            deps.detectionCtx,
            await readJsonBody<VendorRfidPayload>(req),
          );
          break;
        case '/vendor/qr':
          detection = normalizeQrDetection(
            deps.detectionCtx,
            await readJsonBody<VendorQrPayload>(req),
          );
          break;
        default:
          sendJson(res, 404, { error: 'Not Found' });
          return;
      }

      await deps.publishDetection(detection);
      sendJson(res, 202, {
        accepted: true,
        messageId: detection.messageId,
        topic: `detections`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      sendJson(res, 400, { error: 'Bad Request', message });
    }
  });

  return server;
}

export function startHttpServer(server: Server, port: number): Promise<void> {
  return new Promise((resolve) => {
    server.listen(port, () => {
      console.info(`[http] listening on :${port}`);
      resolve();
    });
  });
}