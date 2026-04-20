p = r'C:\Users\Tuck\AppData\Local\FoundryVTT\Data\systems\continuum\templates\apps\lifeline-spreadsheet.html'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()


c = c.replace('style=\\"width:90px\\"  placeholder=\\"YYYY-MM-DD\\"', 'style=\\"width:95px\\" placeholder=\\"YYYY-MM-DD\\"')
c = c.replace('style=\\"width:62px\\"  placeholder=\\"HH:MM\\"', 'style=\\"width:65px\\"  placeholder=\\"HH:MM\\"')
c = c.replace('style=\\"width:160px\\" placeholder=\\"Title (required)\\"', 'style=\\"min-width:180px;flex:1;\\" placeholder=\\"Title\\"\\" title=\\"Title\\"/>')
c = c.replace('style=\\"width:170px\\" placeholder=\\"Notes\\"\\" title=\\"Notes\\"/>', 'style=\\"min-width:240px;flex:2;\\" placeholder=\\"Notes\\"\\" title=\\"Notes\\"/>')
c = c.replace('style=\\"width:100px\\" placeholder=\\"Location\\"\\" title=\\"Location\\"/>', 'style=\\"min-width:150px;flex:1;\\" placeholder=\\"Location\\"\\" title=\\"Location\\"/>')


c = c.replace('style=\\"width:88px\\" placeholder=\\"YYYY-MM-DD\\"', 'style=\\"width:95px\\" placeholder=\\"YYYY-MM-DD\\"')
c = c.replace('style=\\"width:60px\\" placeholder=\\"HH:MM\\"', 'style=\\"width:65px\\" placeholder=\\"HH:MM\\"')

c = c.replace('style=\\"flex:1\\"     placeholder=\\"Departure location\\"', 'style=\\"min-width:150px;flex:1\\"     placeholder=\\"Departure location\\"')
c = c.replace('style=\\"flex:1\\"     placeholder=\\"Arrival location\\"', 'style=\\"min-width:150px;flex:1\\"     placeholder=\\"Arrival location\\"')
c = c.replace('style=\\"flex:1\\" placeholder=\\"Departure location\\"', 'style=\\"min-width:150px;flex:1\\" placeholder=\\"Departure location\\"')
c = c.replace('style=\\"flex:1\\" placeholder=\\"Arrival location\\"', 'style=\\"min-width:150px;flex:1\\" placeholder=\\"Arrival location\\"')

with open(p, 'w', encoding='utf-8') as f:
    f.write(c)
print('Done!')