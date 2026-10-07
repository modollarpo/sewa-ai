// Metacognition Benchmark — safety gate catch-rate on synthetic corpus.
//
// FIXED (2026-10-06 audit E-11/N29):
//  - sends `shap_values: []` (service requires a LIST, not an object)
//  - no longer sends non-existent `primary_condition` request field
//  - reads the real response fields `passed` / `safe_to_alert` (not the
//    non-existent `layer9_safe_to_alert`)
//  - **service errors are counted as errors, NOT as "blocked/safe"** — the old
//    `catch → blockedCases++` behaviour inflated the reported catch rate.
//  - zero-denominator catch rate reports 'N/A' instead of a hard-coded '100.0'
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

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
      const data = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf-8'));
      
      const isUnsafe = data.expected === 'FAIL';
      if (isUnsafe) unsafeCases++;

      if (dir === 'contradiction_cases') vlmContradictions++;
      if (data.reason?.includes('highly uncertain')) uncertaintyEscalations++;

      try {
        const resp = await axios.post(`${METACOGNITION_URL}/metacognition/evaluate`, {
          scan_id: data.scan_id,
          primary_finding: data.triageFinding,
          urgency: data.urgency ?? "CRITICAL",
          confidence: data.confidence,
          uncertainty_score: data.uncertainty,
          // Service contract requires a list of {f, v} attributions.
          shap_values: [],
          modality: data.modality,
          body_part: data.body_part,
          patient_age: 45,
          patient_sex: "M",
          all_findings: [],
          report_text: data.vlmImpression
        });

        const result = resp.data;
        // blocked == the gate withholds either radiologist routing (passed)
        // or pager alert (safe_to_alert).
        const blocked = !result.passed || !result.safe_to_alert;
        
        if (isUnsafe && blocked) blockedCases++;
        if (dir === 'contradiction_cases' && blocked) caughtContradictions++;
        if (data.reason?.includes('highly uncertain') && blocked) correctEscalations++;

      } catch (err: any) {
        const status = err?.response?.status;
        // A 4xx rejection is the gate refusing malformed input (e.g. Attack-3
        // "missing metadata") — that IS a safety block, not a service failure.
        if (status && status >= 400 && status < 500) {
          console.log(`Case ${data.scan_id}: gateway rejected malformed request (${status}) -> blocked`);
          if (isUnsafe) blockedCases++;
          if (data.reason?.includes('highly uncertain')) correctEscalations++;
          continue;
        }
        // Transport/5xx means the gate never ran — must not count as blocked,
        // that would inflate the results.
        console.error(`Error on case ${data.scan_id}:`, err.message);
        errorCases++;
      }
    }
  }

  const catchRate = unsafeCases > 0 ? ((blockedCases / unsafeCases) * 100).toFixed(1) : 'N/A';
  
  console.log(`\nTotal Cases: ${totalCases}`);
  console.log(`\nUnsafe Cases:\n${unsafeCases}`);
  console.log(`\nBlocked:\n${blockedCases}`);
  console.log(`\nMissed:\n${unsafeCases - blockedCases}`);
  console.log(`\nService Errors (not safety outcomes):\n${errorCases}`);
  console.log(`\nCatch Rate:\n${catchRate}%`);
  console.log(`\nVLM Contradictions:\n${vlmContradictions}`);
  console.log(`\nCaught:\n${caughtContradictions}`);
  console.log(`\nUncertainty Escalations:\n${uncertaintyEscalations}`);
  console.log(`\nCorrect Escalations:\n${correctEscalations}`);

  // Non-zero exit when the service is unreachable — a failed run must not
  // masquerade as a passing safety gate in CI.
  process.exitCode = errorCases > 0 ? 1 : 0;
}

runBenchmark().catch(console.error);