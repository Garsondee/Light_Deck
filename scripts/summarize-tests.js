const fs = require('fs');
const path = require('path');

function main() {
  const resultsPath = path.join(__dirname, '..', 'test-results', 'results.json');
  const outputDir = path.join(__dirname, '..', 'test-results');
  const summaryPath = path.join(outputDir, 'summary.md');

  if (!fs.existsSync(resultsPath)) {
    console.error(`[summarize-tests] results.json not found at ${resultsPath}.`);
    console.error('Run `npm test` (or your Playwright command) first.');
    process.exit(1);
  }

  /** @type {import("@playwright/test/reporter").FullResult} */
  const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

  const lines = [];
  lines.push('# Playwright Test Summary');
  lines.push('');
  lines.push(`- **Status**: ${data.status}`);
  lines.push(`- **Start**: ${data.startTime}`);
  lines.push(`- **End**: ${data.endTime}`);
  lines.push('');

  const allSuites = [];
  function collectSuites(suite) {
    if (!suite) return;
    allSuites.push(suite);
    if (suite.suites) {
      for (const child of suite.suites) collectSuites(child);
    }
  }

  collectSuites(data.suites && data.suites[0]);

  const tests = [];
  for (const suite of allSuites) {
    if (!suite.specs) continue;
    for (const spec of suite.specs) {
      const title = spec.title;
      const file = spec.file; 
      for (const test of spec.tests) {
        for (const result of test.results) {
          const status = result.status;
          const durationMs = result.duration;
          tests.push({
            title,
            file,
            status,
            durationMs,
          });
        }
      }
    }
  }

  const passed = tests.filter(t => t.status === 'passed');
  const failed = tests.filter(t => t.status === 'failed');
  const skipped = tests.filter(t => t.status === 'skipped');
  const timedOut = tests.filter(t => t.status === 'timedOut');

  lines.push('## Totals');
  lines.push('');
  lines.push(`- **Total runs**: ${tests.length}`);
  lines.push(`- **Passed**: ${passed.length}`);
  lines.push(`- **Failed**: ${failed.length}`);
  lines.push(`- **Timed out**: ${timedOut.length}`);
  lines.push(`- **Skipped**: ${skipped.length}`);
  lines.push('');

  if (failed.length > 0 || timedOut.length > 0) {
    lines.push('## Failing / Timed-out Tests');
    lines.push('');
    for (const t of [...failed, ...timedOut]) {
      const shortFile = path.relative(path.join(__dirname, '..'), t.file || '');
      lines.push(`- **${t.status.toUpperCase()}** - ${t.title}`);
      if (shortFile) {
        lines.push(`  - File: ${shortFile}`);
      }
      lines.push(`  - Duration: ${t.durationMs}ms`);
    }
    lines.push('');
  }

  // Optional: brief list of passes, but keep it compact
  lines.push('## Passed Tests (compact)');
  lines.push('');
  const maxPassedToShow = 50;
  const shownPassed = passed.slice(0, maxPassedToShow);
  for (const t of shownPassed) {
    const shortFile = path.relative(path.join(__dirname, '..'), t.file || '');
    lines.push(`- ${t.title} (${shortFile || 'unknown file'})`);
  }
  if (passed.length > maxPassedToShow) {
    lines.push('');
    lines.push(`_...and ${passed.length - maxPassedToShow} more passed tests._`);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(summaryPath, lines.join('\n'), 'utf-8');
  console.log(`[summarize-tests] Wrote summary to ${summaryPath}`);
}

main();
