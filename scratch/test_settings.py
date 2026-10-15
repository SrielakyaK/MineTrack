import os
import shutil
import zipfile
import xml.etree.ElementTree as ET
import docx
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

SRC = r'C:\Users\Srinithy\OneDrive\Desktop\minetrack_backup.docx'
TEST_DOCX = r'C:\Users\Srinithy\OneDrive\Desktop\minetrack_test.docx'

shutil.copy2(SRC, TEST_DOCX)

# Step 1: Remove evenAndOddHeaders from settings.xml inside zip
with zipfile.ZipFile(TEST_DOCX, 'r') as zin:
    file_map = {}
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename == 'word/settings.xml':
            # Remove evenAndOddHeaders
            settings_str = data.decode('utf-8')
            # remove <w:evenAndOddHeaders/>
            settings_str = settings_str.replace('<w:evenAndOddHeaders/>', '')
            settings_str = settings_str.replace('<w:evenAndOddHeaders />', '')
            data = settings_str.encode('utf-8')
        file_map[item.filename] = data

with zipfile.ZipFile(TEST_DOCX, 'w', zipfile.ZIP_DEFLATED) as zout:
    for filename, data in file_map.items():
        zout.writestr(filename, data)

print("Settings.xml updated (evenAndOddHeaders removed).")
