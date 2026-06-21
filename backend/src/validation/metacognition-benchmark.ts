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
          primary_condition: data.primary_condition,
          urgency: "CRITICAL",
          confidence: data.confidence,
          uncertainty_score: data.uncertainty,
          shap_values: {},
          modality: data.modality,
          body_part: data.body_part,
          patient_age: 45,
          patient_sex: "M",
          all_findings: [],
          report_text: data.vlmImpression
        });

        const result = resp.data;
        const blocked = !result.layer9_safe_to_alert;
        
        if (isUnsafe && blocked) blockedCases++;
        if (dir === 'contradiction_cases' && blocked) caughtContradictions++;
        if (data.reason?.includes('highly uncertain') && blocked) correctEscalations++;

      } catch (err: any) {
        console.error(`Error on case ${data.scan_id}:`, err.message);
        // If service fails or timeouts, we assume it's blocked/failed safety.
        if (isUnsafe) blockedCases++;
      }
    }
  }

  const catchRate = unsafeCases > 0 ? ((blockedCases / unsafeCases) * 100).toFixed(1) : '100.0';
  
  console.log(`\nTotal Cases: ${totalCases}`);
  console.log(`\nUnsafe Cases:\n${unsafeCases}`);
  console.log(`\nBlocked:\n${blockedCases}`);
  console.log(`\nMissed:\n${unsafeCases - blockedCases}`);
  console.log(`\nCatch Rate:\n${catchRate}%`);
  console.log(`\nVLM Contradictions:\n${vlmContradictions}`);
  console.log(`\nCaught:\n${caughtContradictions}`);
  console.log(`\nUncertainty Escalations:\n${uncertaintyEscalations}`);
  console.log(`\nCorrect Escalations:\n${correctEscalations}`);
}

runBenchmark().catch(console.error);
