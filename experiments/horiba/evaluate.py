"""Benchmark labels only. Never import into the scanner."""
import json,sys
keys=['temp','ph','phmv','orp','ec','do','saturation','tds','salinity']
expected={
'01-1000492227.jpg':[27.99,7.55,-59,147,.254,12.40,158.5,.165,.12],
'02-1000492234.jpg':[27.68,7.53,-58,166,.274,11.89,151.2,.178,.13],
'03-1000492235.jpg':[27.71,7.47,-55,173,.299,11.83,150.4,.193,.14],
'04-1000492236.jpg':[27.85,7.50,-57,176,.324,11.90,152.0,.211,.15],
'05-1000492237.jpg':[27.80,7.47,-54,181,.160,11.92,151.7,.098,.07],
'06-1000492241.jpg':[28.12,7.46,-54,188,.318,10.55,135.2,.207,.15],
'07-1000490956.jpg':[29.22,7.63,-64,158,.248,11.84,154.7,.161,.12],
'08-1000490948.jpg':[29.21,7.58,-61,152,.273,13.07,170.7,.177,.13]}
rows=[]
for item in json.load(open(sys.argv[1])):
    correct=wrong=unresolved=0
    for key,target in zip(keys,expected[item['file']]):
        value=item.get('readings',{}).get(key,{}).get('value')
        if value is None:unresolved+=1
        elif abs(value-target)<1e-8:correct+=1
        else:wrong+=1
    rows.append({'file':item['file'],'correct':correct,'incorrect':wrong,'unresolved':unresolved})
print(json.dumps({'photos':rows,'totals':{k:sum(r[k] for r in rows) for k in ['correct','incorrect','unresolved']}},indent=2))
