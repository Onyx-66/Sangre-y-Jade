"""Offline male narration. Requires kokoro-onnx + soundfile in .tools/voice/venv.
Model: Kokoro v1.0, Apache-2.0; voice am_michael (stock synthetic male voice).
Only rendered WAVs ship in the game; model and Python dependencies do not.
"""
import json
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

texts=[
    'Maya cities rose above the jungle, their temples reaching toward the sun.',
    'Astronomers charted the heavens. Cacao and woven cloth crossed bustling markets.',
    'In our legend, a sacred cenote concealed a road to Shibalba.',
    'When the seal shattered, the underworld poured into the sleeping city.',
    'Balam. Ixchel. Kukul. Three heroes answered the call.',
    'Hold the temple. Gather jade. Face the underworld, and bring back the dawn.',
]
kokoro=Kokoro('.tools/voice/kokoro.onnx','.tools/voice/voices.bin')
out=Path('public/assets/audio/narration');out.mkdir(parents=True,exist_ok=True)
manifest=[]
for i,text in enumerate(texts):
    speed=1.03
    samples,rate=kokoro.create(text,voice='am_michael',speed=speed,lang='en-us')
    if len(samples)/rate>4.25:
        speed*=len(samples)/rate/4.15
        samples,rate=kokoro.create(text,voice='am_michael',speed=speed,lang='en-us')
    # Short fades prevent clicks; leave headroom for the musical bed.
    samples=np.asarray(samples,dtype=np.float32)
    samples*=.85/max(.01,float(np.max(np.abs(samples))))
    fade=min(240,len(samples)//2)
    samples[:fade]*=np.linspace(0,1,fade);samples[-fade:]*=np.linspace(1,0,fade)
    sf.write(out/f'en-{i}.wav',samples,rate,subtype='PCM_16')
    manifest.append({'file':f'en-{i}.wav','text':text,'seconds':round(len(samples)/rate,3),'voice':'am_michael','speed':round(speed,3)})
    print(manifest[-1],flush=True)
(out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
