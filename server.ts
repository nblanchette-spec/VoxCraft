import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = 3000;

const app = express();
app.use(express.json({ limit: '5mb' }));

// Initialize Gemini API client with required telemetry header
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const VALID_GEMINI_VOICES = [
  'Puck',
  'Charon',
  'Kore',
  'Fenrir',
  'Aoede',
  'Zephyr',
  'Leda',
  'Orus',
  'Callirrhoe',
  'Autonoe',
  'Enceladus',
  'Iapetus',
  'Umbriel',
  'Algieba',
  'Despina',
  'Erinome',
  'Algenib',
  'Rasalgethi',
  'Laomedeia',
  'Achernar',
  'Alnilam',
  'Schedar',
  'Gacrux',
  'Pulcherrima',
  'Achird',
  'Zubenelgenubi',
  'Vindemiatrix',
  'Sadachbia',
  'Sadaltager',
  'Sulafat',
] as const;

type GeminiTtsModel = 'gemini-3.8-flash-tts' | 'gemini-3.8-flash-lite-tts';

const VALID_TTS_MODELS: GeminiTtsModel[] = [
  'gemini-3.8-flash-tts',
  'gemini-3.8-flash-lite-tts',
];

const LANGUAGE_ACCENT_LABELS: Record<string, string> = {
  'en-US': 'American English',
  'en-GB': 'British English (UK accent)',
  'es-ES': 'Castilian Spanish (Spain)',
  'es-MX': 'Latin American Spanish (Mexico)',
  'fr-FR': 'French',
  'de-DE': 'German',
  'ja-JP': 'Japanese',
  'pt-BR': 'Brazilian Portuguese',
  'it-IT': 'Italian',
  'hi-IN': 'Hindi',
  'zh-CN': 'Mandarin Chinese',
  'ko-KR': 'Korean',
  'ar-SA': 'Arabic',
  'nl-NL': 'Dutch',
  'ru-RU': 'Russian',
  'pl-PL': 'Polish',
  'sv-SE': 'Swedish',
  'tr-TR': 'Turkish',
};

const TONE_STYLE_GUIDANCE: Record<string, string> = {
  'Natural & Conversational':
    'Natural, unforced, conversational speaking voice with authentic human cadence and gentle phrasing pauses',
  'Warm & Friendly':
    'Warm, smiling, inviting, and genuinely friendly voice filled with hospitality and approachable warmth',
  'Authoritative & Serious':
    'Serious, commanding, authoritative, and resolute tone with deep conviction and steady gravitas',
  'Enthusiastic & High Energy':
    'Highly enthusiastic, excited, vibrant, and energetic delivery bursting with upbeat momentum and bright vocal smiles',
  'Dramatic & Cinematic Movie':
    'Dramatic, intense, cinematic movie trailer narrator voice rich with suspense, emotional weight, and theatrical tension',
  'Calm & Whispering / ASMR':
    'Soft, breathy, intimate, close-mic ASMR whisper delivered gently with soothing calm',
  'Professional News Anchor':
    'Crisp, poised, objective television broadcast news anchor delivering headlines with clarity and authority',
  'Empathetic & Compassionate':
    'Deeply empathetic, tender, heartfelt, and compassionate voice with reassuring emotional warmth',
  'Playful & Sarcastic':
    'Playful, cheeky, witty, and slightly sarcastic delivery with expressive sly inflection and timing',
  'Educational & Explanatory':
    'Clear, patient, articulate documentary narrator explaining ideas with engaging curiosity and poise',
};

/**
 * Builds a rich natural-language acting directive for Gemini 3.8 TTS `speechMetadata.style`.
 */
