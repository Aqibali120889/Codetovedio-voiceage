/**
 * Generates a broadcast-quality ambient music bed WAV file (48kHz stereo, 60 seconds).
 * Uses rich analog chord pads, warm sub-bass, and gentle ambient stereo texture.
 */

const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 48000;
const DURATION_SEC = 60;
const NUM_SAMPLES = SAMPLE_RATE * DURATION_SEC;
const NUM_CHANNELS = 2; // Stereo
const BYTES_PER_SAMPLE = 2; // 16-bit
const BLOCK_ALIGN = NUM_CHANNELS * BYTES_PER_SAMPLE;
const BYTE_RATE = SAMPLE_RATE * BLOCK_ALIGN;
const DATA_SIZE = NUM_SAMPLES * BLOCK_ALIGN;

const buffer = Buffer.alloc(44 + DATA_SIZE);

// RIFF header
buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + DATA_SIZE, 4);
buffer.write("WAVE", 8);

// "fmt " chunk
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20); // PCM
buffer.writeUInt16LE(NUM_CHANNELS, 22);
buffer.writeUInt32LE(SAMPLE_RATE, 24);
buffer.writeUInt32LE(BYTE_RATE, 28);
buffer.writeUInt16LE(BLOCK_ALIGN, 32);
buffer.writeUInt16LE(16, 34);

// "data" chunk
buffer.write("data", 36);
buffer.writeUInt32LE(DATA_SIZE, 40);

// Chord progression: Dm9 -> Bbmaj7 -> Gm9 -> Asus4 (8 seconds per chord, repeating)
const chords = [
  // Dm9: D2 (73.4), A2 (110), F3 (174.6), C4 (261.6), E4 (329.6)
  [73.42, 110.0, 174.61, 261.63, 329.63],
  // Bbmaj7: Bb1 (58.27), F2 (87.3), D3 (146.8), A3 (220), C4 (261.63)
  [58.27, 87.31, 146.83, 220.0, 261.63],
  // Gm9: G1 (49.0), D2 (73.4), Bb2 (116.5), F3 (174.6), A3 (220)
  [48.99, 73.42, 116.54, 174.61, 220.0],
  // Asus4: A1 (55.0), E2 (82.4), D3 (146.8), A3 (220), E4 (329.6)
  [55.0, 82.41, 146.83, 220.0, 329.63],
];

let offset = 44;
let noiseState = 0xabcdef;

for (let i = 0; i < NUM_SAMPLES; i++) {
  const t = i / SAMPLE_RATE;
  
  // Master fade-in (1.5s) and fade-out (3s)
  const fadeIn = Math.min(1, t / 1.5);
  const fadeOut = Math.min(1, (DURATION_SEC - t) / 3.0);
  const masterEnvelope = fadeIn * fadeOut;

  // Chord progression indexing
  const chordCycle = (t / 8.0) % chords.length;
  const chordIdx = Math.floor(chordCycle);
  const nextChordIdx = (chordIdx + 1) % chords.length;
  const chordBlend = (chordCycle % 1.0);
  // Smooth cosine transition between chords
  const blendFactor = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, (chordBlend - 0.8) / 0.2)));

  const currentChord = chords[chordIdx];
  const nextChord = chords[nextChordIdx];

  // Rhythmic subtle pulse LFO (0.5 Hz ambient breath)
  const lfo = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.5 * t);

  let left = 0;
  let right = 0;

  // Synthesize chord voices with chorus and stereo detune
  for (let c = 0; c < currentChord.length; c++) {
    const f1 = currentChord[c];
    const f2 = nextChord[c];
    const freq = f1 * (1 - blendFactor) + f2 * blendFactor;
    const voiceAmp = (c === 0 ? 0.35 : 0.18) / currentChord.length;

    // Slight stereo chorus detuning (left -0.4Hz, right +0.4Hz)
    const phaseL = 2 * Math.PI * (freq - 0.35) * t;
    const phaseR = 2 * Math.PI * (freq + 0.35) * t;

    // Warm analog-style waveforms: fundamental + soft 2nd/3rd harmonics
    const vL = (Math.sin(phaseL) * 0.75 + Math.sin(phaseL * 2) * 0.18 + Math.sin(phaseL * 3) * 0.07);
    const vR = (Math.sin(phaseR) * 0.75 + Math.sin(phaseR * 2) * 0.18 + Math.sin(phaseR * 3) * 0.07);

    left += vL * voiceAmp;
    right += vR * voiceAmp;
  }

  // Soft analog noise bed (tape warmth, -48 dBFS)
  noiseState = (noiseState * 1664525 + 1013904223) | 0;
  const tapeHiss = ((noiseState & 0xffff) / 32768.0 - 1.0) * 0.008;

  left = (left * lfo + tapeHiss) * masterEnvelope * 0.45;
  right = (right * lfo + tapeHiss) * masterEnvelope * 0.45;

  // Clamp and write 16-bit signed PCM
  const sL = Math.max(-32767, Math.min(32767, Math.floor(left * 32767)));
  const sR = Math.max(-32767, Math.min(32767, Math.floor(right * 32767)));

  buffer.writeInt16LE(sL, offset);
  buffer.writeInt16LE(sR, offset + 2);
  offset += 4;
}

const outDir = path.resolve(__dirname, "../assets/audio/music");
fs.mkdirSync(outDir, { recursive: true });
const targetPath = path.join(outDir, "cyber_ambient_pulse.wav");
fs.writeFileSync(targetPath, buffer);
console.log(`[generate_bgm] Created ambient music bed: ${targetPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
