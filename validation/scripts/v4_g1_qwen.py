"""v4 Step 3 (G1): real text-LLM generator via llama.cpp (Qwen2.5-1.5B-Instruct, Apache-2.0).

FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE.
Generated reports are SYNTHETIC text, not clinical documents.

Text-only generator (NOT a vision-language model): a stated deviation from the filed
image-conditioned design. For each selected scan we generate `reports_per_scan` impressions
from the structured triage output and record whether the report's haemorrhage polarity
CONTRADICTS the triage decision (prob >= 0.5). This measures generator-introduced
contradictions, using the same NEG semantics as G0 (v4_lib). No accuracy claims.

Model / runtime (verified on download):
  Qwen/Qwen2.5-1.5B-Instruct-GGUF  qwen2.5-1.5b-instruct-q4_k_m.gguf  licence Apache-2.0
  llama.cpp official win-cpu-x64 release build b11583               licence MIT
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import subprocess
import sys
import time
from pathlib import Path

import numpy as np

from validation.scripts.v4_step2_negation import extract

MARK = "FEASIBILITY ON PUBLIC DATA. NOT CLINICAL EVIDENCE. SYNTHETIC TEXT."
REPORTS = Path(os.environ.get("SEWA_REPORT_DIR", "validation/reports"))
LLM_DIR = Path("validation/data_cache/llm")
GGUF = Path(os.environ.get("SEWA_G1_GGUF", LLM_DIR / "qwen2.5-1.5b-instruct-q4_k_m.gguf"))
LLAMA = Path(os.environ.get("SEWA_G1_LLAMA", LLM_DIR / "llama-b11583" / "llama-cli.exe"))

G1_SYSTEM = (
    "You are a radiology report generator for a research prototype. Given a structured "
    "triage output, write ONE short impression sentence about intracranial haemorrhage "
    "only. Do not invent other findings. Do not address the patient. Maximum 40 words."
)
G1_USER = "Triage: haemorrhage probability {prob:.2f}; urgency {urgency}; attribution {attr}."
REPORTS_PER_SCAN = 3
MAX_NEW_TOKENS = 120
TEMPERATURE = 0.7
TOP_P = 0.9


def triage_urgency(prob: float) -> str:
    if prob >= 0.9:
        return "emergent"
    if prob >= 0.5:
        return "urgent"
    return "routine"


def stable_seed(study: str, k: int) -> int:
    h = hashlib.sha256(f"{study}|{k}".encode()).hexdigest()
    return int(h[:8], 16)


def parse_output(stdout: str) -> str:
    """llama-cli (single-turn chat) prints a banner, echoes the prompt on a '> ' line,
    then the assistant reply, then a '[ Prompt: ... ]' timing line."""
    lines = stdout.splitlines()
    idx = [j for j, l in enumerate(lines) if l.lstrip().startswith("> ")]
    rest = lines[idx[-1] + 1:] if idx else lines
    out = []
    for ln in rest:
        s = ln.strip()
        if not s:
            continue
        if (s.startswith("[") and "Prompt:" in s) or s.lower().startswith("exiting"):
            break
        out.append(s)
    return " ".join(out).strip()


def is_contradiction(polarity: str | None, decision_present: bool) -> bool:
    """Report contradicts the triage decision when it asserts the opposite polarity."""
    return (polarity == "present" and not decision_present) or (
        polarity == "absent" and decision_present)


def generate(user_text: str, seed: int, n_ctx: int = 2048, timeout: int = 300) -> dict:
    cmd = [str(LLAMA), "-m", str(GGUF), "-sys", G1_SYSTEM, "-p", user_text,
           "-n", str(MAX_NEW_TOKENS), "--temp", str(TEMPERATURE), "--top-p", str(TOP_P),
           "--seed", str(seed), "-c", str(n_ctx), "-st", "--no-display-prompt",
           "--simple-io", "--log-disable", "--no-warmup"]
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except Exception as e:  # noqa: BLE001
        return {"text": "", "error": str(e)}
    text = parse_output(p.stdout)
    if not text and p.returncode != 0:
        return {"text": "", "error": f"rc={p.returncode}: {p.stderr.strip()[-300:]}"}
    return {"text": text}



def select_subset(studies: np.ndarray, prob: np.ndarray, n_scans: int, seed: int) -> list[int]:
    """Deterministic stratified subset: half decided-present, half decided-absent."""
    present = [i for i in range(len(studies)) if prob[i] >= 0.5]
    absent = [i for i in range(len(studies)) if prob[i] < 0.5]
    rng = random.Random(seed)
    rng.shuffle(present)
    rng.shuffle(absent)
    k = max(1, n_scans // 2)
    idx = present[:k] + absent[:k]
    if len(idx) < n_scans:
        rest = [i for i in range(len(studies)) if i not in set(idx)]
        rng.shuffle(rest)
        idx += rest[: n_scans - len(idx)]
    return sorted(idx)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--npz", default=str(REPORTS / "v4_signals_test.npz"))
    ap.add_argument("--split", default="test")
    ap.add_argument("--scans", type=int, default=50)
    ap.add_argument("--seed", type=int, default=44)
    ap.add_argument("--limit", type=int, default=0, help="debug: cap generations")
    args = ap.parse_args(argv)

    if not GGUF.exists() or not LLAMA.exists():
        print(f"missing model/runtime: gguf={GGUF.exists()} llama={LLAMA.exists()}", flush=True)
        return 2

    d = np.load(args.npz, allow_pickle=True)
    studies = d["studies"]
    prob = d["clean|prob"]
    idx = select_subset(studies, prob, args.scans, args.seed)
    print(f"{MARK}\nG1 subset: {len(idx)} scans x {REPORTS_PER_SCAN} = "
          f"{len(idx) * REPORTS_PER_SCAN} generations", flush=True)

    recs: list[dict] = []
    t0 = time.time()
    done = 0
    for i in idx:
        study, p = str(studies[i]), float(prob[i])
        decision = p >= 0.5
        urgency = triage_urgency(p)
        user = G1_USER.format(prob=p, urgency=urgency, attr="top-slice")
        for k in range(REPORTS_PER_SCAN):
            if args.limit and done >= args.limit:
                break
            r = generate(user, stable_seed(study, k))
            pol = extract(r["text"])["polarity"] if r["text"] else None
            contradiction = is_contradiction(pol, decision)
            recs.append({"study": study, "index": int(i), "prob": round(p, 4),
                         "decision_present": decision, "urgency": urgency, "k": k,
                         "seed": stable_seed(study, k), "text": r["text"],
                         "polarity": pol, "contradiction": bool(contradiction),
                         "error": r.get("error")})
            done += 1
            if done % 10 == 0:
                el = time.time() - t0
                print(f"  {done} gens, {el / done:.1f}s/gen", flush=True)
        if args.limit and done >= args.limit:
            break

    ok = [r for r in recs if r["text"]]
    contra = [r for r in ok if r["contradiction"]]
    pol_counts: dict[str, int] = {}
    for r in ok:
        pol_counts[str(r["polarity"])] = pol_counts.get(str(r["polarity"]), 0) + 1
    out = {
        "marking": MARK,
        "generator": "G1", "model": "Qwen2.5-1.5B-Instruct", "format": "GGUF q4_k_m",
        "licence": "Apache-2.0", "runtime": "llama.cpp b11583 win-cpu-x64 (MIT)",
        "temperature": TEMPERATURE, "top_p": TOP_P, "max_new_tokens": MAX_NEW_TOKENS,
        "reports_per_scan": REPORTS_PER_SCAN, "split": args.split,
        "n_scans": len(idx), "n_generations": len(recs), "n_parsed": len(ok),
        "contradiction_rate": (len(contra) / len(ok)) if ok else None,
        "polarity_counts": pol_counts,
        "note": "text-only generator; measures generator-introduced contradictions only; "
                "no clinical accuracy claim",
        "records": recs,
    }
    (REPORTS / "v4_g1_qwen.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"\ncontradiction_rate={out['contradiction_rate']} over {len(ok)} parsed "
          f"({len(recs)} generated); polarity={pol_counts}", flush=True)
    print("wrote", REPORTS / "v4_g1_qwen.json", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
