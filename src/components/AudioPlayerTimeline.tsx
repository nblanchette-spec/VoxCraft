import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, Pause, Square, Volume2, VolumeX, RotateCcw, 
  Activity, Layers, Sparkles 
} from 'lucide-react';
import { Character, ScriptSegment } from '../types';

interface AudioPlayerTimelineProps {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  segments: ScriptSegment[];
  characters: Character[];
  activeSegmentId: string | null;
  onSelectSegment: (id: string) => void;
  analyserNode: AnalyserNode | null;
}

export const AudioPlayerTimeline: React.FC<AudioPlayerTimelineProps> = ({
  isPlaying,
  currentTime,
  totalDuration,
  onPlay,
  onPause,
  onStop,
  onSeek,
  segments,
  characters,
  activeSegmentId,
  onSelectSegment,
  analyserNode,
}) => {
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Time format helper (MM:SS.s)
  const formatTime = (timeInSec: number) => {
    const mins = Math.floor(timeInSec / 60);
    const secs = Math.floor(timeInSec % 60);
    const ms = Math.floor((timeInSec % 1) * 10);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}.${ms}`;
  };

  // Canvas visualizer animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Background subtle grid
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, width, height);

      const barCount = 72;
      const barWidth = (width / barCount) * 0.68;
      const gap = (width / barCount) * 0.32;

      if (isPlaying && analyserNode) {
        analyserNode.getByteFrequencyData(dataArray);
      }

      // Draw mirrored waveform bars
      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap);
        let barHeight = 6;

        if (isPlaying && analyserNode) {
          const index = Math.floor((i / barCount) * (bufferLength / 2));
          const val = dataArray[index] || 0;
          barHeight = Math.max(6, (val / 255) * (height * 0.85));
        } else {
          // Pre-computed undulating acoustic waveform preview
          const normalizedProgress = currentTime / Math.max(totalDuration, 1);
          const barProgress = i / barCount;
          const pseudoFreq = Math.sin(i * 0.28) * Math.cos(i * 0.12);
          const base = 12 + Math.abs(pseudoFreq) * (height * 0.35);
          barHeight = barProgress < normalizedProgress ? base * 1.15 : base * 0.7;
        }

        const y = (height - barHeight) / 2;
        const isPassed = (i / barCount) <= (currentTime / Math.max(totalDuration, 1));

        // Color gradient
        if (isPassed) {
          const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
          grad.addColorStop(0, '#fbbf24'); // amber-400
          grad.addColorStop(1, '#f97316'); // orange-500
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = '#27272a'; // zinc-800
        }

        // Rounded bar
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }

      // Playhead vertical line
      const playheadX = (currentTime / Math.max(totalDuration, 1)) * width;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(playheadX - 1, 0, 2, height);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, analyserNode, currentTime, totalDuration]);

  // Scrub click on visualizer
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * totalDuration);
  };

  const hasReadyAudio = segments.some((s) => s.status === 'ready' && s.audioBuffer);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-4">
      {/* Visualizer & Timeline Display */}
      <div className="relative group cursor-pointer" onClick={handleTimelineClick}>
        <canvas
          ref={canvasRef}
          width={800}
          height={76}
          className="w-full h-20 rounded-xl bg-zinc-950 border border-zinc-800/80 shadow-inner"
        />
        <div className="absolute inset-0 bg-transparent" />
      </div>

      {/* Segment Blocks Timeline Strip */}
      {segments.length > 0 && totalDuration > 0 && (
        <div className="relative w-full h-4 rounded-lg bg-zinc-950 overflow-hidden flex border border-zinc-800/80">
          {segments.map((seg) => {
            const char = characters.find((c) => c.id === seg.characterId);
            const duration = seg.duration || 1.5;
            const widthPercent = (duration / totalDuration) * 100;
            const isCurrent = activeSegmentId === seg.id;

            return (
              <div
                key={seg.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSegment(seg.id);
                }}
                className={`h-full relative group transition cursor-pointer ${
                  isCurrent ? 'ring-1 ring-white brightness-125' : 'opacity-80 hover:opacity-100'
                }`}
                style={{
                  width: `${Math.max(1, widthPercent)}%`,
                  backgroundColor: char?.color || '#3b82f6',
                }}
                title={`${char?.name}: ${seg.text}`}
              >
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition" />
              </div>
            );
          })}
        </div>
      )}

      {/* Playback Controls & Scrubber */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        {/* Main Transport Buttons */}
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <button
              onClick={onPause}
              disabled={!hasReadyAudio}
              className="p-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20 transition active:scale-95 disabled:opacity-40"
              title="Pause"
            >
              <Pause className="w-5 h-5 fill-current" />
            </button>
          ) : (
            <button
              onClick={onPlay}
              disabled={!hasReadyAudio}
              className="p-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20 transition active:scale-95 disabled:opacity-40"
              title="Play master audio preview"
            >
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </button>
          )}

          <button
            onClick={onStop}
            disabled={!hasReadyAudio}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition active:scale-95 disabled:opacity-40"
            title="Stop & Reset to beginning"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={() => onSeek(0)}
            disabled={!hasReadyAudio}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition active:scale-95 disabled:opacity-40"
            title="Return to start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Time Readout */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-amber-400 font-semibold px-2 py-1 rounded bg-zinc-950 border border-zinc-800">
            {formatTime(currentTime)}
          </span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400 font-medium px-2 py-1 rounded bg-zinc-950 border border-zinc-800">
            {formatTime(totalDuration)}
          </span>
        </div>

        {/* Audio Status & Volume */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-zinc-400 hover:text-zinc-200 transition"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              if (isMuted) setIsMuted(false);
            }}
            className="w-20 accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
