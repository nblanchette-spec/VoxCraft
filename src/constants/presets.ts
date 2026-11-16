import { VoicePresetMeta, SupportedLanguage, EmotionalTone, Character } from '../types';

export const VOICE_PRESETS: VoicePresetMeta[] = [
  {
    id: 'Kore',
    displayName: 'Kore',
    gender: 'Female',
    timbre: 'Warm, Expressive & Lifelike',
    description: 'Highly expressive, warm human delivery with rich emotive inflection and natural conversational nuance.',
    bestFor: 'Narratives, Explainer Videos, Commercials, Dynamic Audiobooks',
    defaultPitch: 1.0,
    sampleSentence: 'Welcome to VoxCraft. Every voice tells a unique, heartfelt story.',
    tags: ['Flagship Emotive', 'Warm', 'Lifelike', 'Top Pick'],
  },
  {
    id: 'Charon',
    displayName: 'Charon',
    gender: 'Male',
    timbre: 'Deep, Resonant & Cinematic',
    description: 'Commanding baritone with rich low frequencies, great for trailers and dramatic reads.',
    bestFor: 'Movie Trailers, Thrillers, Luxury Brands, Documentaries',
    defaultPitch: 0.9,
    sampleSentence: 'In a world where every word echoes forever, power speaks in silence.',
    tags: ['Deep', 'Cinematic', 'Authoritative', 'Resonant'],
  },
  {
    id: 'Puck',
    displayName: 'Puck',
    gender: 'Male',
    timbre: 'Energetic, Bright & Playful',
    description: 'Youthful, lively pace with dynamic inflections, ideal for gaming and commercials.',
    bestFor: 'YouTube, Gaming, Ad Promos, Kids Content',
    defaultPitch: 1.05,
    sampleSentence: 'Hey everyone, check this out! You won’t believe what just dropped!',
    tags: ['Energetic', 'Youthful', 'Dynamic', 'Upbeat'],
  },
  {
    id: 'Fenrir',
    displayName: 'Fenrir',
    gender: 'Male',
    timbre: 'Rugged, Confident & Intense',
    description: 'Gritty and authoritative delivery with grounded cadence.',
    bestFor: 'Action, Historical Epics, Sports, Motivation',
    defaultPitch: 0.95,
    sampleSentence: 'When the storm hits, only the determined remain standing.',
    tags: ['Rugged', 'Powerful', 'Grounded'],
  },
  {
    id: 'Aoede',
    displayName: 'Aoede',
    gender: 'Female',
    timbre: 'Melodic, Dramatic & Theatrical',
    description: 'Expressive storytelling actress with theatrical gravity and emotional depth.',
    bestFor: 'Fiction, Drama, Luxury Commercials, Bedtime Stories',
    defaultPitch: 1.0,
    sampleSentence: 'Beneath the calm canopy of stars, time seemed to stand completely still.',
    tags: ['Theatrical', 'Dramatic', 'Melodic'],
  },
  {
    id: 'Zephyr',
    displayName: 'Zephyr',
    gender: 'Neutral',
    timbre: 'Gentle, Breathy & Soothing',
    description: 'Relaxed, airy, and compassionate tone for gentle guidance and meditation.',
    bestFor: 'Meditation, ASMR, Sleep Stories, Wellness',
    defaultPitch: 1.0,
    sampleSentence: 'Take a deep breath in... and let all tension drift away.',
    tags: ['Calm', 'Soothing', 'ASMR', 'Airy'],
  },
  {
    id: 'Leda',
    displayName: 'Leda',
    gender: 'Female',
    timbre: 'Vibrant, Cheerful & Engaging',
    description: 'Upbeat, sparkling commercial voice with bright enthusiasm and clarity.',
    bestFor: 'Tech Promos, High-Energy Ads, Social Media, Podcasts',
    defaultPitch: 1.02,
    sampleSentence: 'Our groundbreaking architecture delivers unrivaled performance and precision.',
    tags: ['Vibrant', 'Commercial', 'Energetic'],
  },
  {
    id: 'Orus',
    displayName: 'Orus',
    gender: 'Male',
    timbre: 'Scholarly, Thoughtful & Measured',
    description: 'Inquisitive and wise cadence for educational and scientific voiceovers.',
    bestFor: 'Science Documentaries, Essays, Deep Dives',
    defaultPitch: 0.97,
    sampleSentence: 'To understand the universe, one must first explore the unseen quantum realm.',
    tags: ['Documentary', 'Scholarly', 'Measured'],
  },
];

