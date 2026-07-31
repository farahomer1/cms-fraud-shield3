"""
Generate the synthetic source-filing PDFs for the Coastal case. These are the
documents the agent surfaces as provenance behind the citations. Entirely
fictional. Output to ./docs/.
"""

import os

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs")
os.makedirs(OUT, exist_ok=True)

styles = getSampleStyleSheet()
H = ParagraphStyle("H", parent=styles["Title"], fontSize=15, spaceAfter=6)
SUB = ParagraphStyle("SUB", parent=styles["Normal"], fontSize=9,
                     textColor=colors.grey, spaceAfter=14)
BODY = ParagraphStyle("BODY", parent=styles["Normal"], fontSize=10, leading=15)
LBL = ParagraphStyle("LBL", parent=styles["Normal"], fontSize=9,
                     textColor=colors.HexColor("#555555"))
FOOT = ParagraphStyle("FOOT", parent=styles["Normal"], fontSize=7.5,
                      textColor=colors.grey, spaceBefore=18)

DISCLAIMER = ("SYNTHETIC DOCUMENT — generated for demonstration. Not a real filing; "
              "all names, identifiers, and addresses are fictitious.")


def _field_table(rows):
    t = Table(rows, colWidths=[2.2 * inch, 4.0 * inch])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#555555")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, colors.HexColor("#dddddd")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def build(filename, title, subtitle, intro, rows, note):
    doc = SimpleDocTemplate(os.path.join(OUT, filename), pagesize=letter,
                            topMargin=0.9 * inch, bottomMargin=0.9 * inch)
    story = [
        Paragraph("CENTERS FOR MEDICARE &amp; MEDICAID SERVICES", LBL),
        Paragraph(title, H),
        Paragraph(subtitle, SUB),
        Paragraph(intro, BODY),
        Spacer(1, 12),
        _field_table(rows),
        Spacer(1, 10),
        Paragraph(note, BODY),
        Paragraph(DISCLAIMER, FOOT),
    ]
    doc.build(story)


# --- DOC-0001: Ownership Disclosure (the record that unmasks Malen) ----------
build(
    "OWN-0030_ownership_disclosure.pdf",
    "Ownership Disclosure Statement",
    "Form CMS-855S · Record OWN-0030 · Filed 2026-05-28",
    "The applicant discloses the following beneficial ownership history for the "
    "enrolling supplier. All parties holding 5% or greater interest, current and "
    "prior, must be listed.",
    [
        ["Enrolling supplier", "Coastal Medical Supply LLC (ENT-COASTAL)"],
        ["Supplier type", "Durable Medical Equipment (DME)"],
        ["Prior managing owner", "Vic Malen — 75% (interest ended 2026-05-28)"],
        ["Prior owner identifier", "SSN (last 4): 6013 · DOB: 1971-03-02"],
        ["Current managing owner", "Deborah Kline — 75% (interest began 2026-05-28)"],
        ["Registered agent", "Sentinel Agents LLC"],
        ["Business address", "4471 Peachtree Industrial Blvd Ste 214, Duluth GA"],
    ],
    "Note: controlling interest transferred from the prior owner to the current "
    "owner on the date of formation. Prior-owner identifiers are retained in this "
    "disclosure as required.",
)

# --- DOC-0002: Ownership Transfer -------------------------------------------
build(
    "OWN-0031_ownership_transfer.pdf",
    "Statement of Ownership Transfer",
    "Record OWN-0031 · Filed 2026-05-28",
    "This statement records the transfer of controlling interest in the enrolling "
    "supplier to the incoming owner.",
    [
        ["Supplier", "Coastal Medical Supply LLC (ENT-COASTAL)"],
        ["Transferring party", "Vic Malen"],
        ["Receiving party", "Deborah Kline"],
        ["Interest transferred", "75% managing interest"],
        ["Effective date", "2026-05-28"],
        ["Days before application", "41"],
    ],
    "The receiving party is recorded as the sole managing owner on the enrollment "
    "application filed 2026-07-08.",
)

# --- DOC-0003: Harbor Articles of Organization ------------------------------
build(
    "ENT-HARBOR_articles.pdf",
    "Articles of Organization",
    "Harbor Health Devices LLC (ENT-HARBOR) · Filed 2021-02-11",
    "Formation record for the referenced limited liability company, since revoked "
    "from the Medicare program.",
    [
        ["Legal name", "Harbor Health Devices LLC"],
        ["Managing member", "Victor A. Malen"],
        ["Member identifier", "SSN (last 4): 6013 · DOB: 1971-03-02"],
        ["Registered agent", "Sentinel Agents LLC"],
        ["Principal address", "4471 Peachtree Industrial Blvd Ste 200, Duluth GA"],
        ["Program status", "REVOKED (2024-01-30)"],
    ],
    "This entity was revoked from Medicare on 2024-01-30. The managing member is "
    "listed on the OIG List of Excluded Individuals/Entities (LEIE).",
)

print("Generated PDFs:")
for f in sorted(os.listdir(OUT)):
    print(f"  docs/{f}  ({os.path.getsize(os.path.join(OUT, f))} bytes)")
