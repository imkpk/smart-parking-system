/**
 * Append-only event ledger (events.jsonl).
 */
import fs from 'node:fs';
import path from 'node:path';
import { validateWithSchemaFile } from './schema-validate.mjs';

export function appendEvent(runDir, event) {
  const record = {
    ts: event.ts || new Date().toISOString(),
    type: event.type,
    runId: event.runId,
    taskId: event.taskId ?? null,
    agent: event.agent ?? null,
    payload: event.payload ?? {},
  };
  const schemaCheck = validateWithSchemaFile(record, 'event.schema.json');
  if (!schemaCheck.valid) {
    // allow forward-compatible types in payload but type must be known
    // if schema rejects, still write with warning in payload
    record.payload = { ...record.payload, schemaWarnings: schemaCheck.errors };
  }
  const file = path.join(runDir, 'events.jsonl');
  fs.mkdirSync(runDir, { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf8');
  return record;
}

export function readEvents(runDir) {
  const file = path.join(runDir, 'events.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return { ts: null, type: 'parse.error', payload: { line: l } };
      }
    });
}

export function summarizeEvents(events) {
  const counts = {};
  for (const e of events) {
    counts[e.type] = (counts[e.type] || 0) + 1;
  }
  const taskStarted = events.filter((e) => e.type === 'task.started');
  const taskCompleted = events.filter((e) => e.type === 'task.completed');
  const taskFailed = events.filter((e) => e.type === 'task.failed');
  const retries = events.filter((e) => e.type === 'task.retried');
  return {
    eventCount: events.length,
    counts,
    taskStarted: taskStarted.length,
    taskCompleted: taskCompleted.length,
    taskFailed: taskFailed.length,
    retries: retries.length,
  };
}
