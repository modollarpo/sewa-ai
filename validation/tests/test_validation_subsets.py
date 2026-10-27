"""
SEWA AI — Validation Subsets Smoke & Integrity Tests
FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.

Tests that all downloaded minimal data subsets load cleanly, have expected
columns, match target schemas, and are ready for validation pipelines.
"""

import os
import ast
import pandas as pd
import pytest
from PIL import Image

SUBSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "data_subsets")


def test_bhx_bounding_boxes_loaded():
    """Verify BHX manual annotations CSV for CQ500 scans."""
    bhx_manual = os.path.join(SUBSETS_DIR, "1_Initial_Manual_Labeling.csv")
    assert os.path.exists(bhx_manual), f"Missing {bhx_manual}"

    df = pd.read_csv(bhx_manual)
    required_cols = {"SOPInstanceUID", "SeriesInstanceUID", "StudyInstanceUID", "data", "labelName"}
    assert required_cols.issubset(df.columns)
    assert len(df) > 5000, f"Expected >5000 annotations, got {len(df)}"

    # Check bounding box structure in first row
    first_bbox = ast.literal_eval(df["data"].iloc[0])
    assert "x" in first_bbox and "y" in first_bbox
    assert "width" in first_bbox and "height" in first_bbox
    assert first_bbox["width"] > 0 and first_bbox["height"] > 0


def test_openi_reports_loaded():
    """Verify OpenI Indiana University clinical radiology reports."""
    openi_csv = os.path.join(SUBSETS_DIR, "cleaned_dataset.csv")
    assert os.path.exists(openi_csv), f"Missing {openi_csv}"

    df = pd.read_csv(openi_csv)
    required_cols = {"image_id", "projection", "org_caption"}
    assert required_cols.issubset(df.columns)
    assert len(df) > 5000, f"Expected >5000 reports, got {len(df)}"
    assert df["org_caption"].str.len().mean() > 20


def test_retinal_samples_integrity():
    """Verify Retinal clinical sample images load properly."""
    retinal_dir = os.path.join(SUBSETS_DIR, "retinal_samples")
    assert os.path.exists(retinal_dir), f"Missing {retinal_dir}"

    images = [f for f in os.listdir(retinal_dir) if f.endswith((".jpeg", ".jpg", ".png"))]
    assert len(images) >= 4, f"Expected >=4 retinal images, got {len(images)}"

    for img_name in images:
        img_path = os.path.join(retinal_dir, img_name)
        with Image.open(img_path) as im:
            w, h = im.size
            assert w > 100 and h > 100
            assert im.mode in ("RGB", "L")


def test_mammography_samples_integrity():
    """Verify Mammography sample images and clinical metadata load properly."""
    mammo_dir = os.path.join(SUBSETS_DIR, "mammography_samples")
    assert os.path.exists(mammo_dir), f"Missing {mammo_dir}"

    csv_path = os.path.join(mammo_dir, "calc_case(with_jpg_img).csv")
    assert os.path.exists(csv_path), f"Missing {csv_path}"

    df = pd.read_csv(csv_path)
    assert "pathology" in df.columns or "calc type" in df.columns or len(df.columns) > 5

    images = [f for f in os.listdir(mammo_dir) if f.endswith((".jpg", ".png"))]
    assert len(images) >= 1, "Expected at least 1 full mammogram sample"
    for img_name in images:
        with Image.open(os.path.join(mammo_dir, img_name)) as im:
            assert im.size[0] > 100 and im.size[1] > 100
