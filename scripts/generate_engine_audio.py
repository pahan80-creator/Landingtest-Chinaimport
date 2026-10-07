"""Generate a short, original engine-start sound; no third-party recording."""
from pathlib import Path
import math
import random
import struct
import wave

RATE = 22050
DURATION = 2.8
rng = random.Random(42)
phase = 0.0
starter_phase = 0.0
low_noise = 0.0
samples = bytearray()
for index in range(int(RATE * DURATION)):
    t = index / RATE
    noise = rng.uniform(-1, 1)
    low_noise += 0.045 * (noise - low_noise)
    # Starter motor, then ignition, a small rev, and a smooth fade.
    starter_phase += 2 * math.pi * (115 + 12 * math.sin(24 * t)) / RATE
    crank = max(0, 1 - t / 0.85) * min(1, t / 0.04)
    starter = crank * (0.10 * math.sin(starter_phase) + 0.05 * noise) * (0.65 + 0.35 * math.sin(31 * t) ** 2)
    ignition = min(1, max(0, (t - 0.45) / 0.22))
    rev = 37 + 37 * math.exp(-((t - 1.15) / 0.42) ** 2) + 1.4 * math.sin(22 * t)
    phase += 2 * math.pi * rev / RATE
    fade = min(1, max(0, (DURATION - t) / 0.9)) ** 1.5
    pulse = (0.30 * math.sin(phase) + 0.16 * math.sin(2 * phase + 0.4)
             + 0.08 * math.sin(3 * phase + 1.2) + 0.035 * math.sin(7 * phase))
    engine = ignition * fade * (pulse + 0.24 * low_noise) * (0.90 + 0.1 * math.sin(17 * t))
    value = math.tanh(1.5 * (starter + engine)) * 0.72
    samples.extend(struct.pack('<h', round(value * 32767)))

output = Path(__file__).resolve().parents[1] / 'assets/audio/engine-start.wav'
output.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(output), 'wb') as audio:
    audio.setnchannels(1)
    audio.setsampwidth(2)
    audio.setframerate(RATE)
    audio.writeframes(samples)
print(f'Generated {output.name}: {DURATION}s, {len(samples)} PCM bytes')
