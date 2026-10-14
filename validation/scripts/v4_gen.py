"""v4 Step 3: report generators.

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
Generated reports are SYNTHETIC text, not clinical documents.

G0: deterministic template generator over the structured triage output, with a
    controlled contradiction-injection rate. Mechanism test only ("synthetic
    injection, not model behaviour").
G1: small permissive CPU text LLM (Qwen2.5-1.5B-Instruct, Apache-2.0) via an official
    llama.cpp CPU binary (MIT). NOT a vision-language model: a stated deviation from
    the filed design. Fixed prompt, <=120 new tokens, slight temperature.
G2: skipped (no permissive VLM feasible on this CPU in budget) - recorded deviation.
"""
from __future__ import annotations

import json
import random
import subprocess

from validation.scripts.v4_step2_negation import extract

MARK = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE. SYNTHETIC TEXT."

G0_PRESENT = ["There is an acute intracranial hemorrhage.", "Acute intraparenchymal hemorrhage is present."]
G0_ABSENT = ["No acute intracranial hemorrhage.", "No evidence of acute hemorrhage."]
G0_HEDGE = ["Possible acute hemorrhage; cannot be excluded.",
            "Findings may represent an acute hemorrhage."]
URGENT_PHRASE = {
    "emergent": "Findings are emergent.",
    "urgent": "Urgent clinical review is recommended.",
    "routine": "No finding requiring urgent review.",
}

G1_SYSTEM = (
    "You are a radiology report generator for a research prototype. Given a structured "
    "triage output, write ONE short impression sentence about intracranial haemorrhage "
    "only. Do not invent other findings. Do not address the patient. Maximum 40 words."
)

MANIFEST = {
    "marking": MARK,
    "generators": {
        "G0": {
            "type": "template", "licence": "own code", "temperature": "n/a",
            "contradiction_rate": 0.10,
            "note": "synthetic injection, not model behaviour",
        },
        "G1": {
            "type": "text-LLM", "model": "Qwen2.5-1.5B-Instruct", "format": "GGUF q4_k_m",
            "licence": "Apache-2.0", "runtime": "llama.cpp win-cpu-x64 release (MIT), build b11583",
            "max_new_tokens": 120, "temperature": 0.7, "top_p": 0.9, "reports_per_scan": 3,
            "invocation": "llama-cli -m <gguf> -sys <system> -p <triage> -n 120 --temp 0.7 "
                          "--top-p 0.9 --seed <seed> -c 2048 -st --log-disable --no-warmup",
            "note": "text-only; not a vision-language model; deviation from filed design",
        },
        "G2": {"type": "VLM", "status": "skipped", "note": "no permissive VLM feasible on CPU in budget"},
    },
    "G1_artifacts": {
        "model_source": "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF",
        "file": "qwen2.5-1.5b-instruct-q4_k_m.gguf",
        "size_bytes": 1117320736,
        "sha256": "6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e",
        "sha256_source": "HF LFS pointer / X-Linked-ETag (verified match after download)",
        "runtime_url": "https://github.com/ggml-org/llama.cpp/releases/download/b11583/llama-b11583-bin-win-cpu-x64.zip",
        "licences": {"model": "Apache-2.0", "llama.cpp": "MIT"},
        "note": "research/nonclinical; local only, not pushed",
    },
    "prompt_G1_system": G1_SYSTEM,
    "prompt_G1_user": "Triage: haemorrhage probability {prob:.2f}; urgency {urgency}; attribution {attr}.",
}


def triage_urgency(prob: float) -> str:
    if prob >= 0.9:
        return "emergent"
    if prob >= 0.5:
        return "urgent"
    return "routine"


def g0_report(prob: float, urgency: str, attr: str, rng: random.Random) -> dict:
    """Faithful template report; inject a contradiction with p=0.10."""
    faithful_present = prob >= 0.5
    injected = "none"
    if rng.random() < 0.10:
        injected = rng.choice(["flip", "hedge"])
        if injected == "flip":
            body = rng.choice(G0_ABSENT if faithful_present else G0_PRESENT)
        else:
            body = rng.choice(G0_HEDGE)
    else:
        body = rng.choice(G0_PRESENT if faithful_present else G0_ABSENT)
    text = f"{body} {URGENT_PHRASE[urgency]}"
    return {"text": text, "generator": "G0", "injected": injected,
            "faithful_present": faithful_present, "extracted": extract(text)["polarity"]}


def g1_prompt(prob: float, urgency: str, attr: str) -> str:
    user = MANIFEST["prompt_G1_user"].format(prob=prob, urgency=urgency, attr=attr)
    return f"{G1_SYSTEM}\n\n{user}\n\nImpression:"


def g1_report(llama_cli: str, gguf: str, prob: float, urgency: str, attr: str,
              seed: int, n_ctx: int = 2048) -> dict:
    """Run one G1 report via the official llama.cpp CLI. Returns text + extracted polarity."""
    prompt = g1_prompt(prob, urgency, attr)
    cmd = [llama_cli, "-m", gguf, "-p", prompt, "-n", "120", "--temp", "0.7",
           "--top-p", "0.9", "--seed", str(seed), "-c", str(n_ctx),
           "-no-cnv", "--log-disable", "--no-warmup"]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=300).stdout
    except Exception as e:  # noqa: BLE001
        return {"text": "", "generator": "G1", "error": str(e), "extracted": None}
    text = out.strip().split("\n")[-1].strip()
    return {"text": text, "generator": "G1", "seed": seed, "extracted": extract(text)["polarity"]}


if __name__ == "__main__":
    rng = random.Random(7)
    print("=== G0 smoke test (synthetic injection) ===")
    for p in (0.95, 0.6, 0.2, 0.8, 0.3):
        r = g0_report(p, triage_urgency(p), "top-slice", rng)
        print(f"prob={p:.2f} urg={triage_urgency(p):8s} inj={r['injected']:5s} "
              f"extracted={r['extracted']:9s} | {r['text']}")
    with open("validation/scripts/v4_generator_manifest.json", "w", encoding="utf-8") as fh:
        json.dump(MANIFEST, fh, indent=2)
    print("\nwrote validation/scripts/v4_generator_manifest.json")
