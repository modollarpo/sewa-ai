# ADR 002: Four-Engine AI Orchestration Pipeline

## Status
Accepted

## Context
Clinical diagnostic AI requires multiple specialized models: triage, uncertainty quantification, report generation, and hallucination detection.

## Decision
Implement a four-engine pipeline:
1. **Triage Engine**: EfficientNet-B4 for condition detection
2. **Uncertainty Engine**: MC Dropout for epistemic/aleatoric uncertainty
3. **VLM Report Engine**: BiomedCLIP + Llama 3 LoRA for natural language reports
4. **Metacognition Engine**: 9-layer safety check for hallucination detection

## Consequences
- High diagnostic accuracy
- Safety-first approach
- Modular, independently scalable components
- Higher infrastructure cost (GPU nodes)
