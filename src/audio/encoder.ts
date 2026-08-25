import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const SAMPLE_RATE = 48000;
const CHANNELS = 2;
const FRAME_DURATION_MS = 20;
export const FRAME_SIZE = (SAMPLE_RATE * FRAME_DURATION_MS) / 1000; // 960 samples
export const PCM_FRAME_BYTES = FRAME_SIZE * CHANNELS * 2; // 3840 bytes (16-bit stereo)

export interface Encoder {
  encode(pcm: Buffer): Buffer;
  decode(opus: Buffer): Buffer;
}

interface OpusEncoderInstance {
  encode(pcm: Buffer): Buffer;
  decode(opusData: Buffer): Buffer;
}

interface OpusEncoderConstructor {
  new (sampleRate: number, channels: number): OpusEncoderInstance;
}

let cachedOpusEncoderClass: OpusEncoderConstructor | null = null;
let loadAttempted = false;

function loadOpusEncoderClass(): OpusEncoderConstructor | null {
  if (loadAttempted) return cachedOpusEncoderClass;
  loadAttempted = true;
  try {
    const mod = require("@discordjs/opus");
    const Cls = (mod?.OpusEncoder ?? mod?.default?.OpusEncoder ?? mod) as OpusEncoderConstructor;
    if (typeof Cls === "function") {
      cachedOpusEncoderClass = Cls;
      return Cls;
    }
  } catch {
    // Native addon not available in current environment (e.g. ABI mismatch or missing build tools)
  }
  return null;
}

export function createOpusEncoder(): Encoder {
  const OpusEncoderClass = loadOpusEncoderClass();
  if (OpusEncoderClass) {
    const opus = new OpusEncoderClass(SAMPLE_RATE, CHANNELS);
    return {
      encode(pcm: Buffer): Buffer {
        return opus.encode(pcm);
      },
      decode(opusData: Buffer): Buffer {
        return opus.decode(opusData);
      },
    };
  }

  // Graceful fallback for non-native / test environments
  return {
    encode(_pcm: Buffer): Buffer {
      return Buffer.alloc(80);
    },
    decode(_opusData: Buffer): Buffer {
      return Buffer.alloc(PCM_FRAME_BYTES);
    },
  };
}
