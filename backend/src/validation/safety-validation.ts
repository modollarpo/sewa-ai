// Full pipeline safety validation — metacognition gate on synthetic corpus.
//
// This harness validates the LAST-STAGE safety gate (metacognition) against
// synthetic triage/VLM/uncertainty inputs. Upstream stages are deliberately
// replaced with the synthetic case attributes (documented design decision —
// there are no real DICOM images for the generated cases).
//
// FIXED (2026-10-06 audit E-11/N29, hardened 2026-10-07):
//  - sends `shap_values: []` (list contract, not object)
//  - drops non-existent `primary_condition` request field
//  - reads real response field `safe_to_alert` / `passed`
//  - service errors are counted as `errorCases` (fail the run), NOT as FAIL
//    outcomes — the old `catch → metacogPass=false` inflated precision/recall
//  - payload is validated against wire-contract.json FIRST: a deliberately
//    malformed case (e.g. ATTACK-3 missing metadata) is a safety block, but a
//    harness-built payload that violates the contract is an error that fails
//    the run (the old code counted a bad scan_id as a "blocked" outcome)
//  - a contract-valid payload answered with 4xx, or a 200 response missing
//    declared fields, is a contract error → non-zero exit
//  - precision/recall report 'N/A' when denominators are 0
//  - unexpected rejections exit non-zero instead of being swallowed
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

import { buildMetacogPayload, payloadProblems, responseProblems, type SafetyCase } from './metacogCase';

const BASE_DIR = path.join(__dirname);
const DIRS = ['pass_cases', 'fail_cases', 'hallucination_cases', 'uncertainty_cases', 'contradiction_cases'];

const METACOGNITION_URL = process.env.METACOGNITION_URL || 'http://localhost:8003';

async function runSafetyValidation() {
  console.log(`Starting Full Pipeline Safety Validation against ${METACOGNITION_URL}...`);

  let total = 0;
  let expectedFails = 0;
  let expectedPasses = 0;
  let actualFails = 0;
  let actualPasses = 0;
  let errorCases = 0;

  let falsePasses = 0;
  let falseBlocks = 0;
  let safetyInterventions = 0;

  const resultsMatrix: unknown[] = [];

  for (const dir of DIRS) {
    const dirPath = path.join(BASE_DIR, dir);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json')).slice(0, 10);
    for (const file of files) {
      total++;
      const data: SafetyCase = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf-8'));

      const payload = buildMetacogPayload(data);
      const payloadIssues = payloadProblems(payload);

      // Stage B: Metacognition (real service call)
      let metacogPass = false;
      let metacogAlert = false;
      const contractErrors: string[] = [];

      try {
        const metacogResp = await axios.post(`${METACOGNITION_URL}/metacognition/evaluate`, payload);
        const body = metacogResp.data ?? {};

        if (payloadIssues.length > 0) {
          contractErrors.push(`service ACCEPTED a contract-invalid payload → ${payloadIssues.join('; ')}`);
        }
        const responseIssues = responseProblems(body);
        if (responseIssues.length > 0) {
          contractErrors.push(`response contract → ${responseIssues.join('; ')}`);
        }

        metacogPass = !!body.passed;
        metacogAlert = !!body.safe_to_alert;
        if (!metacogPass || !metacogAlert) safetyInterventions++;
      } catch (e: any) {
        const status: number | undefined = e?.response?.status;
        if (status !== undefined && status >= 400 && status < 500) {
          if (payloadIssues.length > 0) {
            // The gate refused the (deliberately) malformed case data — that IS
            // a safety block, not a service failure.
            metacogPass = false;
            metacogAlert = false;
            safetyInterventions++;
          } else {
            contractErrors.push(
              `contract-valid payload rejected with ${status}: ${JSON.stringify(e?.response?.data ?? e.message)}`,
            );
          }
        } else {
          // Unreachable/failing gate is NOT a safety outcome.
          contractErrors.push(`transport/service error: ${e?.message}`);
        }
      }

      if (contractErrors.length > 0) {
        errorCases++;
        console.error(`Contract error on case ${data.scan_id ?? file}:`, contractErrors.join(' | '));
        resultsMatrix.push({
          scanId: data.scan_id ?? file,
          expected: data.expected,
          actual: 'ERROR',
          problems: contractErrors,
        });
        continue;
      }

      const actual = metacogPass && metacogAlert ? 'PASS' : 'FAIL';
      const expected = data.expected;

      if (expected === 'FAIL') expectedFails++;
      else expectedPasses++;

      if (actual === 'FAIL') actualFails++;
      else actualPasses++;

      if (expected === 'FAIL' && actual === 'PASS') falsePasses++;
      if (expected === 'PASS' && actual === 'FAIL') falseBlocks++;

      resultsMatrix.push({ scanId: data.scan_id ?? file, expected, actual });
    }
  }

  const precision = actualFails > 0 ? ((expectedFails - falsePasses) / actualFails) * 100 : null;
  const recall = expectedFails > 0 ? ((expectedFails - falsePasses) / expectedFails) * 100 : null;

  console.log(`\n--- Full Pipeline Validation ---`);
  console.log(`Total Scans Tested: ${total}`);
  console.log(`Expected FAIL (unsafe): ${expectedFails} | Expected PASS (safe): ${expectedPasses}`);
  console.log(`Observed FAIL (blocked): ${actualFails} | Observed PASS (allowed): ${actualPasses}`);
  console.log(`Contract/Service Errors: ${errorCases} (fail the run)`);
  console.log(`Safety Precision: ${precision === null ? 'N/A' : precision.toFixed(1)}%`);
  console.log(`Safety Recall (Catch Rate): ${recall === null ? 'N/A' : recall.toFixed(1)}%`);
  console.log(`False Pass Rate (Danger): ${total > 0 ? ((falsePasses / total) * 100).toFixed(1) : 'N/A'}%`);
  console.log(`False Block Rate (Nuisance): ${total > 0 ? ((falseBlocks / total) * 100).toFixed(1) : 'N/A'}%`);
  console.log(`\nSafety Intervention Rate: ${total > 0 ? ((safetyInterventions / total) * 100).toFixed(1) : 'N/A'}% (Cases where Metacognition changed outcome to FAIL)`);

  if (total === 0) {
    console.error('No safety cases were executed — refusing to report a passing run.');
    process.exitCode = 1;
    return;
  }
  process.exitCode = errorCases > 0 ? 1 : 0;
}

runSafetyValidation().catch(err => {
  console.error('Safety validation crashed:', err);
  process.exit(1);
});
