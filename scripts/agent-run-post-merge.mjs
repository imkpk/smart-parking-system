#!/usr/bin/env node
/**
 * After a PR merges to develop, update agent-run index and report status files.
 * Invoked by .github/workflows/agent-run-post-merge.yml
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const prNumber = process.env.PR_NUMBER ?? '';
const prTitle = process.env.PR_TITLE ?? '';
const prBody = process.env.PR_BODY ?? '';
const prHeadRef = process.env.PR_HEAD_REF ?? '';

const warnings = [];
const actions = [];
let changed = false;

function summary(line) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file) {
    fs.appendFileSync(file, `${line}\n`);
  }
}

function warn(msg) {
  warnings.push(msg);
  console.warn(`WARNING: ${msg}`);
  summary(`⚠️ ${msg}`);
}

function act(msg) {
  actions.push(msg);
  console.log(msg);
  summary(`✅ ${msg}`);
}

function readUtf8(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

function writeUtf8IfChanged(relPath, next) {
  const full = path.join(ROOT, relPath);
  const prev = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
  if (prev === next) return false;
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, next, 'utf8');
  changed = true;
  return true;
}

function extractReportPaths(body) {
  const paths = new Set();
  if (!body) return paths;

  const reportLine = body.match(/(?:^|\n)\s*(?:Report|Expected report)[:\s]*[`"]?(\.grok\/reports\/[^\s`"]+\.md)/im);
  if (reportLine?.[1]) paths.add(reportLine[1].replace(/\\/g, '/'));

  for (const m of body.matchAll(/\.grok\/reports\/[a-zA-Z0-9_.-]+\.md/g)) {
    paths.add(m[0]);
  }
  return paths;
}

function updateAgentRunsReadme() {
  const rel = '.grok/agent-runs/README.md';
  const content = readUtf8(rel);
  if (!content) {
    warn(`${rel} not found — skip index update (merge #134 agent-run infrastructure first?).`);
    return { runFolder: null };
  }

  const prNeedle = `#${prNumber}`;
  const lines = content.split('\n');
  let runFolder = null;
  let rowUpdated = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('|') || line.includes('---') || !line.includes(prNeedle)) continue;

    const folderMatch = line.match(/\]\(\.\/([^)]+)\/\)/);
    if (folderMatch) runFolder = folderMatch[1];

    if (line.includes('⏳ In Progress')) {
      lines[i] = line.replace('⏳ In Progress', '✅ Merged');
      rowUpdated = true;
    } else if (!line.includes('✅ Merged')) {
      warn(`Index row for PR ${prNumber} found but status is not ⏳ In Progress — left unchanged.`);
    }
  }

  if (!rowUpdated) {
    warn(`No ⏳ In Progress index row for PR ${prNumber} in ${rel}.`);
    return { runFolder };
  }

  if (writeUtf8IfChanged(rel, lines.join('\n'))) {
    act(`Updated ${rel} — PR #${prNumber} → ✅ Merged`);
  }
  return { runFolder };
}

function updateReportFile(relPath) {
  let content = readUtf8(relPath);
  if (!content) {
    warn(`Report not found: ${relPath}`);
    return;
  }

  const original = content;

  content = content.replace(
    /\|\s*\[#?\d+\][^|]*\|\s*`[^`]+`\s*\|\s*Open\s*\|/g,
    (row) => row.replace(/\|\s*Open\s*\|/, '| Merged |'),
  );
  content = content.replace(/\|\s*TBD\s*\|[^|]*\|\s*Open\s*\|/gi, (row) =>
    row.replace(/\|\s*Open\s*\|/, '| Merged |'),
  );
  content = content.replace(/\*\*PR open[^*]*\*\*/gi, '**Merged**');
  content = content.replace(
    /(\*\*Status\*\*\s*\n+\s*)\*\*PR open[^*]*\*\*/gi,
    '$1**Merged**',
  );
  content = content.replace(
    /(## Status\s*\n+\s*)\*\*PR open[^*]*\*\*/gi,
    '$1**Merged**',
  );
  content = content.replace(/PR pending/gi, `PR #${prNumber} ✅`);
  content = content.replace(/pending merge/gi, 'merged');

  if (content !== original && writeUtf8IfChanged(relPath, content)) {
    act(`Updated report ${relPath} status → Merged`);
  }
}

