p = r'C:\Users\Tuck\AppData\Local\FoundryVTT\Data\systems\continuum\templates\apps\lifeline-spreadsheet.html'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# Widen all span location inputs from 140px to min-width:150px + flex:1
c = c.replace('style=\\"width:140px\\" placeholder=\\"Departure location\\"', 'style=\\"min-width:160px;flex:1\\" placeholder=\\"Departure location\\"')
c = c.replace('style=\\"width:140px\\" placeholder=\\"Arrival location\\"', 'style=\\"min-width:160px;flex:1\\" placeholder=\\"Arrival location\\"')

with open(p, 'w', encoding='utf-8') as f:
    f.write(c)
print('Done!')