"""Reproduce model assets locally; photos are never part of this build step."""
import hashlib,io,pathlib,urllib.request,zipfile
root=pathlib.Path(__file__).resolve().parents[2]
url='https://github.com/xushengfeng/eSearch-OCR/releases/download/4.0.0/en.zip'
archive=urllib.request.urlopen(url,timeout=60).read()
assert hashlib.sha256(archive).hexdigest()=='9423bfc78b29858562f7e9e6825212d0975888726b3bf0649ee0fe762f5c2d6e','Model archive changed; investigate before proceeding'
z=zipfile.ZipFile(io.BytesIO(archive));model=z.read('en/en_PP-OCRv3_rec_infer.onnx');dictionary=z.read('en/en_dict.txt')
assert hashlib.sha256(model).hexdigest()=='ef7abd8bd3629ae57ea2c28b425c1bd258a871b93fd2fe7c433946ade9b5d9ea'
for base in [root/'assets/models',root/'dist/assets/models']:
 base.mkdir(parents=True,exist_ok=True);(base/'en-rec.onnx').write_bytes(model);(base/'en-dict.txt').write_bytes(dictionary)
print('Verified PaddleOCR model assets prepared.')
