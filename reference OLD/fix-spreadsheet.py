import os

p = r'C:\Users\Tuck\AppData\Local\FoundryVTT\Data\systems\continuum\templates\apps\lifeline-spreadsheet.html'
with open(p, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Widen the .lss-field base rule: add min-width:0, box-sizing:border-box, better padding
content = content.replace(
    'padding:2px 4px; font-size:11px; border-radius:2px; }',
    'padding:2px 5px; font-size:11px; border-radius:2px; box-sizing:border-box; }'
)

# 2. Add min-width rules for field types after the base .lss-field rule
content = content.replace(
    '.lifeline-spreadsheet .lss-field:focus { border-color:#4da6ff; outline:none; }',
    '.lifeline-spreadsheet .lss-field:focus { border-color:#4da6ff; outline:none; }\n/* Field-type minimum widths so text is always readable */\n.lifeline-spreadsheet .lss-field-date { min-width:95px; }\n.lifeline-spreadsheet .lss-field-time { min-width:65px; }\n.lifeline-spreadsheet .lss-field-title { min-width:180px; }\n.lifeline-spreadsheet .lss-field-notes { min-width:240px; }\n.lifeline-spreadsheet .lss-field-location { min-width:150px; }'
)

# 3. Fix icon-only buttons: lss-action-btn (expand + delete) - exact icon width
content = content.replace(
    'padding:2px 4px; }',
    'padding:2px; width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; font-size:11px; }'
)

# 4. Fix icon-only buttons: lss-map-pin-btn - exact icon width
content = content.replace(
    'padding:3px 6px; border-radius:3px; cursor:pointer; font-size:11px; }',
    'padding:3px; width:22px; height:22px; border-radius:3px; cursor:pointer; font-size:11px; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }'
)

# 5. Widen table min-width so horizontal scroll reveals full content
content = content.replace(
    'width:100%; border-collapse:collapse; }',
    'width:100%; border-collapse:collapse; table-layout:auto; min-width:1000px; }'
)

with open(p, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
