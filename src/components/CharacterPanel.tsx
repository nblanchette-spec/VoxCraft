import React from 'react';
import { 
  Users, Plus, Trash2, Globe, Smile, 
  Gauge, Play, Check, CheckCircle2, Music2, Sparkles, AlertCircle, 
  Wand2 
} from 'lucide-react';
import { Character, EmotionalTone, PresetVoiceId } from '../types';
import { VOICE_PRESETS, ALL_GEMINI_VOICE_PRESETS, SUPPORTED_LANGUAGES, EMOTIONAL_TONES } from '../constants/presets';
import { base64ToAudioBuffer, getAudioContext } from '../utils/audioEngine';
import { processAudioWithDSP } from '../utils/audioEncoder';

interface CharacterPanelProps {
  characters: Character[];
  selectedCharacterId: string;
  onSelectCharacter: (id: string) => void;
  onUpdateCharacter: (character: Character) => void;
  onAddCharacter: () => void;
  onDeleteCharacter: (id: string) => void;
  onApplyToAllSegments?: (characterId: string) => void;
  isAllSegmentsUsingActiveChar?: boolean;
  totalSegmentsCount?: number;
  ttsModel?: 'gemini-3.8-flash-tts' | 'gemini-3.8-flash-lite-tts';
}

export const CharacterPanel: React.FC<CharacterPanelProps> = ({
  characters,
  selectedCharacterId,
  onSelectCharacter,
  onUpdateCharacter,
  onAddCharacter,
  onDeleteCharacter,
  onApplyToAllSegments,
  isAllSegmentsUsingActiveChar = false,
  totalSegmentsCount = 0,
  ttsModel = 'gemini-3.8-flash-tts',
}) => {
  const [playingSampleVoice, setPlayingSampleVoice] = React.useState<string | null>(null);
  const [auditionError, setAuditionError] = React.useState<string | null>(null);
  const [showAllVoices, setShowAllVoices] = React.useState<boolean>(false);

  const activeChar = characters.find((c) => c.id === selectedCharacterId) || characters[0];

  // Quick audition sample voice button via Gemini TTS
  const handlePlayVoiceSample = async (voiceId: string) => {
    if (playingSampleVoice) return;
    setPlayingSampleVoice(voiceId);
    setAuditionError(null);

    const voiceMeta = ALL_GEMINI_VOICE_PRESETS.find((v) => v.id === voiceId);
    const sampleText = voiceMeta?.sampleSentence || 'Welcome to VoxCraft Studio.';
    const chosenBaseVoice = (voiceMeta?.id as PresetVoiceId) || 'Kore';
    const toneId = activeChar.emotionalTone;
    const toneMeta = EMOTIONAL_TONES.find((t) => t.id === toneId) || EMOTIONAL_TONES[0];
    const stylePrompt = activeChar.customStylePrompt?.trim() || toneMeta.geminiPrompt;

    try {
      const ctx = getAudioContext();
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleText,
          voice: chosenBaseVoice,
          baseVoice: chosenBaseVoice,
          speed: activeChar.speed,
          pitch: activeChar.pitch,
          emotionalTone: toneId,
          emotionIntensity: activeChar.emotionIntensity ?? 0.85,
          characterName: activeChar.name,
          language: activeChar.language,
          stylePrompt,
          model: ttsModel,
          skipPitchText: true,
          skipSpeedText: true,
        }),
      });

      const rawText = await res.text();
      let data: { audioBase64?: string; error?: string };
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Unexpected server response (HTTP ${res.status}).`);
      }
      if (!res.ok || !data.audioBase64) {
        throw new Error(data.error || `Audition failed (${res.status}).`);
      }

      let buf = await base64ToAudioBuffer(data.audioBase64, ctx);
      if (
        activeChar.dspProfileOverride ||
        Math.abs(activeChar.pitch - 1.0) >= 0.015 ||
        Math.abs(activeChar.speed - 1.0) >= 0.015
      ) {
        buf = await processAudioWithDSP(buf, {
          speed: activeChar.speed,
          pitch: activeChar.pitch,
          bassBoostDb: activeChar.dspProfileOverride?.bassBoostDb ?? 0,
          trebleBoostDb: activeChar.dspProfileOverride?.trebleBoostDb ?? 0,
          midPresenceDb: activeChar.dspProfileOverride?.midPresenceDb ?? 0,
          reverbWet: activeChar.dspProfileOverride?.reverbWet ?? 0,
          compression: false,
          volume: 1.0,
        });
      }

      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.connect(ctx.destination);
      source.start();
      source.onended = () => setPlayingSampleVoice(null);
    } catch (err: unknown) {
      setAuditionError((err as Error).message || 'Gemini TTS audition failed.');
      setPlayingSampleVoice(null);
    }
  };

  const semitonePitch = Math.round(12 * Math.log2(activeChar.pitch));

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-5 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
            Characters & Voice Tuning
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* New Voice Button */}
          <button
            onClick={onAddCharacter}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white transition border border-zinc-700/60"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-400" />
            <span>New Voice</span>
          </button>
        </div>
      </div>

      {/* Character Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {characters.map((char) => {
          const isSelected = char.id === activeChar.id;
          return (
            <button
              key={char.id}
              onClick={() => onSelectCharacter(char.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0 border ${
                isSelected
                  ? 'bg-zinc-800 border-amber-500/50 text-white shadow-md shadow-amber-500/5'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full ring-2 ring-zinc-950"
                style={{ backgroundColor: char.color }}
              />
              <span className="truncate max-w-[110px]">{char.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 font-mono">
                {char.voice}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Character Controls */}
      <div className="space-y-4">
        {/* Name, Color, Delete */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="color"
              value={activeChar.color}
              onChange={(e) => onUpdateCharacter({ ...activeChar, color: e.target.value })}
              className="w-9 h-9 rounded-xl cursor-pointer bg-zinc-800 border border-zinc-700 p-0.5"
              title="Change character badge color"
            />
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-medium text-zinc-400 block mb-1">Speaker Name</label>
            <input
              type="text"
              value={activeChar.name}
              onChange={(e) => onUpdateCharacter({ ...activeChar, name: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-amber-500 transition"
              placeholder="e.g. Narrator, Alice, Captain"
            />
          </div>
          {characters.length > 1 && (
            <button
              onClick={() => onDeleteCharacter(activeChar.id)}
              className="mt-4 p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
              title="Delete this character"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Voice Consistency Action: Set entire voice over to this character */}
        {onApplyToAllSegments && totalSegmentsCount > 0 && (
          <button
            onClick={() => onApplyToAllSegments(activeChar.id)}
            className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-98 border ${
              isAllSegmentsUsingActiveChar
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm'
                : 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 text-amber-300 border-amber-500/40 shadow-sm'
            }`}
            title="Set every line in the voiceover script to use this voice for 100% consistent narration"
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${isAllSegmentsUsingActiveChar ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>
              {isAllSegmentsUsingActiveChar
                ? `✓ Entire Voice Over Set to ${activeChar.name} (${totalSegmentsCount} lines consistent)`
                : `Use "${activeChar.name}" for Entire Voice Over (${totalSegmentsCount} lines)`}
            </span>
          </button>
        )}
        {/* Built-in Preset Voice Selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Studio Voice Presets ({showAllVoices ? ALL_GEMINI_VOICE_PRESETS.length : VOICE_PRESETS.length})</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAllVoices((prev) => !prev)}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 underline underline-offset-2 transition"
              >
                {showAllVoices ? 'Featured 8' : 'Show all 30'}
              </button>
              <button
                onClick={() => handlePlayVoiceSample(activeChar.voice)}
                disabled={Boolean(playingSampleVoice)}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
              >
                <Play className="w-3 h-3 fill-amber-400" />
                <span>{playingSampleVoice === activeChar.voice ? 'Auditioning...' : 'Audition'}</span>
              </button>
            </div>
          </div>

          {auditionError && (
            <div className="mb-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{auditionError}</span>
              </div>
              <button
                onClick={() => setAuditionError(null)}
                className="text-rose-300/70 hover:text-rose-200 text-[10px] underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-0.5 scrollbar-thin">
            {(showAllVoices
              ? ALL_GEMINI_VOICE_PRESETS
              : VOICE_PRESETS.some((v) => v.id === activeChar.voice)
              ? VOICE_PRESETS
              : [
                  ...VOICE_PRESETS,
                  ...ALL_GEMINI_VOICE_PRESETS.filter((v) => v.id === activeChar.voice),
                ]
            ).map((vp) => {
              const isSelected = activeChar.voice === vp.id;
              return (
                <button
                  key={vp.id}
                  onClick={() =>
                    onUpdateCharacter({
                      ...activeChar,
                      voice: vp.id,
                      dspProfileOverride: undefined,
                    })
                  }
                  className={`text-left p-2.5 rounded-xl border transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500 text-white'
                      : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-semibold text-xs text-zinc-200 truncate">{vp.displayName}</span>
                    <span className="text-[9px] uppercase px-1 rounded bg-zinc-800 text-zinc-400 font-mono">
                      {vp.gender}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 line-clamp-1">{vp.timbre}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Emotional Tone Archetype */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-medium text-zinc-300 flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-amber-400" />
              <span>Emotional Tone & Vocal Demeanor</span>
            </label>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium">
              Default: Emotional Vocals
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EMOTIONAL_TONES.map((tone) => {
              const isSelected = activeChar.emotionalTone === tone.id;
              return (
                <button
                  key={tone.id}
                  onClick={() => onUpdateCharacter({ ...activeChar, emotionalTone: tone.id })}
                  className={`text-left p-2 rounded-xl border transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-zinc-800 border-amber-500/70 text-amber-300 ring-1 ring-amber-500/30'
                      : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                  }`}
                >
                  <div>
                    <div className="text-xs font-medium text-zinc-200">{tone.label}</div>
                    <div className="text-[10px] text-zinc-500 line-clamp-1">{tone.description}</div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          {/* Emotion Expressiveness & Intensity Slider */}
          <div className="mt-3 p-3 rounded-xl bg-zinc-950/80 border border-amber-500/20">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Emotion Intensity & Expressiveness</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-zinc-400">
                  {((activeChar.emotionIntensity ?? 0.85) * 100).toFixed(0)}%
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                  (activeChar.emotionIntensity ?? 0.85) >= 0.8
                    ? 'bg-rose-500/20 text-rose-300'
                    : (activeChar.emotionIntensity ?? 0.85) >= 0.5
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {(activeChar.emotionIntensity ?? 0.85) >= 0.85
                    ? 'Vibrant Passion'
                    : (activeChar.emotionIntensity ?? 0.85) >= 0.65
                    ? 'Natural Emotion'
                    : (activeChar.emotionIntensity ?? 0.85) >= 0.35
                    ? 'Subtle Inflection'
                    : 'Monotone'}
                </span>
              </div>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={activeChar.emotionIntensity ?? 0.85}
              onChange={(e) => onUpdateCharacter({ ...activeChar, emotionIntensity: parseFloat(e.target.value) })}
              className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
              <span>Subtle (10%)</span>
              <button
                onClick={() => onUpdateCharacter({ ...activeChar, emotionIntensity: 0.85 })}
                className="text-amber-400/80 hover:text-amber-300 transition"
              >
                85% (Emotional Vocal Default)
              </button>
              <span>Max Drama (100%)</span>
            </div>
          </div>
        </div>

        {/* Sliders: Speed & Pitch & Pause */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80">
          {/* Speed / Pacing */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-zinc-300 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-sky-400" />
                <span>Speech Speed (Tempo)</span>
              </label>
              <span className="font-mono text-xs text-amber-400 font-semibold">
                {activeChar.speed.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.6"
              step="0.05"
              value={activeChar.speed}
              onChange={(e) => onUpdateCharacter({ ...activeChar, speed: parseFloat(e.target.value) })}
              className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
              <span>0.6x (Slow)</span>
              <button
                onClick={() => onUpdateCharacter({ ...activeChar, speed: 1.0 })}
                className="text-zinc-400 hover:text-amber-400 transition"
              >
                1.0x (Reset)
              </button>
              <span>1.6x (Fast)</span>
            </div>
          </div>

          {/* Pitch Tuning */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-zinc-300 flex items-center gap-1.5">
                <Music2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Vocal Pitch (Key Shift)</span>
              </label>
              <span className="font-mono text-xs text-amber-400 font-semibold">
                {semitonePitch > 0 ? `+${semitonePitch}` : semitonePitch} st
              </span>
            </div>
            <input
              type="range"
              min="0.75"
              max="1.35"
              step="0.02"
              value={activeChar.pitch}
              onChange={(e) => onUpdateCharacter({ ...activeChar, pitch: parseFloat(e.target.value) })}
              className="w-full accent-purple-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
              <span>Deep (-5st)</span>
              <button
                onClick={() => onUpdateCharacter({ ...activeChar, pitch: 1.0 })}
                className="text-zinc-400 hover:text-purple-400 transition"
              >
                Normal (0st)
              </button>
              <span>Bright (+5st)</span>
            </div>
          </div>
        </div>

        {/* Acting & Style Direction Prompt (Always Editable for Gemini TTS) */}
        <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-medium text-amber-400 flex items-center gap-1.5">
              <Wand2 className="w-3 h-3" />
              <span>Director Acting & Style Prompt (Gemini TTS)</span>
            </label>
            {activeChar.customStylePrompt && (
              <button
                onClick={() => onUpdateCharacter({ ...activeChar, customStylePrompt: undefined })}
                className="text-[10px] text-zinc-500 hover:text-rose-400 transition"
              >
                Reset to Tone Default
              </button>
            )}
          </div>
          <textarea
            value={activeChar.customStylePrompt ?? ''}
            onChange={(e) =>
              onUpdateCharacter({
                ...activeChar,
                customStylePrompt: e.target.value || undefined,
              })
            }
            rows={2}
            placeholder={
              EMOTIONAL_TONES.find((t) => t.id === activeChar.emotionalTone)?.geminiPrompt ||
              'e.g. Speak with urgent, breathless suspense and a quiet dramatic pause at the end...'
            }
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 resize-none"
          />
          <p className="text-[10px] text-zinc-500 mt-1">
            Sent directly to Gemini TTS <code className="text-zinc-400">speechMetadata.style</code> to shape emotion, breathing, and delivery.
          </p>
        </div>

        {/* Language & Pause After */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5 mb-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Speaking Language & Accent</span>
            </label>
            <select
              value={activeChar.language}
              onChange={(e) => onUpdateCharacter({ ...activeChar, language: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 transition cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-zinc-900 text-white">
                  {lang.flag} {lang.name} - {lang.nativeName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-zinc-400">Silence Gap After Line</label>
              <span className="font-mono text-xs text-zinc-400">{activeChar.pauseAfter.toFixed(2)}s</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.05"
              value={activeChar.pauseAfter}
              onChange={(e) => onUpdateCharacter({ ...activeChar, pauseAfter: parseFloat(e.target.value) })}
              className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer mt-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
