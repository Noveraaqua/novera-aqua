"""Evaluate outputs only; labels never enter recognition. Uses frozen visual labels."""
import ast,json,sys,pathlib,statistics
src=ast.parse(pathlib.Path(__file__).with_name('evaluate.py').read_text())
labels=next(ast.literal_eval(n.value) for n in src.body if isinstance(n,ast.Assign) and any(isinstance(x,ast.Name) and x.id=='expected' for x in n.targets))
labels.update({'05-1000481978.jpg':[28.17,6.47,5,267,1.02,8.26,106.2,.656,.50], '06-1000481986.jpg':[28.59,6.38,11,242,.172,8.06,104.2,.112,.08]})
keys=['temp','ph','phmv','orp','ec','do','saturation','tds','salinity']
reports=[]
for filename in sys.argv[1:]:
 data=json.load(open(filename));report={'batch':pathlib.Path(filename).parent.name,'photos':len(data['records']),'readings':len(data['records'])*9,'runtime':data['runtime'],'versions':data['versions'],'modelBytes':data['modelBytes'],'modelSHA256':data['modelSHA256'],'paddleLoadMs':data['paddleLoadMs'],'tesseractLoadMs':data['tesseractLoadMs'],'combinedProcessRSSBytes':data['rssBytes'],'engines':{}}
 for engine in ['paddle','tesseract']:
  counts={'correct':0,'incorrect':0,'unresolved':0};bykey={k:dict(counts) for k in keys};times=[];errors=[]
  for row in data['records']:
   for key,expected in zip(keys,labels[row['file']]):
    result=row.get('readings',{}).get(key,{})
    value=result.get(engine+'Consensus');category='unresolved' if value is None else 'correct' if abs(value-expected)<1e-8 else 'incorrect'
    counts[category]+=1;bykey[key][category]+=1
    times.extend(p['ms'] for p in result.get(engine,[]))
    if category=='incorrect':errors.append({'file':row['file'],'field':key,'actual':value,'expected':expected})
  report['engines'][engine]={**counts,'byParameter':bykey,'medianCropMs':statistics.median(times),'totalInferenceMs':sum(times),'errors':errors}
 reports.append(report)
print(json.dumps({'rule':'For each engine, grayscale and binary strings must both be valid signed decimal numbers and match exactly. No confidence threshold. This is a comparison metric, not approval to save.','reports':reports},indent=2))
