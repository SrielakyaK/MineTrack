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
OUT = r'C:\Users\Srinithy\OneDrive\Desktop\MineTrack_Project_Report_Formatted.docx'

doc = docx.Document(SRC)

# -------------------------------------------------------------
# 1. Inspect existing paragraphs to locate key boundaries
# -------------------------------------------------------------
# Paragraph 66: Date: (end of Section 0 - Certificates)
# Paragraph 67: ABSTRACT (start of Section 1 - Preliminary)
# Paragraph 83: ACKNOWLEDGEMENT
# Paragraph 90: Acknowledgement text ending with TABLE OF CONTENTS
# Table 0: Table of Contents
# Paragraph 91: empty after Table 0
# Paragraph 92: List of figures\t
# Paragraph 93: empty
# Paragraph 94: CHAPTER 1 INTRODUCTION (start of Section 2 - Main Report)

# Remove the section breaks from p91, p92, p93
for p_idx in [91, 92, 93]:
    p = doc.paragraphs[p_idx]
    sects = p._p.xpath('./w:pPr/w:sectPr')
    for s in sects:
        p._p.pPr.remove(s)

# Ensure p66 has sectPr (Next Page) for Section 0 -> Section 1
p66 = doc.paragraphs[66]
sects66 = p66._p.xpath('./w:pPr/w:sectPr')
if not sects66:
    sectPr66 = parse_xml(r'''
        <w:sectPr %s>
            <w:type w:val="nextPage"/>
            <w:pgSz w:w="11910" w:h="16845"/>
            <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
            <w:pgBorders w:offsetFrom="page">
                <w:top w:val="double" w:sz="4" w:space="24" w:color="auto"/>
                <w:left w:val="double" w:sz="4" w:space="24" w:color="auto"/>
                <w:bottom w:val="double" w:sz="4" w:space="24" w:color="auto"/>
                <w:right w:val="double" w:sz="4" w:space="24" w:color="auto"/>
            </w:pgBorders>
            <w:cols w:space="720"/>
        </w:sectPr>
    ''' % nsdecls('w'))
    p66._p.get_or_add_pPr().append(sectPr66)
else:
    sectPr66 = sects66[0]
    # Ensure type is nextPage
    t_el = sectPr66.xpath('./w:type')
    if not t_el:
        sectPr66.insert(0, parse_xml(r'<w:type %s w:val="nextPage"/>' % nsdecls('w')))
    else:
        t_el[0].set(qn('w:val'), 'nextPage')

print("Section 0 sectPr configured.")

# -------------------------------------------------------------
# 2. Add List of Figures table after paragraph 92
# -------------------------------------------------------------
p_lof = doc.paragraphs[92] # text is 'List of figures\t'
# Ensure p_lof is styled nicely
p_lof.style = 'Normal'
p_lof.alignment = WD_ALIGN_PARAGRAPH.CENTER

# Create List of Figures table right after p_lof
# In python-docx, to insert a table after a paragraph:
lof_table = doc.add_table(rows=8, cols=3)
# Move the table to right after p_lof
p_lof._p.addnext(lof_table._tbl)

# Style LOF table matching Table 0
tblPr = lof_table._tbl.tblPr
tblPr.append(parse_xml(r'''
    <w:tblBorders %s>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
    </w:tblBorders>
''' % nsdecls('w')))
tblPr.append(parse_xml(r'''
    <w:tblCellMar %s>
        <w:top w:w="80" w:type="dxa"/>
        <w:bottom w:w="80" w:type="dxa"/>
        <w:left w:w="120" w:type="dxa"/>
        <w:right w:w="120" w:type="dxa"/>
    </w:tblCellMar>
''' % nsdecls('w')))
tblPr.append(parse_xml(r'''
    <w:tblW %s w:w="8910" w:type="dxa"/>
''' % nsdecls('w')))

col_widths = [1600, 5910, 1400] # dxa
for r in lof_table.rows:
    for c_i, w in enumerate(col_widths):
        r.cells[c_i].width = Inches(w / 1440.0)

