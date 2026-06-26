#!/usr/bin/env node
/**
 * Run only Maven tests affected by changes vs origin/develop.
 * Exits 0 when no matching tests (--passWithNoTests behavior).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE_REF = process.env.CI_BASE_REF ?? 'origin/develop';
const PAYMENT_ROOT = path.join(process.cwd(), 'payment-service');

function runGit(command) {
  return execSync(command, { encoding: 'utf8' }).trim();
}

function getChangedPaymentFiles() {
  const commands = [
    `git diff --name-only ${BASE_REF}...HEAD -- payment-service/`,
    `git diff --name-only ${BASE_REF} HEAD -- payment-service/`,
  ];

  for (const command of commands) {
    try {
      const output = runGit(command);
      return output ? output.split('\n').filter(Boolean) : [];
    } catch {
      // try next diff syntax
    }
  }

  return [];
}

function testClassFromTestFile(file) {
  const match = file.match(/^payment-service\/src\/test\/java\/(.+)\.java$/);
  if (!match) {
    return null;
  }
  return match[1].replace(/\//g, '.');
}

function testClassesForMainFile(file) {
  const match = file.match(/^payment-service\/src\/main\/java\/(.+)\/([^/]+)\.java$/);
  if (!match) {
    return [];
  }

  const packagePath = match[1];
  const className = match[2];
  const testDir = path.join(PAYMENT_ROOT, 'src/test/java', packagePath);
  const classes = new Set();

  const directTest = path.join(testDir, `${className}Test.java`);
  if (fs.existsSync(directTest)) {
    classes.add(`${packagePath.replace(/\//g, '.')}.${className}Test`);
  }

  if (fs.existsSync(testDir)) {
    for (const entry of fs.readdirSync(testDir)) {
      if (entry.endsWith('Test.java') && entry.includes(className)) {
        classes.add(`${packagePath.replace(/\//g, '.')}.${entry.replace('.java', '')}`);
      }
    }
  }

  return [...classes];
}

const changedFiles = getChangedPaymentFiles();
const testClasses = new Set();

for (const file of changedFiles) {
  if (file.includes('/src/test/') && file.endsWith('.java')) {
    const testClass = testClassFromTestFile(file);
    if (testClass) {
      testClasses.add(testClass);
    }
    continue;
  }

  if (file.includes('/src/main/') && file.endsWith('.java')) {
    for (const testClass of testClassesForMainFile(file)) {
      testClasses.add(testClass);
    }
  }
}

if (testClasses.size === 0) {
  console.log('No affected payment-service tests found — passWithNoTests');
  process.exit(0);
}

const testArg = [...testClasses].join(',');
console.log(`Running affected payment tests: ${testArg}`);
execSync(`mvn -B test -Dtest=${testArg}`, {
  cwd: PAYMENT_ROOT,
  stdio: 'inherit',
});