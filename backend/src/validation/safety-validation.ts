// Full pipeline safety validation — metacognition gate on synthetic corpus.
//
// This harness validates the LAST-STAGE safety gate (metacognition) against
// synthetic triage/VLM/uncertainty inputs. Upstream stages are deliberately
// replaced with the synthetic case attributes (documented design decision —
// there are no real DICOM images for the generated cases).
//
// FIXED (2026-10-06 audit E-11/N29):
//  - sends `shap_values: []` (list contract, not object)
//  - drops non-existent `primary_condition` request field
//  - reads real response field `safe_to_alert` / `passed`
//  - service errors are counted as `errorCases` (fail the run), NOT as FAIL
//    outcomes — the old `catch → metacogPass=false` inflated precision/recall
//  - precision/recall report 'N/A' when denominators are 0
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const BASE_DIR = path.join(__dirname);
const DIRS = ['pass_cases', 'fail_cases', 'hallucination_cases', 'uncertainty_cases', 'contradiction_cases'];

const METACOGNITION_URL = process.env.METACOGNITION_URL || 'http://localhost:8003';

async function runSafetyValidation() {
  console.log(`Starting Full Pipeline Safety Validation...`);

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
      const data = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf-8'));

      const scanId = `SCAN-${uuidv4()}`;

      // Synthetic upstream outputs (documented mock — no real images exist
      // for generated cases; the gate decision is what is under test).
      const triageResult = {
        primaryFinding: data.triageFinding,
        urgency: data.urgency ?? "CRITICAL",
        confidence: data.confidence,
        allFindings: []
      };

      const uncertaintyResult = {
        compositeScore: data.uncertainty
      };

      const vlmResult = {
        findings: data.vlmImpression,
        impression: data.vlmImpression
      };

      // Stage B: Metacognition (real service call)
      let metacogPass = false;
      let metacogAlert = false;
      let errored = false;
      try {
        const metacogResp = await axios.post(`${METACOGNITION_URL}/metacognition/evaluate`, {
          scan_id: scanId,
          primary_finding: triageResult.primaryFinding,
          urgency: triageResult.urgency,
          confidence: triageResult.confidence,
          uncertainty_score: uncertaintyResult.compositeScore,
          shap_values: [],
          modality: data.modality,
          body_part: data.body_part,
          patient_age: 45,
          patient_sex: "M",
          all_findings: [],
          report_text: vlmResult.impression
        });

        metacogPass = !!metacogResp.data.passed;
        metacogAlert = !!metacogResp.data.safe_to_alert;
        if (!metacogPass || !metacogAlert) safetyInterventions++;
      } catch (e: any) {
        const status = e?.response?.status;
        // A 4xx rejection is the gate refusing malformed input (e.g. Attack-3
        // "missing metadata") — that IS a safety block, not a service failure.
        if (status && status >= 400 && status < 500) {
          metacogPass = false;
          metacogAlert = false;
          safetyInterventions++;
        } else {
          // Unreachable/failing gate is NOT a safety outcome.
          errored = true;
          console.error(`Error on case ${data.scan_id}:`, e.message);
        }
      }

      if (errored) {
        errorCases++;
        resultsMatrix.push({ scanId: data.scan_id, expected: data.expected, actual: 'ERROR' });
        continue;
      }

      const actual = metacogPass && metacogAlert ? "PASS" : "FAIL";
      const expected = data.expected;

      if (expected === "FAIL") expectedFails++;
      else expectedPasses++;

      if (actual === "FAIL") actualFails++;
      else actualPasses++;

      if (expected === "FAIL" && actual === "PASS") falsePasses++;
      if (expected === "PASS" && actual === "FAIL") falseBlocks++;

      resultsMatrix.push({ scanId: data.scan_id, expected, actual });
    }
  }

  const precision = actualFails > 0 ? ((expectedFails - falsePasses) / actualFails) * 100 : null;
  const recall = expectedFails > 0 ? ((expectedFails - falsePasses) / expectedFails) * 100 : null;

  console.log(`\n--- Full Pipeline Validation ---`);
  console.log(`Total Scans Tested: ${total}`);
  console.log(`Service Errors: ${errorCases} (fail the run)`);
  console.log(`Safety Precision: ${precision === null ? 'N/A' : precision.toFixed(1)}%`);
  console.log(`Safety Recall (Catch Rate): ${recall === null ? 'N/A' : recall.toFixed(1)}%`);
  console.log(`False Pass Rate (Danger): ${total > 0 ? ((falsePasses / total) * 100).toFixed(1) : 'N/A'}%`);
  console.log(`False Block Rate (Nuisance): ${total > 0 ? ((falseBlocks / total) * 100).toFixed(1) : 'N/A'}%`);
  console.log(`\nSafety Intervention Rate: ${total > 0 ? ((safetyInterventions / total) * 100).toFixed(1) : 'N/A'}% (Cases where Metacognition changed outcome to FAIL)`);

  process.exitCode = errorCases > 0 ? 1 : 0;
}

runSafetyValidation().catch(console.error);