"""Generate an original soft, short UI cue using only the Python standard library."""
from pathlib import Path
import math
import struct
import wave

RATE = 22050
DURATION = 0.14
samples = bytearray()
for index in range(int(RATE * DURATION)):
    t = index / RATE
    envelope = min(1, t / 0.008) * (1 - t / DURATION) ** 3
    tone = math.sin(2 * math.pi * 660 * t) + 0.2 * math.sin(2 * math.pi * 990 * t)
    samples.extend(struct.pack('<h', round(0.38 * envelope * tone * 32767)))

output = Path(__file__).resolve().parents[1] / 'assets/audio/ui-hover.wav'
with wave.open(str(output), 'wb') as audio:
    audio.setnchannels(1)
    audio.setsampwidth(2)
    audio.setframerate(RATE)
    audio.writeframes(samples)
