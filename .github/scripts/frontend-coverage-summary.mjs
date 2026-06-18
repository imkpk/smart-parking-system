import fs from 'node:fs';
import path from 'node:path';

const summaryPath = path.resolve('coverage/coverage-summary.json');
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const total = summary.total;

const formatMetric = (metric) =>
  `${total[metric].pct}% (${total[metric].covered}/${total[metric].total})`;

const lowestCoverage = Object.entries(summary)
  .filter(([key]) => key !== 'total')
  .map(([filePath, metrics]) => ({
    file: filePath.replace(/^.*[/\\]src[/\\]/, 'src/').replaceAll('\\', '/'),
    lines: metrics.lines.pct,
  }))
  .filter((entry) => entry.lines < 100)
  .sort((left, right) => left.lines - right.lines)
  .slice(0, 10);

const markdown = `## Frontend Coverage (Vitest v8)

| Metric | Coverage |
|--------|----------|
| Statements | ${formatMetric('statements')} |
| Branches | ${formatMetric('branches')} |
| Functions | ${formatMetric('functions')} |
| Lines | ${formatMetric('lines')} |

### LCOV report
Download the \`frontend-coverage\` workflow artifact for \`lcov.info\` and the HTML report.

<details>
<summary>Lowest line coverage (top 10)</summary>

| File | Lines |
|------|-------|
${lowestCoverage.map((entry) => `| \`${entry.file}\` | ${entry.lines}% |`).join('\n')}

</details>
`;

fs.writeFileSync('coverage/pr-coverage-comment.md', markdown);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}