function buildStyleDirective(params: {
  emotionalTone?: string;
  emotionIntensity?: number;
  stylePrompt?: string;
  speed?: number;
  pitch?: number;
  language?: string;
  skipPitchText?: boolean;
  skipSpeedText?: boolean;
}): string {
  const {
    emotionalTone = 'Natural & Conversational',
    emotionIntensity = 0.85,
    stylePrompt,
    speed = 1.0,
    pitch = 1.0,
    language = 'en-US',
    skipPitchText = false,
    skipSpeedText = false,
  } = params;

  const parts: string[] = [];

  // 1. Primary acting direction (user custom prompt takes priority, supplemented by tone archetype)
  const toneGuidance = TONE_STYLE_GUIDANCE[emotionalTone] || TONE_STYLE_GUIDANCE['Natural & Conversational'];
  const trimmedCustom = stylePrompt?.trim();
  if (trimmedCustom && trimmedCustom !== toneGuidance) {
    parts.push(`${trimmedCustom}.`);
    if (!trimmedCustom.toLowerCase().includes(emotionalTone.split(' ')[0].toLowerCase())) {
      parts.push(`Emotional tone: ${toneGuidance}.`);
    }
  } else {
    parts.push(`${toneGuidance}.`);
  }

  // 2. Emotional intensity calibration
  const intensity = Math.max(0.1, Math.min(1.0, Number(emotionIntensity) || 0.85));
  if (intensity <= 0.35) {
    parts.push('Keep emotional inflection subtle, understated, and restrained.');
  } else if (intensity <= 0.65) {
    parts.push('Deliver with balanced, natural emotional expression.');
  } else if (intensity <= 0.85) {
    parts.push('Deliver with vivid, expressive emotion and dynamic vocal variation.');
  } else {
    parts.push('Perform with deeply passionate, heightened emotional intensity and rich theatrical dynamic range.');
  }

  // 3. Pacing / Speed cue (omitted when handled via client WSOLA calibration)
  if (!skipSpeedText) {
    if (speed <= 0.78) {
      parts.push('Speak at a noticeably slow, deliberate, unhurried pace with dramatic pauses.');
    } else if (speed < 0.94) {
      parts.push('Speak at a measured, slightly slower, thoughtful pace.');
    } else if (speed >= 1.25) {
      parts.push('Speak at a fast, brisk, energetic pace.');
    } else if (speed > 1.06) {
      parts.push('Speak at a lively, slightly brisker upbeat pace.');
    }
  }

  // 4. Vocal register / Pitch cue (omitted when handled via client F0 WSOLA alignment)
  if (!skipPitchText) {
    if (pitch <= 0.85) {
      parts.push('Use a noticeably deeper, lower chest-voice vocal resonance.');
    } else if (pitch < 0.95) {
      parts.push('Use a slightly deeper, warmer lower vocal register.');
    } else if (pitch >= 1.15) {
      parts.push('Use a noticeably brighter, higher vocal pitch register.');
    } else if (pitch > 1.05) {
      parts.push('Use a slightly brighter, elevated vocal register.');
    }
  }

  // 5. Accent / Regional language cue
  if (language && language !== 'en-US') {
    const langLabel = LANGUAGE_ACCENT_LABELS[language] || language;
    parts.push(`Speak naturally in ${langLabel}.`);
  }

  return parts.join(' ');
}

/**
 * Ensures the returned audio is a valid RIFF/WAV buffer.
 * Gemini 3.8 unary generateContent returns a complete WAV file (audio/wav, 24kHz mono 16-bit),
 * while raw PCM (audio/l16) lacks a 44-byte RIFF header.
 */
function ensureWavBase64(base64Data: string, mimeType?: string): { audioBase64: string; mimeType: string } {
  const rawBuffer = Buffer.from(base64Data, 'base64');
  const hasRiffHeader =
    rawBuffer.length >= 12 &&
    rawBuffer.toString('ascii', 0, 4) === 'RIFF' &&
    rawBuffer.toString('ascii', 8, 12) === 'WAVE';

  if (hasRiffHeader) {
    return { audioBase64: base64Data, mimeType: 'audio/wav' };
  }

  // Wrap headerless 24kHz mono 16-bit PCM into a standard 44-byte RIFF/WAV header
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = rawBuffer.length;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (PCM)
  header.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  const wavBuffer = Buffer.concat([header, rawBuffer]);
  return {
    audioBase64: wavBuffer.toString('base64'),
    mimeType: mimeType && mimeType.includes('wav') ? mimeType : 'audio/wav',
  };
}

/**
 * Extracts HTTP status and user-friendly message from Gemini SDK errors.
 */
