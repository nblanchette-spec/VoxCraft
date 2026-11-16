import React from 'react';
import { Headphones, Globe, Download, RefreshCw, Wand2, BookOpen } from 'lucide-react';
import { SAMPLE_SCRIPTS } from '../constants/presets';

interface HeaderProps {
  onLoadSample: (script: string) => void;
  onOpenTranslate: () => void;
  onOpenExport: () => void;
  onGenerateAll: () => void;
  isGeneratingAny: boolean;
  hasAudio: boolean;
  totalDuration: number;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadSample,
  onOpenTranslate,
  onOpenExport,
  onGenerateAll,
  isGeneratingAny,
  hasAudio,
  totalDuration,
}) => {
  const [sampleMenuOpen, setSampleMenuOpen] = React.useState(false);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-900/90 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-6 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 p-0.5 shadow-lg shadow-amber-500/10 flex items-center justify-center">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <Headphones className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                VoxCraft <span className="text-amber-400 font-mono text-xs px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">STUDIO</span>
              </h1>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              AI Voice Over Generator • Pitch, Speed & Tone Control • Multilingual
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
          {/* Preset Sample Scripts */}
          <div className="relative">
            <button
              onClick={() => setSampleMenuOpen(!sampleMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800/90 text-zinc-300 hover:text-white hover:bg-zinc-700/80 border border-zinc-700/60 transition shadow-sm"
              title="Load demo scripts"
            >
              <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
              <span>Presets</span>
            </button>

            {sampleMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setSampleMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Sample Voiceover Scripts
                  </div>
                  {SAMPLE_SCRIPTS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        onLoadSample(s.rawScript);
                        setSampleMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-zinc-800 transition group flex flex-col gap-0.5"
                    >
                      <div className="flex items-center justify-between text-xs font-medium text-zinc-200 group-hover:text-amber-300">
                        <span>{s.title}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{s.category}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1">{s.description}</p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Multilingual Translate Button */}
          <button
            onClick={onOpenTranslate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800/90 text-zinc-300 hover:text-white hover:bg-zinc-700/80 border border-zinc-700/60 transition shadow-sm"
            title="Translate script into other languages"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Multilingual</span>
          </button>

          {/* Generate All Voiceovers */}
          <button
            onClick={onGenerateAll}
            disabled={isGeneratingAny}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition ${
              isGeneratingAny
                ? 'bg-amber-500/40 text-amber-200 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 shadow-amber-500/20 active:scale-95'
            }`}
          >
            {isGeneratingAny ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                <span>Generate Audio</span>
              </>
            )}
          </button>

          {/* Export Button */}
          <button
            onClick={onOpenExport}
            disabled={!hasAudio}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg border transition ${
              hasAudio
                ? 'bg-zinc-100 hover:bg-white text-zinc-950 border-white shadow-sm hover:shadow-amber-500/10'
                : 'bg-zinc-800/40 text-zinc-500 border-zinc-800 cursor-not-allowed'
            }`}
            title={hasAudio ? 'Export WAV or MP3 audio' : 'Generate voiceover audio first'}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
            {hasAudio && totalDuration > 0 && (
              <span className="font-mono text-[10px] bg-zinc-300 px-1.5 py-0.2 rounded text-zinc-900 ml-1">
                {formatDuration(totalDuration)}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
