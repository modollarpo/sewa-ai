import * as fs from 'fs';
import * as path from 'path';

const BASE_DIR = path.join(__dirname);
const DIRS = ['pass_cases', 'fail_cases', 'hallucination_cases', 'uncertainty_cases', 'contradiction_cases'];

DIRS.forEach(dir => {
  const fullPath = path.join(BASE_DIR, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Base Case Generators
let caseCounter = 1;
function writeCase(dir: string, data: any) {
  const fileName = `case_${caseCounter.toString().padStart(3, '0')}.json`;
  fs.writeFileSync(path.join(BASE_DIR, dir, fileName), JSON.stringify(data, null, 2));
  caseCounter++;
}

// 1. Pass Cases (High confidence, low uncertainty, no contradiction)
for (let i = 0; i < 20; i++) {
  writeCase('pass_cases', {
    scan_id: `PASS-${i}`,
    modality: "CT",
    body_part: "Head",
    triageFinding: "ICH",
    primary_condition: "Intracranial Haemorrhage (ICH)",
    confidence: 0.90 + (Math.random() * 0.09), // 0.90 - 0.99
    uncertainty: 0.01 + (Math.random() * 0.08), // 0.01 - 0.09
    vlmImpression: "Acute intracranial haemorrhage observed in the basal ganglia.",
    expected: "PASS"
  });
}

// 2. Fail Cases (High confidence but high uncertainty)
for (let i = 0; i < 20; i++) {
  writeCase('fail_cases', {
    scan_id: `FAIL-${i}`,
    modality: "CT",
    body_part: "Head",
    triageFinding: "ICH",
    primary_condition: "Intracranial Haemorrhage (ICH)",
    confidence: 0.95 + (Math.random() * 0.04), // 0.95 - 0.99
    uncertainty: 0.85 + (Math.random() * 0.14), // 0.85 - 0.99
    vlmImpression: "Acute intracranial haemorrhage",
    expected: "FAIL",
    reason: "Overconfident + highly uncertain"
  });
}

// 3. Hallucination Cases (Wrong anatomy / Modality mismatch)
for (let i = 0; i < 20; i++) {
  writeCase('hallucination_cases', {
    scan_id: `HALLUC-${i}`,
    modality: "CT",
    body_part: "Head",
    triageFinding: "Pulmonary Embolism",
    primary_condition: "Pulmonary Embolism (PE)",
    confidence: 0.88,
    uncertainty: 0.15,
    vlmImpression: "Evidence of pulmonary embolism in the right main artery.",
    expected: "FAIL",
    reason: "Modality/Anatomy mismatch (Head CT -> PE)"
  });
}

// 4. Contradiction Cases (Triage vs VLM mismatch)
for (let i = 0; i < 20; i++) {
  writeCase('contradiction_cases', {
    scan_id: `CONTR-${i}`,
    modality: "CT",
    body_part: "Head",
    triageFinding: "Stroke",
    primary_condition: "Large Vessel Occlusion (LVO)",
    confidence: 0.92,
    uncertainty: 0.10,
    vlmImpression: "Normal study. No acute intracranial abnormality.",
    expected: "FAIL",
    reason: "Contradiction (Triage says Stroke, VLM says Normal)"
  });
}

// 5. Uncertainty Error Rate Cases (Testing the correlation between uncertainty and errors)
for (let i = 0; i < 20; i++) {
  const unc = Math.random(); // 0.0 to 1.0
  const conf = 1.0 - (unc * 0.5); // High uncertainty means lower confidence
  // We mock "expected error" probability based on uncertainty
  const errorProb = unc < 0.1 ? 0.02 : unc < 0.2 ? 0.04 : unc < 0.3 ? 0.08 : unc < 0.4 ? 0.15 : 0.25;
  const isError = Math.random() < errorProb;
  
  writeCase('uncertainty_cases', {
    scan_id: `UNC-${i}`,
    modality: "CT",
    body_part: "Chest",
    triageFinding: "Pneumonia",
    primary_condition: "Community Acquired Pneumonia",
    confidence: conf,
    uncertainty: unc,
    vlmImpression: "Consolidation suggestive of pneumonia.",
    expected_error: isError,
    expected: unc > 0.5 ? "FAIL" : "PASS"
  });
}

// 6. Deliberate attack cases (Impossible confidence, missing data)
writeCase('fail_cases', {
  scan_id: `ATTACK-1`,
  modality: "CT",
  body_part: "Head",
  triageFinding: "ICH",
  primary_condition: "Intracranial Haemorrhage (ICH)",
  confidence: 1.0, // Impossible
  uncertainty: 1.0, // Impossible
  vlmImpression: "Acute intracranial haemorrhage",
  expected: "FAIL",
  reason: "Impossible confidence and uncertainty"
});

writeCase('fail_cases', {
  scan_id: `ATTACK-2`,
  modality: "XR",
  body_part: "Chest",
  triageFinding: "Brain Haemorrhage", // Impossible on XR Chest
  primary_condition: "Intracranial Haemorrhage (ICH)",
  confidence: 0.95,
  uncertainty: 0.05,
  vlmImpression: "Brain haemorrhage visible.",
  expected: "FAIL",
  reason: "Impossible modality finding"
});

writeCase('fail_cases', {
  scan_id: `ATTACK-3`,
  modality: "",
  body_part: "",
  triageFinding: "Normal",
  primary_condition: "Normal",
  confidence: 0.99,
  uncertainty: 0.01,
  vlmImpression: "Normal scan.",
  expected: "FAIL",
  reason: "Missing metadata"
});

console.log(`Generated ${caseCounter - 1} test cases successfully.`);
