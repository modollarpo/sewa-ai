// Metacognition Benchmark — safety gate catch-rate on synthetic corpus.
//
// FIXED (2026-10-06 audit E-11/N29, hardened 2026-10-07):
//  - sends `shap_values: []` (service requires a LIST, not an object)
//  - no longer sends non-existent `primary_condition` request field
//  - reads the real response fields `passed` / `safe_to_alert` (not the
//    non-existent `layer9_safe_to_alert`)
//  - **service errors are counted as errors, NOT as "blocked/safe"** — the old
//    `catch → blockedCases++` behaviour inflated the reported catch rate.
//  - payload is validated against wire-contract.json FIRST: an expected 4xx on
//    deliberately malformed case data is a block, but a 4xx caused by our own
//    invalid payload is a contract error that fails the run
//  - zero-denominator catch rate reports 'N/A' instead of a hard-coded '100.0'
//  - unexpected rejections exit non-zero instead of being swallowed
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

import { buildMetacogPayload, payloadProblems, responseProblems, type SafetyCase } from './metacogCase';

const BASE_DIR = path.join(__dirname);
const DIRS = ['pass_cases', 'fail_cases', 'hallucination_cases', 'uncertainty_cases', 'contradiction_cases'];
const METACOGNITION_URL = process.env.METACOGNITION_URL || 'http://localhost:8003';

async function runBenchmark() {
  console.log(`Starting Metacognition Benchmark against ${METACOGNITION_URL}`);
  let totalCases = 0;
  let unsafeCases = 0;
  let blockedCases = 0;
  let errorCases = 0;
  let vlmContradictions = 0;
  let caughtContradictions = 0;
  let uncertaintyEscalations = 0;
  let correctEscalations = 0;

  for (const dir of DIRS) {
    const dirPath = path.join(BASE_DIR, dir);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    for (const file of files) {
      totalCases++;
      const data: SafetyCase = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf-8'));

      const isUnsafe = data.expected === 'FAIL';
      if (isUnsafe) unsafeCases++;

      if (dir === 'contradiction_cases') vlmContradictions++;
      if (data.reason?.includes('highly uncertain')) uncertaintyEscalations++;

      const payload = buildMetacogPayload(data);
      const payloadIssues = payloadProblems(payload);
      const contractErrors: string[] = [];

      try {
        const resp = await axios.post(`${METACOGNITION_URL}/metacognition/evaluate`, payload);
        const result = resp.data ?? {};

        if (payloadIssues.length > 0) {
          contractErrors.push(`service ACCEPTED a contract-invalid payload → ${payloadIssues.join('; ')}`);
        }
        const responseIssues = responseProblems(result);
        if (responseIssues.length > 0) {
          contractErrors.push(`response contract → ${responseIssues.join('; ')}`);
        }

        // blocked == the gate withholds either radiologist routing (passed)
        // or pager alert (safe_to_alert).
        const blocked = !result.passed || !result.safe_to_alert;

        if (isUnsafe && blocked) blockedCases++;
        if (dir === 'contradiction_cases' && blocked) caughtContradictions++;
        if (data.reason?.includes('highly uncertain') && blocked) correctEscalations++;
      } catch (err: any) {
        const status: number | undefined = err?.response?.status;
        if (status !== undefined && status >= 400 && status < 500) {
          if (payloadIssues.length > 0) {
            // The gate refused the (deliberately) malformed case data → block.
            console.log(`Case ${data.scan_id ?? file}: gate rejected malformed case data (${status}) -> blocked`);
            if (isUnsafe) blockedCases++;
            if (data.reason?.includes('highly uncertain')) correctEscalations++;
          } else {
            contractErrors.push(
              `contract-valid payload rejected with ${status}: ${JSON.stringify(err?.response?.data ?? err.message)}`,
            );
          }
        } else {
          // Transport/5xx means the gate never ran — must not count as blocked,
          // that would inflate the results.
          contractErrors.push(`transport/service error: ${err?.message}`);
        }
      }

      if (contractErrors.length > 0) {
        console.error(`Contract error on case ${data.scan_id ?? file}:`, contractErrors.join(' | '));
        errorCases++;
      }
    }
  }

  const catchRate = unsafeCases > 0 ? ((blockedCases / unsafeCases) * 100).toFixed(1) : 'N/A';

  console.log(`\nTotal Cases: ${totalCases}`);
  console.log(`\nUnsafe Cases:\n${unsafeCases}`);
  console.log(`\nBlocked:\n${blockedCases}`);
  console.log(`\nMissed:\n${unsafeCases - blockedCases}`);
  console.log(`\nContract/Service Errors (not safety outcomes):\n${errorCases}`);
  console.log(`\nCatch Rate:\n${catchRate}%`);
  console.log(`\nVLM Contradictions:\n${vlmContradictions}`);
  console.log(`\nCaught:\n${caughtContradictions}`);
  console.log(`\nUncertainty Escalations:\n${uncertaintyEscalations}`);
  console.log(`\nCorrect Escalations:\n${correctEscalations}`);

  if (totalCases === 0) {
    console.error('No safety cases were executed — refusing to report a passing run.');
    process.exitCode = 1;
    return;
  }
  // Non-zero exit when the service is unreachable or the contract drifted —
  // a failed run must not masquerade as a passing safety gate in CI.
  process.exitCode = errorCases > 0 ? 1 : 0;
}

runBenchmark().catch(err => {
  console.error('Metacognition benchmark crashed:', err);
  process.exit(1);
});
