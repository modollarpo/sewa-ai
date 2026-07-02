const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'src', 'services', 'aiOrchestrator.ts');
let content = fs.readFileSync(filePath, 'utf8');

// The code we inserted incorrectly
const wrongCode = `    // ── Roadmap Feature 9: Clinical Rules Engine ───────────────────────────────
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

// First, remove the wrong insertion
content = content.replace(wrongCode, '');

// Now find the correct place: the closing } of the else block followed by logger.info
const correctMarker = `    }

    logger.info(`;

const replacement = `    }

    // ── Roadmap Feature 9: Clinical Rules Engine ───────────────────────────────
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

    logger.info(`;

content = content.replace(correctMarker, replacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully fixed aiOrchestrator.ts (v3)');
