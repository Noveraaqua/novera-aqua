"""Offline HORIBA pipeline experiment. Never publishes photos or changes app records."""
import cv2, numpy as np, json, pathlib, sys

def detect(image):
    h,w=image.shape[:2]; gray=cv2.cvtColor(image,cv2.COLOR_BGR2GRAY)
    hsv=cv2.cvtColor(image,cv2.COLOR_BGR2HSV)
    blue=cv2.inRange(hsv,np.array([90,90,45]),np.array([130,255,255]))
    candidates=[]
    for level,kernel in [(v,k) for v in range(75,236,20) for k in [1,5,11,21]]:
        mask=cv2.threshold(gray,level,255,cv2.THRESH_BINARY)[1]
        mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((kernel,kernel),np.uint8))
        for contour in cv2.findContours(mask,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)[0]:
            area=cv2.contourArea(contour)
            if not .035*w*h<area<.65*w*h: continue
            q=cv2.approxPolyDP(contour,.025*cv2.arcLength(contour,True),True)
            if len(q)!=4 or not cv2.isContourConvex(q):continue
            q=q[:,0,:].astype(np.float32)
            # Clockwise corners, then locate the edge beside the blue HORIBA strip.
            center=q.mean(axis=0); q=q[np.argsort(np.arctan2(q[:,1]-center[1],q[:,0]-center[0]))]
            lengths=np.linalg.norm(np.roll(q,-1,axis=0)-q,axis=1)
            if max(lengths)/min(lengths)>2.4:continue
            scores=[]
            for i in range(4):
                a,b=q[i],q[(i+1)%4];mid=(a+b)/2;out=mid-center;out/=np.linalg.norm(out)
                pts=np.array([a*(1-t)+b*t+out*d for t in np.linspace(.15,.85,12) for d in np.linspace(8,min(lengths)*.24,12)]).astype(int)
                valid=(pts[:,0]>=0)&(pts[:,0]<w)&(pts[:,1]>=0)&(pts[:,1]<h);pts=pts[valid]
                scores.append(np.mean(blue[pts[:,1],pts[:,0]]>0) if len(pts) else 0)
            top=int(np.argmax(scores));q=np.roll(q,-top,axis=0)
            ratio=(lengths[top]+lengths[(top+2)%4])/(lengths[(top+1)%4]+lengths[(top+3)%4])
            if not 1.05<ratio<1.65 or scores[top]<.35:continue
            score=scores[top]-abs(ratio-1.32)*.6
            candidates.append((score,q))
    if not candidates:raise ValueError('Screen not confidently located; manual adjustment required')
    score,q=max(candidates,key=lambda x:x[0])
    matrix=cv2.getPerspectiveTransform(q,np.float32([[0,0],[899,0],[899,674],[0,674]]))
    return cv2.warpPerspective(image,matrix,(900,675)),q,score

# Relative boxes within the LCD, not the instrument casing. Values include signs/points.
REGIONS={'temp':(.025,.302,.285,.390),'ph':(.055,.400,.285,.488),'phmv':(.08,.497,.285,.585),'orp':(.06,.594,.285,.682),'ec':(.02,.691,.285,.779),'do':(.02,.788,.285,.880),'saturation':(.485,.302,.735,.390),'tds':(.485,.400,.735,.488),'salinity':(.525,.497,.735,.585)}
def prepare(path,out):
    im=cv2.imread(str(path)); screen,q,score=detect(im);out.mkdir(parents=True,exist_ok=True)
    cv2.imwrite(str(out/'screen.png'),screen)
    for name,(x0,y0,x1,y1) in REGIONS.items():
        crop=screen[int(y0*675):int(y1*675),int(x0*900):int(x1*900)]
        gray=cv2.cvtColor(crop,cv2.COLOR_BGR2GRAY)
        gray=cv2.GaussianBlur(gray,(3,3),.65)
        gray=cv2.resize(gray,None,fx=2,fy=2,interpolation=cv2.INTER_CUBIC)
        for variant,arr in [('gray',gray),('binary',cv2.threshold(gray,0,255,cv2.THRESH_BINARY+cv2.THRESH_OTSU)[1])]:
            arr=cv2.copyMakeBorder(arr,20,20,20,20,cv2.BORDER_CONSTANT,value=255)
            cv2.imwrite(str(out/(name+'-'+variant+'.png')),arr)
    return {'file':path.name,'corners':q.tolist(),'detectorScore':float(score),'status':'prepared'}
if __name__=='__main__':
    src,out=map(pathlib.Path,sys.argv[1:3]);report=[]
    for path in sorted(src.glob('*.jpg')):
        if path.name.startswith('01-1000490948'):continue
        try:report.append(prepare(path,out/path.stem))
        except Exception as e:report.append({'file':path.name,'status':'failed','reason':str(e)})
    (out/'preparation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
