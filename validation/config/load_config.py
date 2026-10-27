"""Shared config loader for the validation study.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
"""
from __future__ import annotations

import functools
from pathlib import Path

import yaml

CONFIG_PATH = Path(__file__).resolve().parent / "study.yaml"


@functools.lru_cache(maxsize=1)
def load_config() -> dict:
    with open(CONFIG_PATH, "r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def config() -> dict:
    return load_config()