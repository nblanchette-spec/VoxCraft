import React, { useState } from 'react';
import { 
  X, Download, FileAudio, Check, Sliders, Music, Disc, 
  Layers, Sparkles, CheckCircle2, RefreshCw 
} from 'lucide-react';
import { Character, ScriptSegment, AudioExportOptions } from '../types';
import JSZip from 'jszip';
import { 
  audioBufferToWav, 
  audioBufferToMp3, 
  concatenateAudioBuffers 
} from '../utils/audioEncoder';
import { getAudioContext } from '../utils/audioEngine';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: ScriptSegment[];
  characters: Character[];
  totalDuration: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  segments,
  characters,
  totalDuration,
}) => {
  const [format, setFormat] = useState<'wav' | 'mp3'>('wav');
  const [mp3Bitrate, setMp3Bitrate] = useState<128 | 192 | 320>(320);
  const [silenceBetween, setSilenceBetween] = useState(0.35);
  const [normalizeAudio, setNormalizeAudio] = useState(true);
  const [exportMode, setExportMode] = useState<'master' | 'stems'>('master');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  // Filter ready segments with audio buffer
  const readySegments = segments.filter((s) => s.status === 'ready' && s.audioBuffer);

  const handleDownload = async () => {
    if (readySegments.length === 0) return;
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const ctx = getAudioContext();

      if (exportMode === 'master') {
        // Stitch all buffers
        const buffers = readySegments.map((s) => s.audioBuffer!);
        
        // Build per-segment silence map based on character pause settings
        const silenceMap: Record<number, number> = {};
        readySegments.forEach((seg, idx) => {
          const char = characters.find((c) => c.id === seg.characterId);
          silenceMap[idx] = char ? char.pauseAfter : silenceBetween;
        });

        const masterBuffer = concatenateAudioBuffers(ctx, buffers, silenceBetween, silenceMap);
        if (!masterBuffer) throw new Error('Could not stitch audio buffers');

        let blob: Blob;
        let ext = format;
        if (format === 'wav') {
          blob = audioBufferToWav(masterBuffer, normalizeAudio);
        } else {
          blob = audioBufferToMp3(masterBuffer, mp3Bitrate, normalizeAudio);
        }

        // Trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        a.download = `VoxCraft_Voiceover_Master_${timestamp}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      } else {
        // Export stems bundled into a single ZIP archive
        const zip = new JSZip();
        let manifestText = `VoxCraft Studio - Stem Export Manifest\n`;
        manifestText += `Export Date: ${new Date().toLocaleString()}\n`;
        manifestText += `Format: ${format.toUpperCase()}${format === 'mp3' ? ` (${mp3Bitrate} kbps)` : ' (16-bit PCM)'}\n`;
        manifestText += `Total Stems: ${readySegments.length}\n`;
        manifestText += `----------------------------------------\n\n`;

        for (let i = 0; i < readySegments.length; i++) {
          const seg = readySegments[i];
          const char = characters.find((c) => c.id === seg.characterId);
          const buf = seg.audioBuffer!;

          let blob: Blob;
          if (format === 'wav') {
            blob = audioBufferToWav(buf, normalizeAudio);
          } else {
            blob = audioBufferToMp3(buf, mp3Bitrate, normalizeAudio);
          }

          const cleanName = (char?.name || 'Speaker').replace(/[^a-zA-Z0-9_-]/g, '_');
          const cleanSnippet = seg.text.slice(0, 28).replace(/[^a-zA-Z0-9_-]/g, '_');
          const fileName = `${String(i + 1).padStart(2, '0')}_${cleanName}_${cleanSnippet}.${format}`;

          manifestText += `${String(i + 1).padStart(2, '0')}. File: ${fileName}\n`;
          manifestText += `    Speaker: ${char?.name || 'Speaker'} (Voice: ${char?.voice || 'Kore'}, Tone: ${char?.emotionalTone || 'Natural'})\n`;
          manifestText += `    Speed: ${char?.speed || 1.0}x | Pitch: ${char?.pitch || 1.0}\n`;
          manifestText += `    Duration: ${buf.duration.toFixed(2)}s\n`;
          manifestText += `    Dialogue: "${seg.text}"\n\n`;

          zip.file(fileName, blob);
        }

        zip.file('manifest.txt', manifestText);

        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        });

        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        a.download = `VoxCraft_Voiceover_Stems_${format.toUpperCase()}_${timestamp}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Estimate file size
  const estimateSize = () => {
    const dur = totalDuration || 10;
    if (format === 'wav') {
      // 44.1kHz * 16-bit * 2 channels = ~176.4 KB/s
      const bytes = dur * 44100 * 2 * 2;
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    } else {
      // MP3 bitrate in kbps -> (bitrate / 8) KB/s
      const kbps = mp3Bitrate;
      const bytes = (dur * (kbps * 1000)) / 8;
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <FileAudio className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Export Voice Over</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selector */}
        <div>
          <label className="text-xs font-semibold text-zinc-300 block mb-2">Select Output Format</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setFormat('wav')}
              className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                format === 'wav'
                  ? 'bg-amber-500/10 border-amber-500 text-white'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="font-bold text-sm text-zinc-100">WAV (PCM)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono">
                  Lossless
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                16-bit uncompressed studio master. Best for video editors, DAWs, and broadcast.
              </p>
            </button>

            <button
              onClick={() => setFormat('mp3')}
              className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                format === 'mp3'
                  ? 'bg-amber-500/10 border-amber-500 text-white'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="font-bold text-sm text-zinc-100">MP3 (LAME)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-400/20 text-sky-300 font-mono">
                  Compact
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                High-efficiency compressed audio. Ideal for podcast hosting, web, and mobile distribution.
              </p>
            </button>
          </div>
        </div>

        {/* MP3 Bitrate Options */}
        {format === 'mp3' && (
          <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 space-y-2">
            <label className="text-[11px] font-medium text-zinc-400 block">MP3 Bitrate (Quality)</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 128, label: '128 kbps', tag: 'Web' },
                { val: 192, label: '192 kbps', tag: 'Standard' },
                { val: 320, label: '320 kbps', tag: 'Ultra HQ' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setMp3Bitrate(opt.val as 128 | 192 | 320)}
                  className={`py-2 px-2.5 rounded-lg border text-xs font-mono font-medium transition ${
                    mp3Bitrate === opt.val
                      ? 'bg-zinc-800 border-amber-500 text-amber-300'
                      : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900'
                  }`}
                >
                  <div>{opt.label}</div>
                  <div className="text-[9px] text-zinc-500">{opt.tag}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Export Scope */}
        <div>
          <label className="text-xs font-semibold text-zinc-300 block mb-2">Export Scope</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setExportMode('master')}
              className={`p-2.5 rounded-xl border text-left text-xs transition ${
                exportMode === 'master'
                  ? 'bg-zinc-800 border-amber-500 text-white'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="font-semibold text-zinc-200">Full Voiceover Track</div>
              <div className="text-[10px] text-zinc-500">All lines stitched into single master audio</div>
            </button>

            <button
              onClick={() => setExportMode('stems')}
              className={`p-2.5 rounded-xl border text-left text-xs transition relative ${
                exportMode === 'stems'
                  ? 'bg-zinc-800 border-amber-500 text-white'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold text-zinc-200">Individual Stems</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-mono font-bold">
                  .ZIP
                </span>
              </div>
              <div className="text-[10px] text-zinc-400">All dialogue lines bundled into a single ZIP with manifest</div>
            </button>
          </div>
        </div>

        {/* Mastering Tweaks */}
        <div className="space-y-3 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
          <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
            <span>Peak Loudness Normalization (-0.5 dB)</span>
            <input
              type="checkbox"
              checked={normalizeAudio}
              onChange={(e) => setNormalizeAudio(e.target.checked)}
              className="accent-amber-400 w-4 h-4 cursor-pointer"
            />
          </label>
        </div>

        {/* Segments readiness notice */}
        {readySegments.length < segments.length && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2">
            <span>
              <strong>{readySegments.length} of {segments.length}</strong> lines are rendered. Only complete speech files will be included in the export (no corrupted or blank noise files).
            </span>
          </div>
        )}

        {/* Ready stats & trigger */}
        <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            <span>Ready: </span>
            <strong className="text-zinc-200">{readySegments.length} lines</strong>
            <span className="mx-2">•</span>
            <span>Est. Size: </span>
            <strong className="text-amber-400 font-mono">
              {exportMode === 'stems' ? `~${estimateSize()} (ZIP)` : estimateSize()}
            </strong>
          </div>

          <button
            onClick={handleDownload}
            disabled={isExporting || readySegments.length === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition shadow-lg ${
              readySegments.length === 0
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 shadow-amber-500/20 active:scale-95'
            }`}
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>
                  {exportMode === 'stems'
                    ? 'Creating ZIP Archive...'
                    : `Encoding ${format.toUpperCase()}...`}
                </span>
              </>
            ) : exportSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-zinc-950" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>
                  {exportMode === 'stems'
                    ? `Download Stems (.ZIP)`
                    : `Download ${format.toUpperCase()}`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
