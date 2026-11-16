import React, { useState } from 'react';
import { X, Globe, Sparkles, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../constants/presets';
import { Character, ScriptSegment } from '../types';

interface TranslateModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawScript: string;
  onApplyTranslatedScript: (translatedText: string, targetLanguageCode: string) => void;
}

export const TranslateModal: React.FC<TranslateModalProps> = ({
  isOpen,
  onClose,
  rawScript,
  onApplyTranslatedScript,
}) => {
  const [selectedLang, setSelectedLang] = useState('es-ES');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang) || SUPPORTED_LANGUAGES[0];

  const handleTranslate = async () => {
    setIsTranslating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/script/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: rawScript,
          targetLanguageCode: currentLangObj.code,
          targetLanguageName: currentLangObj.name,
        }),
      });

      const rawText = await res.text();
      let data: { translatedScript?: string; error?: string };
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Translation server error (HTTP ${res.status}).`);
      }

      if (!res.ok) {
        throw new Error(data.error || `Translation service failed (${res.status}).`);
      }

      if (data.translatedScript) {
        setTranslatedText(data.translatedScript);
      } else {
        throw new Error(data.error || 'No translation returned');
      }
    } catch (err: unknown) {
      const error = err as Error;
      // Fallback simple translation or notice
      setErrorMsg(error.message || 'Could not translate at this moment.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleApply = () => {
    if (translatedText) {
      onApplyTranslatedScript(translatedText, selectedLang);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">Multilingual Script Translation</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400">
          Translate your voiceover script while preserving speaker tags and dialogue flow, then generate natural multilingual speech.
        </p>

        {/* Target Language Selection */}
        <div>
          <label className="text-xs font-semibold text-zinc-300 block mb-2">Select Target Language</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-zinc-800 rounded-xl bg-zinc-950/60 scrollbar-thin">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = selectedLang === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLang(lang.code)}
                  className={`p-2 rounded-lg text-left text-xs transition border flex items-center gap-2 ${
                    isSelected
                      ? 'bg-sky-500/10 border-sky-400 text-white'
                      : 'border-zinc-850 hover:bg-zinc-800 text-zinc-400'
                  }`}
                >
                  <span className="text-base">{lang.flag}</span>
                  <div className="truncate">
                    <div className="font-medium text-zinc-200">{lang.name}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">{lang.nativeName}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Translation Preview Box */}
        {translatedText ? (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Translated Script ({currentLangObj.name})</span>
            </label>
            <textarea
              value={translatedText}
              onChange={(e) => setTranslatedText(e.target.value)}
              rows={6}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>
        ) : null}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <button
            onClick={handleTranslate}
            disabled={isTranslating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white transition disabled:opacity-40"
          >
            {isTranslating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                <span>Translating with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Translate to {currentLangObj.name}</span>
              </>
            )}
          </button>

          {translatedText && (
            <button
              onClick={handleApply}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-zinc-950 transition shadow-lg shadow-sky-500/20 active:scale-95"
            >
              <span>Apply to Voiceover Timeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
