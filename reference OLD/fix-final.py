import re

p = r'C:\Users\Tuck\AppData\Local\FoundryVTT\Data\systems\continuum\templates\apps\lifeline-spreadsheet.html'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# New-row form inputs
c = c.replace('style="width:90px"  placeholder="YYYY-MM-DD" title="Date (required)"', 'style="width:95px"  placeholder="YYYY-MM-DD" title="Date (required)"')
c = c.replace('style="width:62px"  placeholder="HH:MM"      title="Time (optional)"', 'style="width:65px"  placeholder="HH:MM"      title="Time (optional)"')
c = c.replace('style="width:160px" placeholder="Title (required)" title="Title"', 'style="min-width:180px; flex:1;" placeholder="Title" title="Title"')
c = c.replace('style="width:170px" placeholder="Notes"       title="Notes"', 'style="min-width:240px; flex:2;" placeholder="Notes" title="Notes"')
c = c.replace('style="width:100px" placeholder="Location"    title="Location"', 'style="min-width:150px; flex:1;" placeholder="Location" title="Location"')

# Span field date inputs (new-row form)
c = c.replace('style="width:88px" placeholder="YYYY-MM-DD"', 'style="width:95px" placeholder="YYYY-MM-DD"')
c = c.replace('style="width:60px" placeholder="HH:MM"', 'style="width:65px" placeholder="HH:MM"')

# Span location inputs (new-row form)
c = c.replace('style="flex:1"     placeholder="Departure location"', 'style="min-width:160px; flex:1"     placeholder="Departure location"')
c = c.replace('style="flex:1"     placeholder="Arrival location"', 'style="min-width:160px; flex:1"     placeholder="Arrival location"')

# Expanded section span locations
c = c.replace('style="flex:1" placeholder="Departure location"', 'style="min-width:160px; flex:1" placeholder="Departure location"')
c = c.replace('style="flex:1" placeholder="Arrival location"', 'style="min-width:160px; flex:1" placeholder="Arrival location"')

# Thead column widths - widen
c = c.replace('<th style="width:90px">Date</th>', '<th style="width:95px">Date</th>')
c = c.replace('<th style="width:65px">Time</th>', '<th style="width:65px">Time</th>')
c = c.replace('<th style="width:160px">Title</th>', '<th style="min-width:180px">Title</th>')
c = c.replace('<th style="width:180px">Notes</th>', '<th style="min-width:240px">Notes</th>')
c = c.replace('<th style="width:130px">Location</th>', '<th style="min-width:150px">Location</th>')

# Thead colspan fix (was 8, but with the map pin button in location col, keep it)
# The location col has the map pin button added, so total is still 8 cols

with open(p, 'w', encoding='utf-8') as f:
    f.write(c)
print('Done! Final inline fixes applied.')