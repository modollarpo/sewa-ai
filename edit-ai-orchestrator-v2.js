const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'src', 'services', 'aiOrchestrator.ts');
let content = fs.readFileSync(filePath, 'utf8');

// The code to insert
const newCode = `    // ── Roadmap Feature 9: Clinical Rules Engine ───────────────────────────────
    try {
      await clinicalRulesEngine.evaluate(tenantId, scanId, {
        primaryFinding: triage.primaryFinding,
        urgency: triage.urgency === 'ROUTINE' ? 'NORMAL' : triage.urgency,
        confidence: triage.confidence,
        modality: scan.modality,
        bodyPart: scan.bodyPart,
        uncertaintyScore: uncertainty.compositeScore,
      });
      logger.info(\`[Clinical Rules] Evaluated for scan \${scanId}\`);
    } catch (err) {
      logger.warn(\`[Clinical Rules] Failed to evaluate for scan \${scanId}\`, err);
    }

    // ── Roadmap Feature 13: Stroke Code Activation ──────────────────────────────
    try {
      const strokeFinding = triage.primaryFinding.toLowerCase();
      let codeType: StrokeCodeType | null = null;
      
      if (strokeFinding.includes('lvo') || strokeFinding.includes('large vessel occlusion')) {
        codeType = 'LVO';
      } else if (strokeFinding.includes('ich') || strokeFinding.includes('intracerebral hemorrhage')) {
        codeType = 'ICH';
      } else if (strokeFinding.includes('sah') || strokeFinding.includes('subarachnoid hemorrhage')) {
        codeType = 'SAH';
      } else if (strokeFinding.includes('ais') || strokeFinding.includes('acute ischemic stroke')) {
        codeType = 'AIS';
      } else if (strokeFinding.includes('cvst') || strokeFinding.includes('cerebral venous sinus thrombosis')) {
        codeType = 'CVST';
      }

      if (codeType && (triage.urgency === 'CRITICAL' || triage.urgency === 'URGENT')) {
        await strokeCodeService.activate({
          scanId,
          patientId: scan.patientId,
          tenantId,
          codeType,
          aiConfidence: triage.confidence,
          finding: triage.primaryFinding,
          location: (triage as any).location,
          gradcamUrl: triage.gradCamUrl,
        });
      }
    } catch (err) {
      logger.warn(\`[Stroke Code] Failed to activate for scan \${scanId}\`, err);
    }

`;

// Find the index of "logger.info(`[AI Pipeline]"
const searchStr = 'logger.info(`[AI Pipeline]';
const idx = content.indexOf(searchStr);

// Find the start of the line containing that searchStr
let lineStartIdx = idx;
while (lineStartIdx > 0 && content[lineStartIdx - 1] !== '\n') {
  lineStartIdx--;
}

// Now insert newCode at lineStartIdx
content = content.slice(0, lineStartIdx) + newCode + content.slice(lineStartIdx);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated aiOrchestrator.ts (v2)');
