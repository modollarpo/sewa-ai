path = r'C:\sewa_extract\docs\patent\UK_Patent_Application_2_Specification_and_Claims.md'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Add PACS/scanner references
old = 'medical imaging interface configured to receive digital medical imaging studies via DICOM, HL7, or FHIR protocols'
new = 'medical imaging interface configured to receive digital medical imaging studies via DICOM, HL7, or FHIR protocols from physical imaging scanners and Picture Archiving and Communication System (PACS) servers'
if old in c and 'PACS servers' not in c:
    c = c.replace(old, new)

# Strengthen apparatus claim
old = 'A clinical artificial intelligence computing system for automated diagnostic triage and safety assurance, comprising:'
new = 'A clinical artificial intelligence computing apparatus for automated diagnostic triage and safety assurance, comprising physical hardware components:'
if old in c:
    c = c.replace(old, new)

# Add hardware context to claim 15
old = 'at least one hardware processor;'
new = 'at least one hardware processor coupled to a physical medical imaging interface and to a PACS/worklist server;'
if old in c and 'PACS/worklist server' not in c:
    c = c.replace(old, new)

# Strengthen worklist mention
old = 'dispatching prioritised clinical triage alerts to a medical display worklist'
new = 'dispatching prioritised clinical triage alerts to a physical medical display worklist on a PACS/radiology workstation'
if old in c and 'PACS/radiology workstation' not in c:
    c = c.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print('done')