export const ALL_GEMINI_VOICE_PRESETS: VoicePresetMeta[] = [
  ...VOICE_PRESETS,
  { id: 'Callirrhoe', displayName: 'Callirrhoe', gender: 'Female', timbre: 'Easy-going & Natural', description: 'Relaxed, effortless everyday female voice.', bestFor: 'Podcasts, Conversational Narration', defaultPitch: 1.0, sampleSentence: 'Let us take a closer look at how this comes together naturally.', tags: ['Extended', 'Natural'] },
  { id: 'Autonoe', displayName: 'Autonoe', gender: 'Female', timbre: 'Bright, Poised & Articulate', description: 'Crisp, intelligent professional female tone.', bestFor: 'Corporate, Presentations, Explainers', defaultPitch: 1.02, sampleSentence: 'Every milestone in this project brings measurable clarity to our roadmap.', tags: ['Extended', 'Professional'] },
  { id: 'Enceladus', displayName: 'Enceladus', gender: 'Male', timbre: 'Breathy, Soft-Spoken & Intimate', description: 'Close-mic gentle male whisper and calm tone.', bestFor: 'Meditation, ASMR, Intimate Storytelling', defaultPitch: 0.98, sampleSentence: 'Listen closely as the evening settles across the quiet valley.', tags: ['Extended', 'Soft'] },
  { id: 'Iapetus', displayName: 'Iapetus', gender: 'Male', timbre: 'Clear, Crisp & Neutral', description: 'Balanced, articulate male announcer voice.', bestFor: 'Tutorials, News, E-Learning', defaultPitch: 1.0, sampleSentence: 'Step by step, you can calibrate every layer of your mix with precision.', tags: ['Extended', 'Clear'] },
  { id: 'Umbriel', displayName: 'Umbriel', gender: 'Male', timbre: 'Easy-going & Warm Casual', description: 'Friendly, unhurried casual male voice.', bestFor: 'Podcasts, Lifestyle, Conversational Ads', defaultPitch: 0.96, sampleSentence: 'Sometimes the simplest conversation sparks the sharpest idea.', tags: ['Extended', 'Casual'] },
  { id: 'Algieba', displayName: 'Algieba', gender: 'Male', timbre: 'Smooth, Velvety & Rich', description: 'Polished, warm resonant male voice.', bestFor: 'Luxury Commercials, Audiobooks, Narration', defaultPitch: 0.94, sampleSentence: 'Crafted with timeless balance, every detail speaks for itself.', tags: ['Extended', 'Velvety'] },
  { id: 'Despina', displayName: 'Despina', gender: 'Female', timbre: 'Smooth, Fluid & Polished', description: 'Warm, velvety female commercial voice.', bestFor: 'Audiobooks, Brand Storytelling', defaultPitch: 1.0, sampleSentence: 'Smooth phrasing turns complex stories into effortless listening.', tags: ['Extended', 'Smooth'] },
  { id: 'Erinome', displayName: 'Erinome', gender: 'Female', timbre: 'Clear, Crisp & Direct', description: 'Direct, bright articulate female tone.', bestFor: 'News, Guides, Product Demos', defaultPitch: 1.02, sampleSentence: 'Here are the three key updates you need to know right now.', tags: ['Extended', 'Crisp'] },
  { id: 'Algenib', displayName: 'Algenib', gender: 'Male', timbre: 'Gravelly, Raspy & Textured', description: 'Weathered, gritty, character-rich male voice.', bestFor: 'Character Dialogue, Trailers, Noir', defaultPitch: 0.92, sampleSentence: 'Years on the open road leave their mark in every single word.', tags: ['Extended', 'Gravelly'] },
  { id: 'Rasalgethi', displayName: 'Rasalgethi', gender: 'Male', timbre: 'Informative & Everyday', description: 'Grounded, informative conversational male voice.', bestFor: 'Explainers, Tech Walkthroughs, News', defaultPitch: 0.99, sampleSentence: 'Let us walk through what changed under the hood in this release.', tags: ['Extended', 'Informative'] },
  { id: 'Laomedeia', displayName: 'Laomedeia', gender: 'Female', timbre: 'Upbeat, Lively & Dynamic', description: 'High-energy sparkling commercial female voice.', bestFor: 'Promos, Social Ads, YouTube', defaultPitch: 1.04, sampleSentence: 'Ready to bring bold, vibrant energy to your next launch?', tags: ['Extended', 'Upbeat'] },
  { id: 'Achernar', displayName: 'Achernar', gender: 'Female', timbre: 'Soft, Gentle & Delicate', description: 'Quiet, tender, delicate female voice.', bestFor: 'Wellness, Calm Fiction, Guided Rest', defaultPitch: 1.02, sampleSentence: 'Softly and gently, allow the story to unfold at its own pace.', tags: ['Extended', 'Gentle'] },
  { id: 'Alnilam', displayName: 'Alnilam', gender: 'Male', timbre: 'Firm, Deep & Grounded', description: 'Steady, deep, confident male voice.', bestFor: 'Documentaries, Corporate Authority', defaultPitch: 0.92, sampleSentence: 'Steady leadership begins with a clear voice and unwavering focus.', tags: ['Extended', 'Firm'] },
  { id: 'Schedar', displayName: 'Schedar', gender: 'Male', timbre: 'Even, Calm & Steady', description: 'Even-metered, calm analytical male tone.', bestFor: 'Training, Narration, Reports', defaultPitch: 0.98, sampleSentence: 'All systems are aligned and operating within nominal thresholds.', tags: ['Extended', 'Even'] },
  { id: 'Gacrux', displayName: 'Gacrux', gender: 'Female', timbre: 'Mature, Grounded & Rich Alto', description: 'Deeper, mature, authoritative female alto.', bestFor: 'Documentaries, Leadership, Drama', defaultPitch: 0.94, sampleSentence: 'History remembers the quiet determination behind every turning point.', tags: ['Extended', 'Alto'] },
  { id: 'Pulcherrima', displayName: 'Pulcherrima', gender: 'Female', timbre: 'Forward & Expressive', description: 'Animated, forward-projecting theatrical female voice.', bestFor: 'Storytelling, Trailers, Character Roles', defaultPitch: 1.02, sampleSentence: 'Wait until you hear what happened the moment the curtain rose!', tags: ['Extended', 'Expressive'] },
  { id: 'Achird', displayName: 'Achird', gender: 'Male', timbre: 'Friendly, Warm & Approachable', description: 'Youthful-adult friendly conversational male.', bestFor: 'Explainers, Friendly Brand Videos', defaultPitch: 1.01, sampleSentence: 'Hey there—let me show you how fast you can get started.', tags: ['Extended', 'Friendly'] },
  { id: 'Zubenelgenubi', displayName: 'Zubenelgenubi', gender: 'Male', timbre: 'Casual & Laid-Back', description: 'Relaxed, unhurried, conversational male tone.', bestFor: 'Podcasts, Vlogs, Casual Commentary', defaultPitch: 0.97, sampleSentence: 'Honestly, once you hear it side by side, the difference is clear.', tags: ['Extended', 'Laid-Back'] },
  { id: 'Vindemiatrix', displayName: 'Vindemiatrix', gender: 'Female', timbre: 'Gentle, Calm & Soothing', description: 'Soft, comforting, empathetic female voice.', bestFor: 'Audiobooks, Empathy, Gentle Narration', defaultPitch: 0.99, sampleSentence: 'Take your time—every thoughtful detail matters here.', tags: ['Extended', 'Soothing'] },
  { id: 'Sadachbia', displayName: 'Sadachbia', gender: 'Male', timbre: 'Lively & Animated', description: 'Expressive, quick-witted animated male tone.', bestFor: 'Entertainment, Promos, Comedy', defaultPitch: 1.03, sampleSentence: 'Wait a second—did that really just work on the very first take?', tags: ['Extended', 'Lively'] },
  { id: 'Sadaltager', displayName: 'Sadaltager', gender: 'Male', timbre: 'Knowledgeable & Mature', description: 'Warm, mature, trustworthy male mentor voice.', bestFor: 'History, Education, Documentaries', defaultPitch: 0.95, sampleSentence: 'Over decades of study, one timeless principle has always held true.', tags: ['Extended', 'Mature'] },
  { id: 'Sulafat', displayName: 'Sulafat', gender: 'Female', timbre: 'Warm, Rich & Resonant', description: 'Welcoming, resonant, emotionally full female voice.', bestFor: 'Storytelling, Hospitality, Brand Films', defaultPitch: 0.98, sampleSentence: 'Welcome home—where every sound feels warm, vivid, and alive.', tags: ['Extended', 'Resonant'] },
];

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en-US', name: 'English (US)', nativeName: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)', flag: '🇬🇧' },
  { code: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Español (España)', flag: '🇪🇸' },
  { code: 'es-MX', name: 'Spanish (Latin America)', nativeName: 'Español (LatAm)', flag: '🇲🇽' },
  { code: 'fr-FR', name: 'French (France)', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German (Germany)', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'it-IT', name: 'Italian (Italy)', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'hi-IN', name: 'Hindi (India)', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'zh-CN', name: 'Chinese (Mandarin)', nativeName: '中文 (简体)', flag: '🇨🇳' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'nl-NL', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'ru-RU', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'pl-PL', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'sv-SE', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'tr-TR', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
];

export const EMOTIONAL_TONES: {
  id: EmotionalTone;
  label: string;
  description: string;
  color: string;
  geminiPrompt: string;
  dspProfile: {
    bassBoostDb: number;
    trebleBoostDb: number;
    midPresenceDb: number;
    compressionRatio: number;
    reverbWet: number;
  };
}[] = [
  {
    id: 'Natural & Conversational',
    label: 'Conversational',
    description: 'Realistic everyday conversation with natural pauses and cadence.',
    color: 'emerald',
    geminiPrompt: 'Natural, articulate, and conversational speaking voice with effortless human pacing.',
    dspProfile: { bassBoostDb: 1, trebleBoostDb: 1, midPresenceDb: 0, compressionRatio: 2, reverbWet: 0.05 },
  },
  {
    id: 'Warm & Friendly',
    label: 'Warm & Friendly',
    description: 'Inviting, smiling acoustic warmth with gentle uplift.',
    color: 'amber',
    geminiPrompt: 'Warm, smiling, friendly voice, welcoming and sincere with genuine hospitality.',
    dspProfile: { bassBoostDb: 2.5, trebleBoostDb: 1.5, midPresenceDb: 1, compressionRatio: 2.5, reverbWet: 0.1 },
  },
  {
    id: 'Authoritative & Serious',
    label: 'Authoritative',
    description: 'Deep, firm, commanding broadcast timbre with steady authority.',
    color: 'blue',
    geminiPrompt: 'Serious, authoritative, commanding, and firm tone with deep resonance and conviction.',
    dspProfile: { bassBoostDb: 4, trebleBoostDb: 1, midPresenceDb: 2, compressionRatio: 4, reverbWet: 0.04 },
  },
  {
    id: 'Enthusiastic & High Energy',
    label: 'High Energy',
    description: 'Punchy, excited, promotional voiceover that grabs attention.',
    color: 'rose',
    geminiPrompt: 'High energy, enthusiastically excited and vibrant with rapid, punchy delivery.',
    dspProfile: { bassBoostDb: 1, trebleBoostDb: 3.5, midPresenceDb: 2.5, compressionRatio: 3.5, reverbWet: 0.08 },
  },
  {
    id: 'Dramatic & Cinematic Movie',
    label: 'Dramatic Movie',
    description: 'Epic theatrical gravity with spacious dynamic suspense.',
    color: 'purple',
    geminiPrompt: 'Dramatic, intense, cinematic movie trailer narrator voice, rich with suspense and gravity.',
    dspProfile: { bassBoostDb: 5, trebleBoostDb: 2, midPresenceDb: -1, compressionRatio: 4.5, reverbWet: 0.22 },
  },
  {
    id: 'Calm & Whispering / ASMR',
    label: 'Whisper / ASMR',
    description: 'Intimate, close-mic whisper with soft breath and gentle resonance.',
    color: 'teal',
    geminiPrompt: 'Whispering, soft, breathy, intimate ASMR voice, speaking close to the microphone in a soothing whisper.',
    dspProfile: { bassBoostDb: -1, trebleBoostDb: 4, midPresenceDb: -2, compressionRatio: 5, reverbWet: 0.15 },
  },
  {
    id: 'Professional News Anchor',
    label: 'News Anchor',
    description: 'Even-metered, objective, broadcast clarity.',
    color: 'cyan',
    geminiPrompt: 'Objective, clear, professional television news anchor delivering trusted headlines.',
    dspProfile: { bassBoostDb: 2, trebleBoostDb: 2, midPresenceDb: 1.5, compressionRatio: 3, reverbWet: 0.03 },
  },
  {
    id: 'Empathetic & Compassionate',
    label: 'Empathetic',
    description: 'Caring, heartfelt, understanding, and gently reassuring.',
    color: 'pink',
    geminiPrompt: 'Empathetic, compassionate, caring and understanding voice with heartfelt gentleness.',
    dspProfile: { bassBoostDb: 2, trebleBoostDb: 0.5, midPresenceDb: 1, compressionRatio: 2, reverbWet: 0.08 },
  },
  {
    id: 'Playful & Sarcastic',
    label: 'Playful / Witty',
    description: 'Wry smile, cheeky inflection, and witty cadence.',
    color: 'yellow',
    geminiPrompt: 'Playful, sarcastic, slightly witty and tongue-in-cheek delivery with expressive inflection.',
    dspProfile: { bassBoostDb: 0, trebleBoostDb: 2.5, midPresenceDb: 1, compressionRatio: 2.5, reverbWet: 0.06 },
  },
  {
    id: 'Educational & Explanatory',
    label: 'Educational',
    description: 'Patient, articulate, pedagogical flow that makes concepts easy to digest.',
    color: 'indigo',
    geminiPrompt: 'Clear, patient, educational documentary instructor explaining concepts with clarity.',
    dspProfile: { bassBoostDb: 1.5, trebleBoostDb: 2, midPresenceDb: 1, compressionRatio: 2.2, reverbWet: 0.04 },
  },
];

export const DEFAULT_CHARACTERS: Character[] = [
  {
    id: 'char-1',
    name: 'Narrator',
    color: '#3b82f6', // blue
    avatarIcon: 'Mic',
    voice: 'Kore',
    language: 'en-US',
    speed: 1.0,
    pitch: 1.0,
    emotionalTone: 'Warm & Friendly',
    emotionIntensity: 0.85,
    volume: 1.0,
    pauseAfter: 0.4,
  },
  {
    id: 'char-2',
    name: 'Commander Marcus',
    color: '#8b5cf6', // purple
    avatarIcon: 'Shield',
    voice: 'Charon',
    language: 'en-US',
    speed: 0.95,
    pitch: 0.92,
    emotionalTone: 'Dramatic & Cinematic Movie',
    emotionIntensity: 0.85,
    volume: 1.0,
    pauseAfter: 0.5,
  },
  {
    id: 'char-3',
    name: 'Dr. Evelyn Reed',
    color: '#10b981', // emerald
    avatarIcon: 'Sparkles',
    voice: 'Aoede',
    language: 'en-US',
    speed: 1.03,
    pitch: 1.02,
    emotionalTone: 'Enthusiastic & High Energy',
    emotionIntensity: 0.85,
    volume: 0.98,
    pauseAfter: 0.35,
  },
];

export const SAMPLE_SCRIPTS = [
  {
    id: 'sci-fi-trailer',
    title: 'Cinematic Sci-Fi Trailer',
    category: 'Trailers & Teasers',
    description: 'Multi-character dialogue with intense cinematic narration and dramatic pacing.',
    rawScript: `Narrator: Beyond the orbit of Neptune, an abandoned beacon pulsed with an unknown signal.
Commander Marcus: Initiate docking sequence. Whatever they left behind, we must bring it home before the storm hits.
Dr. Evelyn Reed: Marcus, wait! The telemetry isn't registering a dormant machine. It's breathing.
Narrator: This winter, discover the truth that lies between the stars.`,
  },
  {
    id: 'commercial-product',
    title: 'SaaS Product Showcase',
    category: 'Commercials & Ads',
    description: 'Upbeat, high-converting product promo with crisp value propositions.',
    rawScript: `Narrator: Imagine turning your raw ideas into broadcast-ready audio in seconds.
Dr. Evelyn Reed: With VoxCraft AI, studio-grade voice talent is right at your fingertips.
Narrator: Control emotional nuance, pitch, and tempo across eighteen languages.
Commander Marcus: Don't just tell your story. Make the world stop and listen. Try VoxCraft free today.`,
  },
  {
    id: 'mindful-meditation',
    title: 'Mindful Sleep Journey',
    category: 'Wellness & ASMR',
    description: 'Calm, gentle, and relaxing guided audio session.',
    rawScript: `Dr. Evelyn Reed: Gently close your eyes. Allow your shoulders to drop and release any tension you've carried today.
Dr. Evelyn Reed: Breathe in clarity... and exhale the noise of the day.
Narrator: You are safe, you are still, and peace surrounds you. Rest now.`,
  },
  {
    id: 'history-documentary',
    title: 'History Deep Dive',
    category: 'Documentaries',
    description: 'Deep, reflective, authoritative documentary narrative.',
    rawScript: `Commander Marcus: In the golden age of maritime exploration, maps ended at the edge of the known horizon with the words: Here be dragons.
Dr. Evelyn Reed: Yet it was not beasts they found, but cultures, trade routes, and knowledge that reshaped human destiny.
Narrator: Join us as we uncover the secrets of the ancient navigational maps.`,
  },
];
