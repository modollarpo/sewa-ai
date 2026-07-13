#!/usr/bin/env python3
"""
SEWA XAI — Sample Test Data Generator
Generates anonymised synthetic DICOM-like test data for AI pipeline validation.
No PHI. Safe for CI/CD, developer environments, and pilot demonstrations.
© 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
"""

import os
import json
import numpy as np
import time
from pathlib import Path
from typing import Optional

# ── Check optional DICOM library ─────────────────────────────────────────
try:
    import pydicom
    from pydicom.dataset import Dataset, FileDataset
    from pydicom.sequence import Sequence
    PYDICOM_AVAILABLE = True
except ImportError:
    PYDICOM_AVAILABLE = False
    print("[WARN] pydicom not installed — generating JSON mock data only")
    print("       Install: pip install pydicom")

OUTPUT_DIR = Path(__file__).parent / "test_dicoms"
OUTPUT_DIR.mkdir(exist_ok=True)

# ── Test case definitions ─────────────────────────────────────────────────
TEST_CASES = [
    {
        "id": "TEST-ICH-001",
        "description": "CT Head — Intracranial Haemorrhage (High Confidence)",
        "modality": "CT",
        "body_part": "HEAD",
        "expected_finding": "ICH",
        "expected_urgency": "CRITICAL",
        "expected_confidence_min": 0.85,
        "patient_age": 72,
        "patient_sex": "M",
        "clinical_notes": "Synthetic: hyperdense right basal ganglia region pattern",
    },
    {
        "id": "TEST-PE-001",
        "description": "CT Chest — Pulmonary Embolism (Saddle PE pattern)",
        "modality": "CT",
        "body_part": "CHEST",
        "expected_finding": "Pulmonary Embolism",
        "expected_urgency": "CRITICAL",
        "expected_confidence_min": 0.80,
        "patient_age": 58,
        "patient_sex": "F",
        "clinical_notes": "Synthetic: filling defect pattern in main pulmonary artery",
    },
    {
        "id": "TEST-TB-001",
        "description": "CXR — Tuberculosis (Active TB Pattern)",
        "modality": "CR",
        "body_part": "CHEST",
        "expected_finding": "TB",
        "expected_urgency": "URGENT",
        "expected_confidence_min": 0.75,
        "patient_age": 34,
        "patient_sex": "M",
        "clinical_notes": "Synthetic: upper lobe infiltrate with cavitation pattern",
    },
    {
        "id": "TEST-PNEU-001",
        "description": "CXR — Pneumothorax (Tension)",
        "modality": "CR",
        "body_part": "CHEST",
        "expected_finding": "Pneumothorax",
        "expected_urgency": "CRITICAL",
        "expected_confidence_min": 0.88,
        "patient_age": 25,
        "patient_sex": "M",
        "clinical_notes": "Synthetic: left-sided pleural air with mediastinal shift pattern",
    },
    {
        "id": "TEST-NORMAL-001",
        "description": "CT Head — Normal Study",
        "modality": "CT",
        "body_part": "HEAD",
        "expected_finding": "Normal",
        "expected_urgency": "NORMAL",
        "expected_confidence_min": 0.70,
        "patient_age": 45,
        "patient_sex": "F",
        "clinical_notes": "Synthetic: no acute intracranial pathology pattern",
    },
    {
        "id": "TEST-UNCERTAIN-001",
        "description": "CT Head — Low Confidence Case (Tests Uncertainty Engine)",
        "modality": "CT",
        "body_part": "HEAD",
        "expected_finding": "ICH",
        "expected_urgency": "URGENT",
        "expected_confidence_min": 0.40,
        "expected_uncertainty_min": 0.25,
        "patient_age": 65,
        "patient_sex": "F",
        "clinical_notes": "Synthetic: borderline density pattern — should trigger uncertainty escalation",
        "test_uncertainty_gate": True,
    },
    {
        "id": "TEST-META-001",
        "description": "Metacognition Test — Impossible Finding (TB on CT Head)",
        "modality": "CT",
        "body_part": "HEAD",
        "expected_finding": "TB",
        "expected_urgency": "CRITICAL",
        "expected_metacognition": "REJECT",  # Should be rejected by Layer 1
        "patient_age": 50,
        "patient_sex": "M",
        "clinical_notes": "Synthetic: designed to test metacognition modality-finding plausibility gate",
        "test_metacognition_layer1": True,
    },
    {
        "id": "TEST-STROKE-001",
        "description": "MRI Brain DWI — Acute Ischaemic Stroke (Tests Stroke Code)",
        "modality": "MR",
        "body_part": "BRAIN",
        "expected_finding": "Ischemic Stroke",
        "expected_urgency": "CRITICAL",
        "expected_confidence_min": 0.82,
        "patient_age": 68,
        "patient_sex": "M",
        "clinical_notes": "Synthetic: restricted diffusion left MCA territory pattern",
        "test_stroke_code": True,
    },
]


