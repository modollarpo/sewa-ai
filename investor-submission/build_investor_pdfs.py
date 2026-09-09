#!/usr/bin/env python3
import sys
import os

# Add docs/build to path or import gen_pdf functions
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'docs', 'build')))
import gen_pdf

docs_to_build = [
    ("01_SEWA_AI_Investor_Deck.md", "02_SEWA_AI_Investor_Deck.pdf", "SEWA AI Investor Pitch Deck", "SEWA-DECK-2026"),
    ("05_SEWA_AI_Investor_Data_Room_Index.md", "05_SEWA_AI_Investor_Data_Room_Index.pdf", "SEWA AI Investor Data Room Index", "SEWA-DATAROOM-2026"),
    ("06_SEWA_AI_Investment_Summary.md", "06_SEWA_AI_Investment_Summary.pdf", "SEWA AI Executive Investment Summary", "SEWA-SUMMARY-2026"),
    ("07_SEWA_AI_Founder_Advisor_Profile.md", "07_SEWA_AI_Founder_Advisor_Profile.pdf", "SEWA AI Founder & Advisor Profile", "SEWA-TEAM-2026"),
    ("08_SEWA_AI_Funding_Strategy.md", "08_SEWA_AI_Funding_Strategy.pdf", "SEWA AI Staged Funding Strategy", "SEWA-FUNDING-2026"),
]

os.chdir(os.path.dirname(__file__))

for md, pdf, title, did in docs_to_build:
    if os.path.exists(md):
        gen_pdf.build(md, pdf, title, did)
    else:
        print(f"WARNING: {md} not found.")

print("All investor PDFs built successfully.")
