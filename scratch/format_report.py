import os
import shutil
import zipfile
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

SRC = r'C:\Users\Srinithy\OneDrive\Desktop\minetrack_backup.docx'
OUT_DOCX = r'C:\Users\Srinithy\OneDrive\Desktop\MineTrack_Project_Report_Formatted.docx'

print("Loading document...")
doc = docx.Document(SRC)

# Inspect sections
print(f"Current sections count: {len(doc.sections)}")

def add_page_number_to_footer(footer, is_roman=False):
    # Clear existing paragraphs in footer
    p = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
    p.text = ""
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    # Format paragraph
    pPr = p._p.get_or_add_pPr()
    # Add page field
    run = p.add_run()
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    fldSimple = parse_xml(r'<w:fldSimple %s w:instr="PAGE"/>' % nsdecls('w'))
    run._r.append(fldSimple)

# Let's locate the paragraphs
p_abstract = None
p_ack = None
p_toc_header = None
p_lof = None
p_ch1 = None

for i, p in enumerate(doc.paragraphs):
    txt = p.text.strip()
    if txt == 'ABSTRACT' or 'ABSTRACT' in txt and len(txt) < 50:
        if p_abstract is None: p_abstract = (i, p)
    elif txt == 'ACKNOWLEDGEMENT' or 'ACKNOWLEDGEMENT' in txt and len(txt) < 50:
        if p_ack is None: p_ack = (i, p)
    elif 'List of figures' in txt:
        if p_lof is None: p_lof = (i, p)
    elif 'CHAPTER 1' in txt:
        if p_ch1 is None: p_ch1 = (i, p)

print("Found markers:")
print("Abstract:", p_abstract[0] if p_abstract else None)
print("Acknowledgement:", p_ack[0] if p_ack else None)
print("List of figures:", p_lof[0] if p_lof else None)
print("Chapter 1:", p_ch1[0] if p_ch1 else None)
