import React, { useState } from 'react';
import { 
  FileText, Wand2, Plus, Trash2, Play, Pause, RefreshCw, 
  ChevronUp, ChevronDown, Sparkles, AlertCircle, CheckCircle2,
  Shuffle, Users, User, Smile
} from 'lucide-react';
import { Character, ScriptSegment, EmotionalTone } from '../types';
import { EMOTIONAL_TONES } from '../constants/presets';

interface ScriptEditorProps {
  rawScript: string;
  onRawScriptChange: (val: string) => void;
  segments: ScriptSegment[];
  characters: Character[];
  onUpdateSegments: (segments: ScriptSegment[]) => void;
  onParseScript: () => void;
  onShuffleCast?: (mode: 'random' | 'alternate') => void;
  voiceMode?: 'single' | 'multi';
  onSetVoiceMode?: (mode: 'single' | 'multi') => void;
  onSetAllSegmentsToCharacter?: (characterId: string) => void;
  onGenerateSingleSegment: (segmentId: string) => void;
  onPlaySingleSegment: (segment: ScriptSegment) => void;
  playingSegmentId: string | null;
  activeSegmentId: string | null;
  ttsModel?: 'gemini-3.8-flash-tts' | 'gemini-3.8-flash-lite-tts';
  onChangeTtsModel?: (model: 'gemini-3.8-flash-tts' | 'gemini-3.8-flash-lite-tts') => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  rawScript,
  onRawScriptChange,
  segments,
  characters,
  onUpdateSegments,
  onParseScript,
  onShuffleCast,
  voiceMode = 'multi',
  onSetVoiceMode,
  onSetAllSegmentsToCharacter,
  onGenerateSingleSegment,
  onPlaySingleSegment,
  playingSegmentId,
  activeSegmentId,
  ttsModel = 'gemini-3.8-flash-tts',
  onChangeTtsModel,
}) => {
  const [viewMode, setViewMode] = React.useState<'segments' | 'raw'>('segments');
  const [shuffleMenuOpen, setShuffleMenuOpen] = useState(false);
  const [focusedSegmentId, setFocusedSegmentId] = useState<string | null>(null);

  // Add line to segments
  const handleAddSegment = (afterIndex?: number) => {
    const newSeg: ScriptSegment = {
      id: 'seg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      characterId: characters[0]?.id || 'char-1',
      text: 'New dialogue line here...',
      status: 'idle',
    };

    if (afterIndex !== undefined) {
      const copy = [...segments];
      copy.splice(afterIndex + 1, 0, newSeg);
      onUpdateSegments(copy);
    } else {
      onUpdateSegments([...segments, newSeg]);
    }
  };

  const handleUpdateSegmentText = (id: string, text: string) => {
    onUpdateSegments(
      segments.map((s) => (s.id === id ? { ...s, text, status: 'idle', audioUrl: undefined, audioBuffer: undefined } : s))
    );
  };

  const handleUpdateSegmentCharacter = (id: string, charId: string) => {
    onUpdateSegments(
      segments.map((s) => (s.id === id ? { ...s, characterId: charId, status: 'idle' } : s))
    );
  };

  const handleDeleteSegment = (id: string) => {
    onUpdateSegments(segments.filter((s) => s.id !== id));
  };

  const handleMoveSegment = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= segments.length) return;
    const copy = [...segments];
    const [removed] = copy.splice(index, 1);
    copy.splice(newIndex, 0, removed);
    onUpdateSegments(copy);
  };

  const formatSec = (d?: number) => {
    if (!d) return '0.0s';
    return `${d.toFixed(1)}s`;
  };

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl">
      {/* Editor Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
            Script & Dialogue Timeline
          </h2>
          <span className="text-xs text-zinc-500 font-mono">({segments.length} lines)</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="bg-zinc-950 p-1 rounded-xl border border-zinc-800 flex items-center text-xs">
            <button
              onClick={() => setViewMode('segments')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                viewMode === 'segments'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Dialogue Blocks
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                viewMode === 'raw'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Raw Script Paste
            </button>
          </div>

          {/* Randomize / Alternate Voices Dropdown */}
          {onShuffleCast && segments.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShuffleMenuOpen(!shuffleMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-850 hover:bg-zinc-800 text-purple-300 hover:text-purple-200 border border-purple-500/30 transition shadow-sm active:scale-95"
                title="Randomize or alternate characters across dialogue lines"
              >
                <Shuffle className="w-3.5 h-3.5 text-purple-400" />
                <span>Randomize Voices</span>
              </button>

              {shuffleMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-56 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl p-1.5 z-30 animate-in fade-in zoom-in-95"
                  onMouseLeave={() => setShuffleMenuOpen(false)}
                >
                  <button
                    onClick={() => {
                      onShuffleCast('alternate');
                      setShuffleMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-zinc-800 text-zinc-200 hover:text-white flex items-center gap-2 transition"
                  >
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <div>
                      <div className="font-medium">Alternate Cast in Order</div>
                      <div className="text-[10px] text-zinc-400">Cycles 1, 2, 3 across each line</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onShuffleCast('random');
                      setShuffleMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-zinc-800 text-zinc-200 hover:text-white flex items-center gap-2 transition"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-purple-400" />
                    <div>
                      <div className="font-medium">Random Voice Shuffle</div>
                      <div className="text-[10px] text-zinc-400">Distributes cast randomly across lines</div>
                    </div>
                  </button>

                  {onSetAllSegmentsToCharacter && characters[0] && (
                    <button
                      onClick={() => {
                        const targetCharId = activeSegmentId
                          ? segments.find((s) => s.id === activeSegmentId)?.characterId || characters[0].id
                          : characters[0].id;
                        onSetAllSegmentsToCharacter(targetCharId);
                        setShuffleMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-zinc-800 text-zinc-200 hover:text-white flex items-center gap-2 transition border-t border-zinc-800 mt-1 pt-1.5"
                    >
                      <User className="w-3.5 h-3.5 text-emerald-400" />
                      <div>
                        <div className="font-medium">Set All Lines to One Voice</div>
                        <div className="text-[10px] text-zinc-400">100% consistent single speaker VO</div>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={onParseScript}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition shadow-sm active:scale-95"
            title="Auto-detect speakers or auto-distribute lines into dialogue blocks"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Parse Script</span>
          </button>
        </div>
      </div>

      {/* Raw Script Textarea Mode */}
      {viewMode === 'raw' ? (
        <div className="space-y-3">
          <div className="text-xs text-zinc-400">
            Paste or edit your script below. Format lines as <code className="text-amber-400 bg-zinc-800 px-1 py-0.5 rounded">Character: Dialogue</code> or single narration paragraphs. Click <strong>Parse Script</strong> to split and assign speakers.
          </div>
          <textarea
            value={rawScript}
            onChange={(e) => onRawScriptChange(e.target.value)}
            rows={10}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500 leading-relaxed transition resize-y"
            placeholder="Narrator: Deep in the misty forest...&#10;Commander Marcus: Keep your radio silent."
          />
          <div className="flex justify-end">
            <button
              onClick={onParseScript}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-amber-500 text-zinc-950 hover:bg-amber-400 transition shadow-md shadow-amber-500/10"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Parse & Map to Dialogue Blocks</span>
            </button>
          </div>
        </div>
      ) : (
        /* Segment Blocks Mode */
        <div className="space-y-3">
          {/* Cast Setup & Voice Consistency Bar */}
          {segments.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-medium">Cast Setup:</span>
                <div className="bg-zinc-900 p-0.5 rounded-lg border border-zinc-750 flex items-center">
                  <button
                    onClick={() => {
                      if (onSetVoiceMode) onSetVoiceMode('single');
                      if (onSetAllSegmentsToCharacter && characters[0]) {
                        onSetAllSegmentsToCharacter(characters[0].id);
                      }
                    }}
                    className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                      voiceMode === 'single'
                        ? 'bg-amber-500 text-zinc-950 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                    title="Entire script is read by one consistent voice"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Single Voice</span>
                  </button>
                  <button
                    onClick={() => {
                      if (onSetVoiceMode) onSetVoiceMode('multi');
                    }}
                    className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                      voiceMode === 'multi'
                        ? 'bg-amber-500 text-zinc-950 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                    title="Multiple characters with alternating or randomized dialogue lines"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Multi-Cast</span>
                  </button>
                </div>
              </div>

              {voiceMode === 'single' ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400">All lines spoken by:</span>
                  <select
                    value={segments[0]?.characterId || characters[0]?.id}
                    onChange={(e) => onSetAllSegmentsToCharacter && onSetAllSegmentsToCharacter(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-amber-500/50 text-xs text-amber-300 font-semibold focus:outline-none focus:border-amber-400 cursor-pointer shadow-sm"
                  >
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.voice} • {c.emotionalTone})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-emerald-400 font-mono hidden sm:inline">
                    ✓ 100% Consistent
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400">Multi-character distribution active</span>
                  {onShuffleCast && (
                    <button
                      onClick={() => onShuffleCast('random')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-[11px] font-semibold transition active:scale-95"
                      title="Shuffle voices randomly across lines"
                    >
                      <Shuffle className="w-3 h-3 text-purple-400" />
                      <span>Randomize</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Gemini TTS Model & Expressive Vocal Cues Bar */}
          {onChangeTtsModel && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-zinc-400 font-medium">Gemini TTS Model:</span>
                <div className="bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 flex items-center">
                  <button
                    onClick={() => onChangeTtsModel('gemini-3.8-flash-tts')}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition ${
                      ttsModel === 'gemini-3.8-flash-tts'
                        ? 'bg-amber-500 text-zinc-950'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                    title="Flagship expressive voice acting model with vocal bursts and voice design"
                  >
                    3.8 Flash TTS (Expressive)
                  </button>
                  <button
                    onClick={() => onChangeTtsModel('gemini-3.8-flash-lite-tts')}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition ${
                      ttsModel === 'gemini-3.8-flash-lite-tts'
                        ? 'bg-amber-500 text-zinc-950'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                    title="Fast, low-latency general TTS model"
                  >
                    3.8 Flash Lite (Fast)
                  </button>
                </div>
              </div>

              {ttsModel === 'gemini-3.8-flash-tts' && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500">Insert Cue:</span>
                  {['<breath>', '<laugh>', '<gasp>', '|mhm|', '|yeah|'].map((cue) => (
                    <button
                      key={cue}
                      type="button"
                      onClick={() => {
                        const targetId = focusedSegmentId || activeSegmentId || segments[0]?.id;
                        if (!targetId) return;
                        onUpdateSegments(
                          segments.map((s) =>
                            s.id === targetId
                              ? {
                                  ...s,
                                  text: `${s.text.trimEnd()} ${cue}`.trim(),
                                  status: 'idle',
                                  audioUrl: undefined,
                                  audioBuffer: undefined,
                                }
                              : s
                          )
                        );
                      }}
                      className="px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-[10px] font-mono text-amber-300 transition"
                      title={`Append ${cue} vocal burst to selected line`}
                    >
                      {cue}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {segments.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40">
              <FileText className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-zinc-300">No script lines parsed yet</p>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-sm mx-auto">
                Paste a script in Raw Script mode or click below to add your first voiceover dialogue line.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => handleAddSegment()}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition"
                >
                  Add Line
                </button>
                <button
                  onClick={onParseScript}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-zinc-950 hover:bg-amber-400 transition"
                >
                  Parse Default Script
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1 scrollbar-thin">
              {segments.map((seg, idx) => {
                const char = characters.find((c) => c.id === seg.characterId) || characters[0];
                const isPlaying = playingSegmentId === seg.id;
                const isActive = activeSegmentId === seg.id;

                return (
                  <div
                    key={seg.id}
                    className={`group relative p-3 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-zinc-800/90 border-amber-500/80 shadow-lg shadow-amber-500/5'
                        : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Line Number & Reorder */}
                      <div className="flex flex-col items-center justify-center pt-1 text-zinc-500">
                        <span className="text-[10px] font-mono select-none">#{idx + 1}</span>
                        <div className="flex flex-col gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => handleMoveSegment(idx, 'up')}
                            disabled={idx === 0}
                            className="p-0.5 hover:text-zinc-200 disabled:opacity-20"
                            title="Move up"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleMoveSegment(idx, 'down')}
                            disabled={idx === segments.length - 1}
                            className="p-0.5 hover:text-zinc-200 disabled:opacity-20"
                            title="Move down"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Character Pill Selector */}
                      <div className="shrink-0 pt-0.5">
                        <div className="relative">
                          <select
                            value={seg.characterId}
                            onChange={(e) => handleUpdateSegmentCharacter(seg.id, e.target.value)}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700/80 text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer appearance-none pr-6 flex items-center"
                            style={{ borderLeftColor: char?.color, borderLeftWidth: '3px' }}
                          >
                            {characters.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.voice})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Text Input Area */}
                      <div className="flex-1">
                        <textarea
                          value={seg.text}
                          onFocus={() => setFocusedSegmentId(seg.id)}
                          onChange={(e) => handleUpdateSegmentText(seg.id, e.target.value)}
                          rows={2}
                          className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:bg-zinc-900/60 p-1.5 rounded-lg border border-transparent focus:border-zinc-700 resize-none transition"
                          placeholder="Type or paste character dialogue..."
                        />

                        {/* Status bar & Audio details */}
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1 px-1">
                          <div className="flex items-center gap-2">
                            {seg.status === 'ready' && (
                              <span className="flex items-center gap-1 text-emerald-400 font-mono">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Ready ({formatSec(seg.duration)})</span>
                              </span>
                            )}
                            {seg.status === 'generating' && (
                              <span className="flex items-center gap-1 text-amber-400 font-mono">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>Generating audio...</span>
                              </span>
                            )}
                            {seg.status === 'idle' && (
                              <span className="text-zinc-500">Unrendered</span>
                            )}
                            {seg.status === 'error' && (
                              <span className="flex items-center gap-1 text-rose-400">
                                <AlertCircle className="w-3 h-3" />
                                <span>{seg.errorMessage || 'Error generating'}</span>
                              </span>
                            )}
                          </div>

                          {/* Emotion Tone Override for this individual line */}
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <Smile className="w-3 h-3 text-amber-400 shrink-0" />
                            <select
                              value={seg.emotionalToneOverride || char?.emotionalTone || 'Warm & Friendly'}
                              onChange={(e) => {
                                const newTone = e.target.value as EmotionalTone;
                                const updated = segments.map((s) =>
                                  s.id === seg.id ? { ...s, emotionalToneOverride: newTone, status: 'idle' as const } : s
                                );
                                onUpdateSegments(updated);
                              }}
                              className="bg-zinc-900/90 text-amber-300 font-medium px-2 py-0.5 rounded border border-zinc-750 hover:border-amber-500/50 cursor-pointer focus:outline-none"
                              title="Set emotional tone for this specific line"
                            >
                              {EMOTIONAL_TONES.map((tone) => (
                                <option key={tone.id} value={tone.id}>
                                  {tone.label}
                                </option>
                              ))}
                            </select>
                            <span className="text-zinc-500 font-mono">
                              • {char?.speed}x
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Line Action Buttons */}
                      <div className="flex items-center gap-1 pt-1 shrink-0">
                        {/* Play Single Line */}
                        <button
                          onClick={() => onPlaySingleSegment(seg)}
                          className={`p-2 rounded-lg transition ${
                            isPlaying
                              ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                              : 'bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800'
                          }`}
                          title={isPlaying ? 'Pause' : 'Preview this line'}
                        >
                          {isPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                        </button>

                        {/* Regenerate Single Line */}
                        <button
                          onClick={() => onGenerateSingleSegment(seg.id)}
                          disabled={seg.status === 'generating'}
                          className="p-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition disabled:opacity-40"
                          title="Generate or re-synthesize this line"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${seg.status === 'generating' ? 'animate-spin text-amber-400' : ''}`} />
                        </button>

                        {/* Add Line Below */}
                        <button
                          onClick={() => handleAddSegment(idx)}
                          className="p-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition opacity-0 group-hover:opacity-100"
                          title="Insert line below"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Line */}
                        <button
                          onClick={() => handleDeleteSegment(seg.id)}
                          className="p-2 rounded-lg bg-zinc-900 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100"
                          title="Delete line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Line Footer Button */}
          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={() => handleAddSegment()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Dialogue Line</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