def generate_synthetic_ct_head(case_id: str, hu_pattern: str = "ich") -> np.ndarray:
    """Generate synthetic 512x512 CT head pixel array."""
    arr = np.random.randint(0, 50, (512, 512), dtype=np.int16)  # Background noise
    
    # Brain parenchyma region (ellipse)
    cx, cy = 256, 256
    for y in range(512):
        for x in range(512):
            if ((x - cx) / 180) ** 2 + ((y - cy) / 200) ** 2 <= 1:
                arr[y, x] = np.random.randint(35, 45)  # Normal brain HU ~35-45
    
    if hu_pattern == "ich":
        # Right basal ganglia hyperdensity (ICH ~60-80 HU)
        for y in range(240, 290):
            for x in range(270, 320):
                if ((x - 295) / 25) ** 2 + ((y - 265) / 25) ** 2 <= 1:
                    arr[y, x] = np.random.randint(60, 80)
    elif hu_pattern == "normal":
        pass  # Already done
    
    return arr


def generate_synthetic_cxr(case_id: str, pattern: str = "normal") -> np.ndarray:
    """Generate synthetic 1024x1024 chest X-ray pixel array."""
    arr = np.full((1024, 1024), 200, dtype=np.uint16)
    
    # Lung fields
    for side_x in [300, 700]:
        for y in range(200, 900):
            for x in range(side_x - 200, side_x + 200):
                if 0 <= x < 1024:
                    arr[y, x] = np.random.randint(50, 100)
    
    if pattern == "pneumothorax":
        # Left pleural air (very dark)
        arr[200:900, 0:150] = np.random.randint(10, 30, (700, 150))
    elif pattern == "tb":
        # Upper lobe infiltrate (dense, white-ish)
        arr[200:400, 150:500] = np.random.randint(180, 220, (200, 350))
    
    return arr