function formatGeminiError(err: unknown): { status: number; message: string } {
  const e = err as { status?: number; code?: number; message?: string };
  const msg = e?.message || 'Gemini API request failed.';
  const rawStatus = Number(e?.status || e?.code);

  if (rawStatus === 403 || /PERMISSION_DENIED/i.test(msg)) {
    return {
      status: 403,
      message: 'Gemini API permission denied. Please verify your GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (rawStatus === 400 && /API_KEY_INVALID/i.test(msg)) {
    return {
      status: 400,
      message: 'Invalid Gemini API key. Please check your GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (rawStatus === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(msg)) {
    return {
      status: 429,
      message:
        'Gemini TTS rate limit or daily free-tier quota reached. Try switching to 3.8 Flash Lite (Fast), wait briefly, or check billing/quota in Settings > Secrets.',
    };
  }
  if (rawStatus === 404 || /NOT_FOUND/i.test(msg)) {
    return {
      status: 404,
      message: `Requested Gemini model is unavailable: ${msg}`,
    };
  }
  if (rawStatus >= 400 && rawStatus < 600) {
    return { status: rawStatus, message: msg };
  }
  return { status: 500, message: msg };
}

/**
 * Synthesizes expressive speech via Gemini 3.8 TTS using `speechMetadata.style`.
 * Automatically falls back from `gemini-3.8-flash-tts` to `gemini-3.8-flash-lite-tts`
 * on 429 rate-limit / free-tier quota errors.
 */
async function synthesizeWithGeminiTTS(options: {
  text: string;
  voice?: string;
  model?: string;
  speed?: number;
  pitch?: number;
  emotionalTone?: string;
  emotionIntensity?: number;
  stylePrompt?: string;
  language?: string;
  skipPitchText?: boolean;
  skipSpeedText?: boolean;
}): Promise<{ audioBase64: string; mimeType: string; voice: string; model: GeminiTtsModel; styleDirective: string }> {
  if (!aiClient || !process.env.GEMINI_API_KEY) {
    const missingErr = new Error(
      'GEMINI_API_KEY is not configured. Please add your API key in Settings > Secrets.'
    ) as Error & { status?: number };
    missingErr.status = 400;
    throw missingErr;
  }

  const chosenVoice = VALID_GEMINI_VOICES.includes(options.voice as (typeof VALID_GEMINI_VOICES)[number])
    ? (options.voice as string)
    : 'Kore';

  const primaryModel: GeminiTtsModel = VALID_TTS_MODELS.includes(options.model as GeminiTtsModel)
    ? (options.model as GeminiTtsModel)
    : 'gemini-3.8-flash-tts';

  const modelsToTry: GeminiTtsModel[] =
    primaryModel === 'gemini-3.8-flash-tts'
      ? ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts']
      : ['gemini-3.8-flash-lite-tts'];

  const styleDirective = buildStyleDirective({
    emotionalTone: options.emotionalTone,
    emotionIntensity: options.emotionIntensity,
    stylePrompt: options.stylePrompt,
    speed: options.speed,
    pitch: options.pitch,
    language: options.language,
    skipPitchText: options.skipPitchText,
    skipSpeedText: options.skipSpeedText,
  });

  let lastErr: unknown = null;

  for (const activeModel of modelsToTry) {
    try {
      console.log(
        `[Gemini TTS] Model: ${activeModel} | Voice: ${chosenVoice} | Tone: ${options.emotionalTone || 'Default'} (${Math.round((options.emotionIntensity ?? 0.85) * 100)}%) | "${options.text.slice(0, 40)}..."`
      );

      const response = await aiClient.models.generateContent({
        model: activeModel,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: options.text.trim(),
                speechMetadata: {
                  style: styleDirective,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: chosenVoice },
            },
          },
        },
      });

      const candidate = response.candidates?.[0];
      const audioPart = candidate?.content?.parts?.find(
        (p: { inlineData?: { data?: string; mimeType?: string } }) => Boolean(p.inlineData?.data)
      );

      if (!audioPart?.inlineData?.data) {
        const textReply = candidate?.content?.parts?.find((p: { text?: string }) => p.text)?.text;
        throw new Error(
          textReply
            ? `Gemini TTS returned text instead of audio: ${textReply}`
            : 'Gemini TTS returned an empty audio response.'
        );
      }

      const normalized = ensureWavBase64(audioPart.inlineData.data, audioPart.inlineData.mimeType);

      return {
        audioBase64: normalized.audioBase64,
        mimeType: normalized.mimeType,
        voice: chosenVoice,
        model: activeModel,
        styleDirective,
      };
    } catch (err: unknown) {
      lastErr = err;
      const formatted = formatGeminiError(err);
      if (formatted.status === 429 && activeModel !== modelsToTry[modelsToTry.length - 1]) {
        console.warn(`[Gemini TTS] ${activeModel} returned 429, falling back to gemini-3.8-flash-lite-tts...`);
        continue;
      }
      throw err;
    }
  }

  throw lastErr || new Error('Gemini TTS request failed.');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Primary Gemini TTS Generation Endpoint
