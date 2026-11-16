export interface Character {
  id: string;
  name: string;
  color: string;
  avatarIcon: string;
  voice: PresetVoiceId | string;
  language: string;
  speed: number; // 0.5 to 2.0
  pitch: number; // -12 to +12 semitones or 0.6 to 1.5
  emotionalTone: EmotionalTone;
  emotionIntensity?: number; // 0.0 to 1.0 (defaults to 0.85 for vibrant emotional expression)
  customStylePrompt?: string;
  volume: number; // 0 to 1
  pauseAfter: number; // seconds of silence after each line (0 to 3)
  dspProfileOverride?: {
    bassBoostDb: number;
    trebleBoostDb: number;
    midPresenceDb: number;
    reverbWet: number;
  };
}

export type PresetVoiceId =
  | 'Puck'
  | 'Charon'
  | 'Kore'
  | 'Fenrir'
  | 'Aoede'
  | 'Zephyr'
  | 'Leda'
  | 'Orus';

export type EmotionalTone =
  | 'Natural & Conversational'
  | 'Warm & Friendly'
  | 'Authoritative & Serious'
  | 'Enthusiastic & High Energy'
  | 'Dramatic & Cinematic Movie'
  | 'Calm & Whispering / ASMR'
  | 'Professional News Anchor'
  | 'Empathetic & Compassionate'
  | 'Playful & Sarcastic'
  | 'Educational & Explanatory';

export interface VoicePresetMeta {
  id: PresetVoiceId | string;
  displayName: string;
  gender: 'Female' | 'Male' | 'Neutral';
  timbre: string;
  description: string;
  bestFor: string;
  defaultPitch: number;
  sampleSentence: string;
  tags: string[];
  isCustom?: boolean;
}

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export interface ScriptSegment {
  id: string;
  characterId: string;
  text: string;
  audioUrl?: string;
  audioBuffer?: AudioBuffer;
  duration?: number;
  emotionalToneOverride?: EmotionalTone;
  emotionIntensityOverride?: number;
  status: 'idle' | 'generating' | 'ready' | 'error';
  errorMessage?: string;
}

export interface AudioExportOptions {
  format: 'wav' | 'mp3';
  bitrate?: 128 | 192 | 320; // for MP3
  sampleRate?: 24000 | 44100 | 48000;
  silenceBetweenSec: number;
  normalizeAudio: boolean;
}

export interface GenerationSettings {
  model: 'gemini-3.8-flash-lite-tts' | 'gemini-3.8-flash-tts';
  globalLanguage: string;
  enhanceWithDSP: boolean;
  backgroundAmbience?: 'none' | 'room' | 'warmth';
}
