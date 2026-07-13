const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'src', 'services', 'aiOrchestrator.ts');
let content = fs.readFileSync(filePath, 'utf8');

// The exact string we want to insert after
const marker = `    }

    logger.info(
      \`[AI Pipeline] ✓ \${scanId} | door-to-alert=\${doorToAlertMs}ms | \` +     
      \`stage1=\${stage1Ms}ms | backend=\${triage.backend ?? 'unknown'}\`
    );`;

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

    logger.info(
      \`[AI Pipeline] ✓ \${scanId} | door-to-alert=\${doorToAlertMs}ms | \` +     
      \`stage1=\${stage1Ms}ms | backend=\${triage.backend ?? 'unknown'}\`
    );`;

content = content.replace(marker, replacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated aiOrchestrator.ts');
