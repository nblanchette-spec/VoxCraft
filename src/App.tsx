import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { CharacterPanel } from './components/CharacterPanel';
import { ScriptEditor } from './components/ScriptEditor';
import { AudioPlayerTimeline } from './components/AudioPlayerTimeline';
import { ExportModal } from './components/ExportModal';
import { TranslateModal } from './components/TranslateModal';
import { Character, ScriptSegment } from './types';
import { DEFAULT_CHARACTERS, SAMPLE_SCRIPTS, VOICE_PRESETS } from './constants/presets';
import { getAudioContext, generateSpeechAudio } from './utils/audioEngine';
import { concatenateAudioBuffers } from './utils/audioEncoder';

export default function App() {
  const [characters, setCharacters] = useState<Character[]>(DEFAULT_CHARACTERS);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(DEFAULT_CHARACTERS[0].id);
  const [rawScript, setRawScript] = useState<string>(SAMPLE_SCRIPTS[0].rawScript);
  const [segments, setSegments] = useState<ScriptSegment[]>([]);
  const [voiceMode, setVoiceMode] = useState<'single' | 'multi'>('multi');
  const [ttsModel, setTtsModel] = useState<'gemini-3.8-flash-tts' | 'gemini-3.8-flash-lite-tts'>('gemini-3.8-flash-tts');

  // Player & Timeline state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [playingSingleId, setPlayingSingleId] = useState<string | null>(null);
  const [isGeneratingAny, setIsGeneratingAny] = useState<boolean>(false);

  // Modals
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isTranslateOpen, setIsTranslateOpen] = useState<boolean>(false);

  // Web Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const playbackStartTimeRef = useRef<number>(0);
  const playbackOffsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Initialize Audio Nodes
  useEffect(() => {
    const ctx = getAudioContext();
    audioContextRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 1.0;
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);
    masterGainRef.current = masterGain;

    // Parse initial sample script
    parseScriptText(SAMPLE_SCRIPTS[0].rawScript, DEFAULT_CHARACTERS);

    return () => {
      stopPlayback();
    };
  }, []);

  // Compute total duration of ready segments + pauses
  const totalDuration = useMemo(() => {
    let dur = 0;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const char = characters.find((c) => c.id === seg.characterId);
      const segDuration = seg.duration || 2.0;
      dur += segDuration;
      if (i < segments.length - 1) {
        dur += char ? char.pauseAfter : 0.35;
      }
    }
    return Math.max(0, dur);
  }, [segments, characters]);

  // Parse raw script text into dialogue segments with intelligent multi-speaker alternation
  const parseScriptText = (text: string, currentChars: Character[] = characters) => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const parsed: ScriptSegment[] = [];
    const updatedChars = [...currentChars];
    const hasColonFormat = lines.some((l) => /^[^:]{2,30}:\s*.+$/.test(l));

    lines.forEach((line, idx) => {
      // Check for "Speaker: Dialogue" pattern
      const colonMatch = line.match(/^([^:]{2,30}):\s*(.+)$/);
      let matchedChar: Character;

      if (colonMatch && voiceMode === 'multi') {
        const speakerName = colonMatch[1].trim();
        const dialogue = colonMatch[2].trim();

        // Find or create matching character
        const found = updatedChars.find(
          (c) => c.name.toLowerCase() === speakerName.toLowerCase()
        );

        if (found) {
          matchedChar = found;
        } else {
          const colorPalette = ['#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#a855f7', '#3b82f6'];
          const randomColor = colorPalette[updatedChars.length % colorPalette.length];
          const voicePool = VOICE_PRESETS.map((v) => v.id);
          const assignedVoice = voicePool[updatedChars.length % voicePool.length];

          matchedChar = {
            id: 'char-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            name: speakerName,
            color: randomColor,
            avatarIcon: 'Mic',
            voice: assignedVoice,
            language: 'en-US',
            speed: 1.0,
            pitch: 1.0,
            emotionalTone: 'Natural & Conversational',
            volume: 1.0,
            pauseAfter: 0.4,
          };
          updatedChars.push(matchedChar);
        }

        parsed.push({
          id: 'seg-' + Math.random().toString(36).substr(2, 9),
          characterId: matchedChar.id,
          text: dialogue,
          status: 'idle',
        });
      } else {
        // Dialogue line in single-narrator mode or plain paragraph:
        const lineText = colonMatch && voiceMode === 'single' ? colonMatch[2].trim() : line;
        const chosenChar = voiceMode === 'single'
          ? (updatedChars.find((c) => c.id === selectedCharacterId) || updatedChars[0] || characters[0])
          : (hasColonFormat
              ? (updatedChars[0] || characters[0])
              : updatedChars[idx % Math.max(1, updatedChars.length)]);

        parsed.push({
          id: 'seg-' + Math.random().toString(36).substr(2, 9),
          characterId: chosenChar?.id || 'char-1',
          text: lineText,
          status: 'idle',
        });
      }
    });

    setCharacters(updatedChars);
    setSegments(parsed);
  };

  // Set all script lines to a single character for 100% voice consistency
  const handleSetAllSegmentsToCharacter = (characterId: string) => {
    stopPlayback();
    setSegments((prev) =>
      prev.map((seg) => ({
        ...seg,
        characterId,
        status: 'idle',
        audioBuffer: undefined,
        audioUrl: undefined,
        duration: undefined,
      }))
    );
    setSelectedCharacterId(characterId);
    setVoiceMode('single');
  };

  // Randomize or alternate cast distribution across dialogue segments
  const handleShuffleCast = (mode: 'random' | 'alternate' = 'random') => {
    if (characters.length === 0 || segments.length === 0) return;
    stopPlayback();
    setVoiceMode('multi');

    let lastCharId: string | null = null;
    const shuffled = segments.map((seg, idx) => {
      let chosenCharId: string;
      if (mode === 'alternate') {
        chosenCharId = characters[idx % characters.length].id;
      } else {
        // Random selection avoiding consecutive duplicates when >= 2 characters
        let candidatePool = characters;
        if (characters.length > 1 && lastCharId) {
          candidatePool = characters.filter((c) => c.id !== lastCharId);
        }
        const randomIndex = Math.floor(Math.random() * candidatePool.length);
        chosenCharId = candidatePool[randomIndex].id;
      }
      lastCharId = chosenCharId;

      return {
        ...seg,
        characterId: chosenCharId,
        status: 'idle' as const,
        audioBuffer: undefined,
        audioUrl: undefined,
        duration: undefined,
      };
    });

    setSegments(shuffled);
  };

  // Stop all active audio playback
  const stopPlayback = () => {
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // Ignored if already ended
      }
    });
    activeSourcesRef.current = [];

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    setIsPlaying(false);
    setPlayingSingleId(null);
  };

  // Play / Pause Master
  const handleTogglePlay = async () => {
    if (isPlaying) {
      playbackOffsetRef.current = currentTime;
      stopPlayback();
      return;
    }

    const readySegments = segments.filter((s) => s.status === 'ready' && s.audioBuffer);
    if (readySegments.length === 0) {
      // Trigger generate all first
      await handleGenerateAll();
      return;
    }

    const ctx = audioContextRef.current || getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    stopPlayback();

    // Map out timeline timestamps for each segment
    let accumulatedTime = 0;
    const segmentTimeline: { seg: ScriptSegment; start: number; end: number }[] = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const char = characters.find((c) => c.id === seg.characterId);
      const dur = seg.audioBuffer ? seg.audioBuffer.duration : 1.5;
      const start = accumulatedTime;
      const end = start + dur;
      segmentTimeline.push({ seg, start, end });

      accumulatedTime = end + (char ? char.pauseAfter : 0.35);
    }

    const currentOffset = currentTime >= totalDuration ? 0 : currentTime;
    playbackOffsetRef.current = currentOffset;
    playbackStartTimeRef.current = ctx.currentTime;

    // Schedule audio buffer sources
    const newSources: AudioBufferSourceNode[] = [];

    segmentTimeline.forEach(({ seg, start, end }) => {
      if (!seg.audioBuffer) return;
      if (end <= currentOffset) return; // already passed

      const source = ctx.createBufferSource();
      source.buffer = seg.audioBuffer;
      source.connect(masterGainRef.current!);

      const timeUntilStart = Math.max(0, start - currentOffset);
      const bufferOffset = currentOffset > start ? currentOffset - start : 0;
      const durationToPlay = seg.audioBuffer.duration - bufferOffset;

      if (durationToPlay > 0) {
        source.start(ctx.currentTime + timeUntilStart, bufferOffset, durationToPlay);
        newSources.push(source);
      }
    });

    activeSourcesRef.current = newSources;
    setIsPlaying(true);

    // Timeline tracker tick
    const updateTick = () => {
      const elapsed = ctx.currentTime - playbackStartTimeRef.current + playbackOffsetRef.current;
      if (elapsed >= totalDuration) {
        setCurrentTime(totalDuration);
        stopPlayback();
        return;
      }

      setCurrentTime(elapsed);

      // Identify currently active segment
      const currentActive = segmentTimeline.find((t) => elapsed >= t.start && elapsed < t.end);
      if (currentActive && currentActive.seg.id !== activeSegmentId) {
        setActiveSegmentId(currentActive.seg.id);
      }

      animFrameRef.current = requestAnimationFrame(updateTick);
    };

    animFrameRef.current = requestAnimationFrame(updateTick);
  };

  // Seek Timeline
  const handleSeek = (targetTime: number) => {
    const wasPlaying = isPlaying;
    stopPlayback();
    setCurrentTime(targetTime);
    playbackOffsetRef.current = targetTime;

    if (wasPlaying) {
      setTimeout(() => {
        handleTogglePlay();
      }, 50);
    }
  };

  // Single Segment Playback
  const handlePlaySingleSegment = async (seg: ScriptSegment) => {
    if (playingSingleId === seg.id) {
      stopPlayback();
      return;
    }

    stopPlayback();
    const ctx = audioContextRef.current || getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    let buffer = seg.audioBuffer;
    if (!buffer) {
      // Generate on the fly
      const char = characters.find((c) => c.id === seg.characterId) || characters[0];
      const effectiveChar: Character = {
        ...char,
        emotionalTone: seg.emotionalToneOverride || char.emotionalTone,
        emotionIntensity: seg.emotionIntensityOverride ?? char.emotionIntensity ?? 0.85,
      };
      setSegments((prev) =>
        prev.map((s) => (s.id === seg.id ? { ...s, status: 'generating', errorMessage: undefined } : s))
      );

      try {
        const result = await generateSpeechAudio(seg.text, effectiveChar, {
          model: ttsModel,
          enhanceWithDSP: false,
        });
        const genBuffer = result.buffer;
        buffer = genBuffer;

        setSegments((prev) =>
          prev.map((s) =>
            s.id === seg.id
              ? {
                  ...s,
                  status: 'ready',
                  audioBuffer: genBuffer,
                  duration: genBuffer.duration,
                }
              : s
          )
        );
      } catch (err: unknown) {
        const error = err as Error;
        setSegments((prev) =>
          prev.map((s) =>
            s.id === seg.id
              ? { ...s, status: 'error', errorMessage: error.message || 'Generation failed' }
              : s
          )
        );
        return;
      }
    }

    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(masterGainRef.current!);
    source.start();

    activeSourcesRef.current = [source];
    setPlayingSingleId(seg.id);
    setActiveSegmentId(seg.id);

    source.onended = () => {
      setPlayingSingleId(null);
    };
  };

  // Generate Single Segment
  const handleGenerateSingleSegment = async (segmentId: string) => {
    const seg = segments.find((s) => s.id === segmentId);
    if (!seg) return;

    const char = characters.find((c) => c.id === seg.characterId) || characters[0];
    const effectiveChar: Character = {
      ...char,
      emotionalTone: seg.emotionalToneOverride || char.emotionalTone,
      emotionIntensity: seg.emotionIntensityOverride ?? char.emotionIntensity ?? 0.85,
    };

    setSegments((prev) =>
      prev.map((s) => (s.id === segmentId ? { ...s, status: 'generating', errorMessage: undefined } : s))
    );

    try {
      const { buffer } = await generateSpeechAudio(seg.text, effectiveChar, {
        model: ttsModel,
        enhanceWithDSP: false,
      });
      setSegments((prev) =>
        prev.map((s) =>
          s.id === segmentId
            ? {
                ...s,
                status: 'ready',
                audioBuffer: buffer,
                duration: buffer.duration,
              }
            : s
        )
      );
    } catch (err: unknown) {
      const error = err as Error;
      setSegments((prev) =>
        prev.map((s) =>
          s.id === segmentId
            ? { ...s, status: 'error', errorMessage: error.message || 'Generation failed' }
            : s
        )
      );
    }
  };

  // Generate All Voiceovers with rate-limiting pacing
  const handleGenerateAll = async () => {
    if (isGeneratingAny || segments.length === 0) return;
    setIsGeneratingAny(true);
    stopPlayback();

    const updatedSegments = [...segments];

    for (let i = 0; i < updatedSegments.length; i++) {
      const seg = updatedSegments[i];
      const char = characters.find((c) => c.id === seg.characterId) || characters[0];
      const effectiveChar: Character = {
        ...char,
        emotionalTone: seg.emotionalToneOverride || char.emotionalTone,
        emotionIntensity: seg.emotionIntensityOverride ?? char.emotionIntensity ?? 0.85,
      };

      setSegments((prev) =>
        prev.map((s) => (s.id === seg.id ? { ...s, status: 'generating', errorMessage: undefined } : s))
      );

      try {
        const { buffer } = await generateSpeechAudio(seg.text, effectiveChar, {
          model: ttsModel,
          enhanceWithDSP: false,
        });
        updatedSegments[i] = {
          ...seg,
          status: 'ready',
          audioBuffer: buffer,
          duration: buffer.duration,
        };

        setSegments([...updatedSegments]);
      } catch (err: unknown) {
        const error = err as Error;
        updatedSegments[i] = {
          ...seg,
          status: 'error',
          errorMessage: error.message || 'Failed',
        };
        setSegments([...updatedSegments]);
      }

      // Add courteous pacing delay between requests to stay within free-tier rate limits
      if (i < updatedSegments.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    setIsGeneratingAny(false);
  };

  // Character management handlers
  const handleAddCharacter = () => {
    const colorPalette = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
    const newChar: Character = {
      id: 'char-' + Date.now(),
      name: `Voice ${characters.length + 1}`,
      color: colorPalette[characters.length % colorPalette.length],
      avatarIcon: 'Mic',
      voice: VOICE_PRESETS[characters.length % VOICE_PRESETS.length].id,
      language: 'en-US',
      speed: 1.0,
      pitch: 1.0,
      emotionalTone: 'Warm & Friendly',
      volume: 1.0,
      pauseAfter: 0.4,
    };
    setCharacters([...characters, newChar]);
    setSelectedCharacterId(newChar.id);
  };

  const handleUpdateCharacter = (updated: Character) => {
    setCharacters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleDeleteCharacter = (id: string) => {
    if (characters.length <= 1) return;
    const remaining = characters.filter((c) => c.id !== id);
    setCharacters(remaining);
    setSelectedCharacterId(remaining[0].id);

    // Reassign segments belonging to deleted character
    setSegments((prev) =>
      prev.map((s) => (s.characterId === id ? { ...s, characterId: remaining[0].id, status: 'idle' } : s))
    );
  };

  // Apply multilingual translated script
  const handleApplyTranslatedScript = (translatedText: string, targetLanguageCode: string) => {
    setRawScript(translatedText);
    // Update active characters' language
    setCharacters((prev) =>
      prev.map((c) => ({
        ...c,
        language: targetLanguageCode,
      }))
    );
    parseScriptText(translatedText, characters);
  };

  const hasAnyAudioReady = segments.some((s) => s.status === 'ready' && s.audioBuffer);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        onLoadSample={(script) => {
          setRawScript(script);
          parseScriptText(script);
        }}
        onOpenTranslate={() => setIsTranslateOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onGenerateAll={handleGenerateAll}
        isGeneratingAny={isGeneratingAny}
        hasAudio={hasAnyAudioReady}
        totalDuration={totalDuration}
      />

      {/* Main Studio Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Real-time Audio Previewer & Waveform (Prominently pinned at top of workstation) */}
        <AudioPlayerTimeline
          isPlaying={isPlaying}
          currentTime={currentTime}
          totalDuration={totalDuration}
          onPlay={handleTogglePlay}
          onPause={handleTogglePlay}
          onStop={() => {
            stopPlayback();
            setCurrentTime(0);
          }}
          onSeek={handleSeek}
          segments={segments}
          characters={characters}
          activeSegmentId={activeSegmentId}
          onSelectSegment={(id) => {
            setActiveSegmentId(id);
            const seg = segments.find((s) => s.id === id);
            if (seg) handlePlaySingleSegment(seg);
          }}
          analyserNode={analyserRef.current}
        />

        {/* 2-Column Audio Crafting Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Characters & Tonal Pitch/Speed Engine */}
          <div className="lg:col-span-5 space-y-6">
            <CharacterPanel
              characters={characters}
              selectedCharacterId={selectedCharacterId}
              onSelectCharacter={setSelectedCharacterId}
              onUpdateCharacter={handleUpdateCharacter}
              onAddCharacter={handleAddCharacter}
              onDeleteCharacter={handleDeleteCharacter}
              onApplyToAllSegments={handleSetAllSegmentsToCharacter}
              isAllSegmentsUsingActiveChar={segments.length > 0 && segments.every((s) => s.characterId === selectedCharacterId)}
              totalSegmentsCount={segments.length}
              ttsModel={ttsModel}
            />
          </div>

          {/* Right: Script Editor & Timeline Blocks */}
          <div className="lg:col-span-7 space-y-6">
            <ScriptEditor
              rawScript={rawScript}
              onRawScriptChange={setRawScript}
              segments={segments}
              characters={characters}
              onUpdateSegments={setSegments}
              onParseScript={() => parseScriptText(rawScript)}
              onShuffleCast={handleShuffleCast}
              voiceMode={voiceMode}
              onSetVoiceMode={setVoiceMode}
              onSetAllSegmentsToCharacter={handleSetAllSegmentsToCharacter}
              onGenerateSingleSegment={handleGenerateSingleSegment}
              onPlaySingleSegment={handlePlaySingleSegment}
              playingSegmentId={playingSingleId}
              activeSegmentId={activeSegmentId}
              ttsModel={ttsModel}
              onChangeTtsModel={setTtsModel}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        segments={segments}
        characters={characters}
        totalDuration={totalDuration}
      />

      <TranslateModal
        isOpen={isTranslateOpen}
        onClose={() => setIsTranslateOpen(false)}
        rawScript={rawScript}
        onApplyTranslatedScript={handleApplyTranslatedScript}
      />
    </div>
  );
}
