-- Add PUBLISHING state for concurrency-safe MQTT publication
ALTER TYPE "GateCommandStatus" ADD VALUE IF NOT EXISTS 'PUBLISHING' BEFORE 'PUBLISHED';