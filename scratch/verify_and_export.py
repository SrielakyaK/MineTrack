import win32com.client
import os

DOC_PATH = r'C:\Users\Srinithy\OneDrive\Desktop\MineTrack_Project_Report_Formatted.docx'
PDF_PATH = r'C:\Users\Srinithy\OneDrive\Desktop\MineTrack_Project_Report_Formatted.pdf'

word = None
doc = None
try:
    word = win32com.client.DispatchEx("Word.Application")
    word.Visible = False
    doc = word.Documents.Open(DOC_PATH)
    
    # Update fields
    try:
        doc.Fields.Update()
    except Exception as e:
        print("Fields update note:", e)
        
    total_pages = doc.ComputeStatistics(2) # 2 = wdStatisticPages
    print(f"Total Pages in document: {total_pages}")
    print(f"Total Sections: {doc.Sections.Count}")
    
    for i in range(1, doc.Sections.Count + 1):
        sec = doc.Sections.Item(i)
        start_page = sec.Range.Information(3) # wdActiveEndPageNumber
        print(f"Section {i} starts on physical page: {start_page}")
        
    print("\n--- CHECKING KEY HEADINGS & FIGURES ---")
    targets = [
        "ABSTRACT",
        "ACKNOWLEDGEMENT",
        "TABLE OF CONTENTS",
        "List of figures",
        "CHAPTER 1",
        "1.1 OVERVIEW",
        "CHAPTER 2",
        "CHAPTER 3",
        "CHAPTER 4",
        "Figure 4.1",
        "Figure 4.2",
        "Figure 4.3",
        "Figure 4.4",
        "Figure 4.5",
        "Figure 4.6",
        "Figure 4.7",
        "CHAPTER 5",
        "CHAPTER 6",
        "CHAPTER 7",
        "APPENDIX",
        "SCREENSHOTS OF PROJECT",
        "REFERENCES"
    ]
    
    for para_idx in range(1, doc.Paragraphs.Count + 1):
        p = doc.Paragraphs.Item(para_idx)
        txt = p.Range.Text.strip()
        for t in targets:
            if t == txt or txt.startswith(t + ":") or (txt.startswith(t) and len(txt) < len(t) + 30):
                pg_num = p.Range.Information(3) # physical page number
                # Also get page number formatted according to section
                sec_idx = p.Range.Sections.Item(1).Index
                print(f"[{sec_idx}] {t:<30} -> Physical Page {pg_num}")
                break
                
    # Export to PDF
    try:
        doc.ExportAsFixedFormat(PDF_PATH, 17) # 17 = wdExportFormatPDF
        print(f"\nSuccessfully exported PDF to: {PDF_PATH}")
    except Exception as e:
        print("PDF export note:", e)
        
    doc.Save()
    print("Document saved successfully.")
    
finally:
    if doc:
        doc.Close(False)
    if word:
        word.Quit()