figures_data = [
    ("Figure Number", "Figure Name / Title", "Page Number"),
    ("Figure 4.1", "Overall System Architecture", "12"),
    ("Figure 4.2", "Application Module Interaction", "13"),
    ("Figure 4.3", "Use case Diagram", "15"),
    ("Figure 4.4", "Class Diagram", "16"),
    ("Figure 4.5", "Sequence Diagram", "17"),
    ("Figure 4.6", "Data Flow Diagram", "19"),
    ("Figure 4.7", "Conceptual Data-Model Relationship", "20")
]

for row_idx, data in enumerate(figures_data):
    row = lof_table.rows[row_idx]
    # cantSplit
    row._tr.get_or_add_trPr().append(parse_xml(r'<w:cantSplit %s/>' % nsdecls('w')))
    is_hdr = (row_idx == 0)
    for col_idx, text in enumerate(data):
        cell = row.cells[col_idx]
        p = cell.paragraphs[0]
        p.text = ""
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if col_idx != 1 or is_hdr else WD_ALIGN_PARAGRAPH.LEFT
        run = p.add_run(text)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(12)
        run.font.bold = is_hdr or (col_idx == 0)

print("List of Figures table added.")

# -------------------------------------------------------------
# 3. Add section break after List of Figures table
# -------------------------------------------------------------
# Paragraph 93 is right after LOF table (before Chapter 1).
# We add a Next Page sectPr to paragraph 93!
p93 = doc.paragraphs[93]
sectPr93 = parse_xml(r'''
    <w:sectPr %s>
        <w:type w:val="nextPage"/>
        <w:pgSz w:w="11910" w:h="16845"/>
        <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
        <w:pgBorders w:offsetFrom="page">
            <w:top w:val="double" w:sz="4" w:space="24" w:color="auto"/>
            <w:left w:val="double" w:sz="4" w:space="24" w:color="auto"/>
            <w:bottom w:val="double" w:sz="4" w:space="24" w:color="auto"/>
            <w:right w:val="double" w:sz="4" w:space="24" w:color="auto"/>
        </w:pgBorders>
        <w:cols w:space="720"/>
    </w:sectPr>
''' % nsdecls('w'))
p93._p.get_or_add_pPr().append(sectPr93)

print("Section break after List of Figures configured.")

# -------------------------------------------------------------
# 4. Update Table of Contents (Table 0)
# -------------------------------------------------------------
# Let's inspect Table 0:
# Row 0: CHAPTER NO. | TITLE | PAGE No.
# Row 1: Abstract | i
# Row 2: Acknowledgement | ii
# Row 3: Table of Contents | iii
# We should ensure Row 4 has List of Figures | iv
# Let's see if we can update Row 3 or insert a row for List of Figures.
t0 = doc.tables[0]

# Check if List of Figures is already in t0
has_lof_in_t0 = any('list of figures' in c.text.lower() for r in t0.rows for c in r.cells)
if not has_lof_in_t0:
    # Insert row after Row 3 (Table of Contents)
    # In docx, add a row at the end and move its XML element right after row 3!
    new_r = t0.add_row()
    t0.rows[3]._tr.addnext(new_r._tr)
    # Populate new row
    new_r.cells[0].text = ""
    new_r.cells[1].text = "List of Figures"
    new_r.cells[2].text = "iv"
    for c_i in range(3):
        p = new_r.cells[c_i].paragraphs[0]
        for run in p.runs:
            run.font.name = 'Times New Roman'
            run.font.size = Pt(12)
            run.font.bold = True
    print("Added List of Figures (iv) to Table of Contents.")

# Clean up empty rows 25, 26, 27, 28 if they are completely blank
rows_to_remove = []
for idx, r in enumerate(t0.rows):
    txt = ''.join([c.text.strip() for c in r.cells])
    if not txt:
        rows_to_remove.append(r)

for r in rows_to_remove:
    t0._tbl.remove(r._tr)

print(f"Removed {len(rows_to_remove)} empty rows from Table of Contents.")

# Also fix row height on the Chapter 6/7 row so it doesn't have artificial 3599 dxa height
for r in t0.rows:
    trPr = r._tr.trPr
    if trPr is not None:
        h_els = trPr.xpath('./w:trHeight')
        for h in h_els:
            trPr.remove(h)

# Save intermediate document
doc.save(OUT)
print("Saved intermediate document to:", OUT)