function updateReportsReadme(reportPaths) {
  const rel = '.grok/reports/README.md';
  let content = readUtf8(rel);
  if (!content) return;

  const original = content;
  for (const reportPath of reportPaths) {
    const base = path.basename(reportPath);
    const prPatterns = [
      new RegExp(`(\\[${base.replace('.', '\\.')}\\][^|]*\\|[^|]*\\|)\\s*PR pending\\s*\\|`, 'i'),
      new RegExp(`(\\[${base.replace('.', '\\.')}\\][^|]*\\|[^|]*\\|)\\s*PR #${prNumber}\\s*\\|`, 'i'),
    ];
    for (const re of prPatterns) {
      content = content.replace(re, `$1 PR #${prNumber} ✅ |`);
    }
  }

  if (content !== original && writeUtf8IfChanged(rel, content)) {
    act(`Updated ${rel} for PR #${prNumber}`);
  }
}

function updateRunFolder(runFolder) {
  if (!runFolder) return;
  const base = `.grok/agent-runs/${runFolder}`;

  const readmeRel = `${base}/README.md`;
  const readme = readUtf8(readmeRel);
  if (readme) {
    let next = readme;
    next = next.replace(/\|\s*TBD\s*\|[^|]*\|\s*⏳ In Progress\s*\|/g, (row) => {
      const title = prTitle.replace(/\|/g, '\\|');
      return `| [#${prNumber}](https://github.com/${process.env.GITHUB_REPOSITORY}/pull/${prNumber}) | ${title} | ✅ Merged |`;
    });
    next = next.replace(
      new RegExp(`\\[#${prNumber}\\][^|]*\\|[^|]*\\|\\s*⏳ In Progress\\s*\\|`),
      (row) => row.replace('⏳ In Progress', '✅ Merged'),
    );
    next = next.replace(/Phase 15 push \+ PR \| ⏳/g, 'Phase 15 push + PR | ✅');
    if (writeUtf8IfChanged(readmeRel, next)) {
      act(`Updated ${readmeRel}`);
    }
  }

  const statusRel = `${base}/status.md`;
  const status = readUtf8(statusRel);
  if (status) {
    let next = status;
    next = next.replace(/\|\s*Merge to develop\s*\|\s*⏳ Human[^|]*\|/g, '| Merge to develop | ✅ Done | PR #' + prNumber + ' merged |');
    next = next.replace(/\|\s*Phase 15 push \+ PR\s*\|\s*⏳[^|]*\|/g, '| Phase 15 push + PR | ✅ Done |');
    const date = new Date().toISOString().slice(0, 10);
    next = next.replace(/## Last updated[\s\S]*$/m, `## Last updated\n\n${date} — Auto-updated after PR #${prNumber} merge\n`);
    if (writeUtf8IfChanged(statusRel, next)) {
      act(`Updated ${statusRel}`);
    }
  }
}

function main() {
  if (!prNumber) {
    warn('PR_NUMBER not set — nothing to do.');
    process.exit(0);
  }

  summary(`## Agent-run post-merge sync — PR #${prNumber}\n`);
  summary(`- **Title:** ${prTitle}`);
  summary(`- **Branch:** \`${prHeadRef}\``);

  const reportPaths = extractReportPaths(prBody);
  if (reportPaths.size === 0) {
    warn('No .grok/reports/*.md path found in PR body — will try index-linked report only.');
  } else {
    summary(`- **Report paths from PR body:** ${[...reportPaths].join(', ')}`);
  }

  const { runFolder } = updateAgentRunsReadme();

  for (const reportPath of reportPaths) {
    updateReportFile(reportPath);
  }

  updateReportsReadme(reportPaths);
  updateRunFolder(runFolder);

  if (!changed) {
    warn(`No agent-run files updated for PR #${prNumber}.`);
    summary('\n**Result:** no commit (warnings only).');
  } else {
    summary(`\n**Result:** ${actions.length} file(s) updated; commit will be pushed to develop.`);
  }

  fs.writeFileSync(
    path.join(ROOT, '.agent-run-post-merge.json'),
    JSON.stringify({ prNumber, prTitle, prHeadRef, changed, warnings, actions, reportPaths: [...reportPaths] }, null, 2),
  );

  process.exit(0);
}

main();