app.post('/api/tts/generate', async (req, res) => {
  try {
    const {
      text,
      voice = 'Kore',
      baseVoice,
      speed = 1.0,
      pitch = 1.0,
      emotionalTone = 'Natural & Conversational',
      emotionIntensity = 0.85,
      language = 'en-US',
      stylePrompt,
      model = 'gemini-3.8-flash-tts',
      skipPitchText = false,
      skipSpeedText = false,
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Text is required for TTS generation.' });
      return;
    }

    const effectiveVoice = voice || baseVoice || 'Kore';
    const result = await synthesizeWithGeminiTTS({
      text,
      voice: effectiveVoice,
      model,
      speed: Number(speed) || 1.0,
      pitch: Number(pitch) || 1.0,
      emotionalTone,
      emotionIntensity: Number(emotionIntensity) || 0.85,
      stylePrompt,
      language,
      skipPitchText: Boolean(skipPitchText),
      skipSpeedText: Boolean(skipSpeedText),
    });

    res.json({
      success: true,
      audioBase64: result.audioBase64,
      mimeType: result.mimeType,
      voice: result.voice,
      model: result.model,
      styleDirective: result.styleDirective,
      text,
    });
  } catch (error: unknown) {
    const { status, message } = formatGeminiError(error);
    console.error(`Gemini TTS error (${status}):`, message);
    res.status(status).json({ error: message });
  }
});

// AI Script Analysis & Character Extraction
app.post('/api/script/analyze', async (req, res) => {
  try {
    const { script } = req.body;
    if (!script || typeof script !== 'string') {
      res.status(400).json({ error: 'Script text is required.' });
      return;
    }

    if (!process.env.GEMINI_API_KEY || !aiClient) {
      res.json({
        fallback: true,
        message: 'No API key, using client-side heuristic parser.',
      });
      return;
    }

    const prompt = `You are an expert voiceover audio director and screenplay parser.
Analyze this script and return a clean JSON object with:
1. "detectedCharacters": array of distinct characters found. For each:
   - "name": character or speaker name (e.g. "Narrator", "Dr. Reed")
   - "gender": "Female", "Male", or "Neutral"
   - "suggestedVoice": one of ["Kore", "Charon", "Puck", "Fenrir", "Aoede", "Zephyr", "Leda", "Orus"]
   - "suggestedTone": one of ["Natural & Conversational", "Warm & Friendly", "Authoritative & Serious", "Enthusiastic & High Energy", "Dramatic & Cinematic Movie", "Calm & Whispering / ASMR", "Professional News Anchor", "Empathetic & Compassionate", "Playful & Sarcastic", "Educational & Explanatory"]
   - "suggestedPitch": number between 0.85 and 1.15
   - "suggestedSpeed": number between 0.85 and 1.2
2. "segments": array of dialogue lines in order:
   - "characterName": which character speaks this line
   - "text": the dialogue text without the speaker prefix or brackets

Script:
"""
${script}
"""

Respond with raw valid JSON only without markdown code blocks.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const rawJson = (response.text || '{}').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(rawJson || '{}');
    res.json({ success: true, data: parsed });
  } catch (error: unknown) {
    const { status, message } = formatGeminiError(error);
    console.error('Script analyze error:', message);
    res.status(status).json({ error: message });
  }
});

// Script Multilingual Translation Endpoint
app.post('/api/script/translate', async (req, res) => {
  try {
    const { script, targetLanguageCode, targetLanguageName } = req.body;
    if (!script || !targetLanguageName) {
      res.status(400).json({ error: 'Script and target language are required.' });
      return;
    }

    if (!process.env.GEMINI_API_KEY || !aiClient) {
      res.status(400).json({ error: 'Gemini API key is required for AI translation.' });
      return;
    }

    const prompt = `Translate this voice-over script into ${targetLanguageName} (${targetLanguageCode}).
IMPORTANT:
- Keep the character labels (e.g., "Narrator:", "Commander Marcus:") intact at the start of each line.
- Translate the spoken dialogue naturally, maintaining the emotional cadence, dramatic impact, and timing appropriate for a professional voice actor.
- Do not add commentary or introductory text. Return only the translated script lines.

Original script:
"""
${script}
"""`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
    });

    res.json({
      success: true,
      translatedScript: response.text?.trim() || script,
    });
  } catch (error: unknown) {
    const { status, message } = formatGeminiError(error);
    res.status(status).json({ error: message });
  }
});

// Return JSON for Express body-parser / API errors instead of HTML error pages
app.use('/api', (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const e = err as { status?: number; statusCode?: number; type?: string; message?: string };
  const status = e.status || e.statusCode || (e.type === 'entity.too.large' ? 413 : 500);
  const message =
    e.type === 'entity.too.large'
      ? 'Request payload is too large.'
      : e.message || 'Unexpected server error.';
  res.status(status).json({ error: message });
});

// Setup Vite or static serving
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VoxCraft Audio Server listening on port ${PORT}`);
  });
}

startServer();