def generate_mock_json(case: dict) -> dict:
    """Generate mock JSON test data when pydicom not available."""
    return {
        "case_id": case["id"],
        "description": case["description"],
        "metadata": {
            "modality": case["modality"],
            "body_part": case["body_part"],
            "patient_age": case["patient_age"],
            "patient_sex": case["patient_sex"],
            "study_uid": f"1.2.840.10008.5.1.4.1.1.{case['id']}",
            "series_uid": f"1.2.840.10008.5.1.4.1.1.{case['id']}.1",
            "instance_uid": f"1.2.840.10008.5.1.4.1.1.{case['id']}.1.1",
        },
        "expected": {
            "finding": case["expected_finding"],
            "urgency": case["expected_urgency"],
            "confidence_min": case.get("expected_confidence_min", 0.5),
            "metacognition": case.get("expected_metacognition", "PASS"),
            "uncertainty_min": case.get("expected_uncertainty_min", None),
        },
        "test_flags": {
            "test_stroke_code": case.get("test_stroke_code", False),
            "test_metacognition_layer1": case.get("test_metacognition_layer1", False),
            "test_uncertainty_gate": case.get("test_uncertainty_gate", False),
        },
        "clinical_notes": case["clinical_notes"],
        "pixel_data_summary": "Synthetic — no PHI",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


def create_dicom_dataset(case: dict) -> Optional["FileDataset"]:
    """Create a minimal valid DICOM dataset."""
    if not PYDICOM_AVAILABLE:
        return None
    
    ds = Dataset()
    ds.file_meta = Dataset()
    ds.file_meta.MediaStorageSOPClassUID = '1.2.840.10008.5.1.4.1.1.2'  # CT Image Storage
    ds.file_meta.MediaStorageSOPInstanceUID = f'1.2.3.4.5.{int(time.time())}'
    ds.file_meta.TransferSyntaxUID = '1.2.840.10008.1.2.1'  # Explicit VR Little Endian
    ds.is_implicit_VR = False
    ds.is_little_endian = True
    
    # Patient info (synthetic — no PHI)
    ds.PatientName = f"TEST^PATIENT^{case['id']}"
    ds.PatientID = case['id']
    ds.PatientBirthDate = f"{2026 - case['patient_age']}0101"
    ds.PatientSex = case['patient_sex']
    
    # Study info
    ds.StudyInstanceUID = f'1.2.840.10008.5.1.4.1.1.{int(time.time())}'
    ds.SeriesInstanceUID = f'1.2.840.10008.5.1.4.1.1.{int(time.time())}.1'
    ds.SOPInstanceUID = f'1.2.840.10008.5.1.4.1.1.{int(time.time())}.1.1'
    ds.SOPClassUID = '1.2.840.10008.5.1.4.1.1.2'
    ds.StudyDate = time.strftime("%Y%m%d")
    ds.StudyTime = time.strftime("%H%M%S")
    ds.Modality = case['modality']
    ds.BodyPartExamined = case['body_part']
    ds.StudyDescription = f"SEWA XAI TEST: {case['description']}"
    ds.InstitutionName = "SEWA XAI Test Institution"
    
    # Image info
    ds.Rows = 512
    ds.Columns = 512
    ds.BitsAllocated = 16
    ds.BitsStored = 16
    ds.HighBit = 15
    ds.PixelRepresentation = 1  # Signed
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.PixelSpacing = [0.5, 0.5]
    ds.SliceThickness = 5.0
    
    # CT-specific
    if case['modality'] == 'CT':
        ds.RescaleIntercept = -1024.0
        ds.RescaleSlope = 1.0
        ds.WindowCenter = 40
        ds.WindowWidth = 80
        
        # Generate appropriate pixel pattern
        if case['expected_finding'] == 'ICH':
            pixels = generate_synthetic_ct_head(case['id'], 'ich')
        else:
            pixels = generate_synthetic_ct_head(case['id'], 'normal')
    else:
        pixels = generate_synthetic_cxr(case['id'])
        ds.Rows = 1024
        ds.Columns = 1024
    
    ds.PixelData = pixels.astype(np.int16).tobytes()
    
    return ds


def run():
    print("=" * 60)
    print("SEWA XAI — Sample Test Data Generator")
    print("Generating anonymised synthetic test data...")
    print("=" * 60)
    
    manifest = {"generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"), "cases": []}
    
    for case in TEST_CASES:
        print(f"\n[{case['id']}] {case['description']}")
        
        # Always generate JSON manifest
        mock = generate_mock_json(case)
        json_path = OUTPUT_DIR / f"{case['id']}.json"
        with open(json_path, "w") as f:
            json.dump(mock, f, indent=2)
        print(f"  ✅ JSON manifest: {json_path.name}")
        
        # Generate DICOM if pydicom available
        if PYDICOM_AVAILABLE:
            try:
                ds = create_dicom_dataset(case)
                if ds:
                    dcm_path = OUTPUT_DIR / f"{case['id']}.dcm"
                    pydicom.dcmwrite(str(dcm_path), ds)
                    print(f"  ✅ DICOM file: {dcm_path.name} ({dcm_path.stat().st_size // 1024}KB)")
            except Exception as e:
                print(f"  ⚠️  DICOM generation failed: {e}")
        
        manifest["cases"].append({
            "id": case["id"],
            "description": case["description"],
            "modality": case["modality"],
            "body_part": case["body_part"],
            "expected": mock["expected"],
            "test_flags": mock["test_flags"],
            "json_path": f"{case['id']}.json",
            "dicom_path": f"{case['id']}.dcm" if PYDICOM_AVAILABLE else None,
        })
    
    # Write manifest
    manifest_path = OUTPUT_DIR / "MANIFEST.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    
    print("\n" + "=" * 60)
    print(f"✅ Generated {len(TEST_CASES)} test cases")
    print(f"   Output: {OUTPUT_DIR}/")
    print(f"   Manifest: {manifest_path.name}")
    print("\nTest cases include:")
    print("  • High-confidence ICH (tests triage)")
    print("  • Pulmonary embolism (tests PE detection)")
    print("  • Tuberculosis CXR (tests Africa use case)")
    print("  • Pneumothorax (tests CRITICAL alert)")
    print("  • Normal study (tests specificity)")
    print("  • Low-confidence case (tests uncertainty escalation)")
    print("  • Metacognition rejection test (TB on CT head)")
    print("  • Stroke code activation test (MRI DWI)")
    print("\n© 2026 SEWA XAI — a Storegrill Inc Ltd company.")
    print("All test data is synthetic — no PHI.")


if __name__ == "__main__":
    run()
