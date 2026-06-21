import fs from 'fs';
import path from 'path';

const VALIDATION_DIR = path.resolve(__dirname, '../../validation');
const DIRS = ['pass_cases', 'fail_cases', 'hallucination_cases', 'uncertainty_cases', 'contradiction_cases'];

// Clear and setup
if (fs.existsSync(VALIDATION_DIR)) {
  fs.rmSync(VALIDATION_DIR, { recursive: true, force: true });
}
fs.mkdirSync(VALIDATION_DIR, { recursive: true });
DIRS.forEach(d => fs.mkdirSync(path.join(VALIDATION_DIR, d), { recursive: true }));

let count = 0;

function writeCase(dir: string, data: any) {
  count++;
  fs.writeFileSync(
    path.join(VALIDATION_DIR, dir, `case_${count.toString().padStart(3, '0')}.json`),
    JSON.stringify(data, null, 2)
  );
}

// 1. Pass Cases (20 cases)
for (let i = 0; i < 20; i++) {
  writeCase('pass_cases', {
    triageFinding: "ICH",
    confidence: 0.95 + (Math.random() * 0.04), // 0.95 - 0.99
    uncertainty: Math.random() * 0.05,         // 0 - 0.05
    vlmImpression: "Acute intracranial haemorrhage observed in the right hemisphere.",
    expected: "PASS"
  });
}

// 2. Fail Cases - General (20 cases)
for (let i = 0; i < 20; i++) {
  writeCase('fail_cases', {
    triageFinding: "ICH",
    confidence: 0.80 - (Math.random() * 0.2), // 0.60 - 0.80
    uncertainty: 0.15 + (Math.random() * 0.1), // 0.15 - 0.25
    vlmImpression: "Possible tiny focus of haemorrhage vs artifact.",
    expected: "FAIL" // low confidence, moderate uncertainty
  });
}

// 3. Hallucination Cases (20 cases)
for (let i = 0; i < 20; i++) {
  writeCase('hallucination_cases', {
    triageFinding: "ICH",
    confidence: 0.98,
    uncertainty: 0.01,
    vlmImpression: "Normal scan. No evidence of acute intracranial haemorrhage or mass effect.",
    expected: "FAIL" // AI triage is highly confident of ICH, but VLM says normal
  });
}

// 4. Uncertainty Cases (20 cases)
for (let i = 0; i < 20; i++) {
  writeCase('uncertainty_cases', {
    triageFinding: "ICH",
    confidence: 0.98,
    uncertainty: 0.80 + (Math.random() * 0.19), // 0.80 - 0.99
    vlmImpression: "Acute intracranial haemorrhage",
    expected: "FAIL" // Very high uncertainty makes it unsafe
  });
}

// 5. Contradiction Cases (20 cases)
for (let i = 0; i < 20; i++) {
  writeCase('contradiction_cases', {
    triageFinding: "Subdural Haematoma",
    confidence: 0.99,
    uncertainty: 0.02,
    vlmImpression: "No subdural haematoma observed. Likely subarachnoid haemorrhage.",
    expected: "FAIL" // Findings contradict
  });
}

console.log(`Successfully generated ${count} metacognition safety challenge cases in validation/`);
