import { Character } from '../types';
import { EMOTIONAL_TONES, VOICE_PRESETS } from '../constants/presets';
import { processAudioWithDSP } from './audioEncoder';

// Singleton AudioContext
let audioContextInstance: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioContextInstance || audioContextInstance.state === 'closed') {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContextInstance = new AudioCtx({ sampleRate: 44100 });
  }
  if (audioContextInstance.state === 'suspended') {
    audioContextInstance.resume();
  }
  return audioContextInstance;
}

/**
 * Converts Base64 audio string to AudioBuffer.
 */
export async function base64ToAudioBuffer(
  base64Data: string,
  ctx: AudioContext = getAudioContext()
): Promise<AudioBuffer> {
  const binaryString = window.atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  // Make a copy of the buffer because decodeAudioData can detach the ArrayBuffer
  const bufferCopy = bytes.buffer.slice(0);
  return await ctx.decodeAudioData(bufferCopy);
}

/**
 * Plays real-time speech using browser Web Speech API for instant auditory auditions.
 */
export function speakBrowserSpeech(text: string, character: Character): void {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Math.max(0.6, Math.min(1.8, character.speed));
    utterance.pitch = Math.max(0.6, Math.min(1.8, character.pitch));
    utterance.lang = character.language || 'en-US';

    const voices = window.speechSynthesis.getVoices();
    const langPrefix = character.language ? character.language.split('-')[0].toLowerCase() : 'en';
    const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
    const voiceMeta = VOICE_PRESETS.find((v) => v.id === character.voice);

    let matchedVoice: SpeechSynthesisVoice | undefined;
    if (voiceMeta?.gender === 'Female') {
      matchedVoice = langVoices.find((v) =>
        /female|samantha|zira|karen|victoria|moira|anna|yuka/i.test(v.name)
      );
    } else if (voiceMeta?.gender === 'Male') {
      matchedVoice = langVoices.find((v) =>
        /male|david|alex|daniel|george|mark|diego/i.test(v.name)
      );
    }
    if (!matchedVoice && langVoices.length > 0) {
      matchedVoice = langVoices[0];
    }
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Browser speech synthesis error:', err);
  }
}

/**
 * Primary Voice Generator function:
 * 1. Calls backend /api/tts/generate using Gemini 3.8 TTS models.
 * 2. Retries automatically on 429 rate limits with exponential backoff.
 * 3. Decodes the returned WAV AudioBuffer and optionally applies gentle DSP/volume.
 * 4. Propagates real server errors to the UI so failures are never masked.
 */
export async function generateSpeechAudio(
  text: string,
  character: Character,
  options?: {
    model?: 'gemini-3.8-flash-tts' | 'gemini-3.8-flash-lite-tts';
    enhanceWithDSP?: boolean;
  }
): Promise<{ buffer: AudioBuffer; isAiGenerated: boolean; model?: string }> {
  const ctx = getAudioContext();
  const toneMeta =
    EMOTIONAL_TONES.find((t) => t.id === character.emotionalTone) || EMOTIONAL_TONES[0];

  const chosenModel = options?.model || 'gemini-3.8-flash-tts';
  const enhanceWithDSP = options?.enhanceWithDSP ?? false;

  const payload = {
    text,
    voice: character.voice,
    speed: character.speed,
    pitch: character.pitch,
    emotionalTone: character.emotionalTone,
    emotionIntensity: character.emotionIntensity ?? 0.85,
    characterName: character.name,
    language: character.language,
    stylePrompt: character.customStylePrompt?.trim() || toneMeta.geminiPrompt,
    model: chosenModel,
    skipPitchText: true,
    skipSpeedText: true,
  };

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const rawText = await res.text();
      let data: { audioBase64?: string; model?: string; error?: string };
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Unexpected server response (HTTP ${res.status}).`);
      }

      if (res.ok && data.audioBase64) {
        const rawBuffer = await base64ToAudioBuffer(data.audioBase64, ctx);

        const hasCustomDsp = Boolean(character.dspProfileOverride);
        const needsPitchOrSpeed =
          Math.abs((character.pitch ?? 1.0) - 1.0) >= 0.015 ||
          Math.abs((character.speed ?? 1.0) - 1.0) >= 0.015;
        const needsVolume = Math.abs((character.volume ?? 1.0) - 1.0) > 0.01;

        if (!enhanceWithDSP && !hasCustomDsp && !needsPitchOrSpeed && !needsVolume) {
          return { buffer: rawBuffer, isAiGenerated: true, model: data.model || chosenModel };
        }

        // Apply calibrated WSOLA pitch & speed + gentle EQ timbre shaping
        const safePitch = Math.max(0.75, Math.min(1.35, character.pitch ?? 1.0));
        const safeSpeed = Math.max(0.7, Math.min(1.45, character.speed ?? 1.0));

        const enhancedBuffer = await processAudioWithDSP(rawBuffer, {
          speed: safeSpeed,
          pitch: safePitch,
          bassBoostDb: enhanceWithDSP || hasCustomDsp
            ? (character.dspProfileOverride?.bassBoostDb ?? toneMeta.dspProfile.bassBoostDb * 0.5)
            : 0,
          trebleBoostDb: enhanceWithDSP || hasCustomDsp
            ? (character.dspProfileOverride?.trebleBoostDb ?? toneMeta.dspProfile.trebleBoostDb * 0.5)
            : 0,
          midPresenceDb: enhanceWithDSP || hasCustomDsp
            ? (character.dspProfileOverride?.midPresenceDb ?? toneMeta.dspProfile.midPresenceDb * 0.5)
            : 0,
          reverbWet: enhanceWithDSP || hasCustomDsp
            ? (character.dspProfileOverride?.reverbWet ?? 0)
            : 0,
          compression: false,
          volume: character.volume ?? 1.0,
        });

        return { buffer: enhancedBuffer, isAiGenerated: true, model: data.model || chosenModel };
      }

      // Retry only on transient rate-limit (429) or 503 service unavailable
      if ((res.status === 429 || res.status === 503) && attempts < maxAttempts) {
        console.warn(
          `Gemini TTS rate limited (${res.status}), waiting ${attempts * 2}s before retry ${attempts}/${maxAttempts}...`
        );
        await new Promise((r) => setTimeout(r, 2000 * attempts));
        continue;
      }

      const nonRetryableErr = new Error(data.error || `TTS audio generation failed (${res.status}).`) as Error & { nonRetryable?: boolean };
      nonRetryableErr.nonRetryable = true;
      throw nonRetryableErr;
    } catch (err: unknown) {
      const e = err as Error & { nonRetryable?: boolean };
      if (e.nonRetryable || attempts >= maxAttempts) {
        throw e;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  throw new Error('TTS service unavailable. Please retry in a few moments.');
}
