import fs from 'fs';
import path from 'path';
import axios from 'axios';

const VALIDATION_DIR = path.resolve(__dirname, '../../validation');
const DIRS = ['pass_cases', 'fail_cases', 'hallucination_cases', 'uncertainty_cases', 'contradiction_cases'];

async function run() {
  let total = 0;
  let passed = 0;
  let failed = 0;

  for (const dir of DIRS) {
    const dirPath = path.join(VALIDATION_DIR, dir);
    if (!fs.existsSync(dirPath)) continue;
    
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    for (const file of files) {
      total++;
      const caseData = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf8'));
      
      // Prepare the payload for Metacognition API
      const payload = {
        scan_id: `SCAN-${total.toString().padStart(3, '0')}`,
        primary_finding: caseData.triageFinding,
        urgency: 'CRITICAL', // we can default to CRITICAL for ICH
        confidence: caseData.confidence,
        uncertainty_score: caseData.uncertainty,
        modality: 'CT',
        body_part: 'Head',
        report_text: caseData.vlmImpression
      };

      try {
        const res = await axios.post('http://localhost:8003/metacognition/evaluate', payload);
        const aiPassed = res.data.passed;
        const expected = caseData.expected === 'PASS';

        if (aiPassed === expected) {
          passed++;
        } else {
          console.error(`❌ Case ${file} Failed! Expected ${caseData.expected}, but got passed=${aiPassed}`);
          console.error(`   Flags:`, res.data.flags);
          failed++;
        }
      } catch (err: any) {
        console.error(`Error connecting to metacognition API for ${file}:`, err.message);
        failed++;
      }
    }
  }

  console.log('\n--- Safety Validation Results ---');
  console.log(`Total Cases: ${total}`);
  console.log(`Matched Expected: ${passed}`);
  console.log(`Mismatched: ${failed}`);

  if (failed > 0) {
    console.log('❌ METACOGNITION SAFETY CHECK FAILED');
    process.exit(1);
  } else {
    console.log('✅ METACOGNITION SAFETY CHECK PASSED');
    process.exit(0);
  }
}

run();
