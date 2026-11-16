import lamejs from 'lamejs';

/**
 * Encodes an AudioBuffer to a valid RIFF/WAVE PCM Blob.
 */
export function audioBufferToWav(buffer: AudioBuffer, normalize: boolean = false): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // Helper to write string to DataView
  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // RIFF Chunk Descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // ChunkSize
  writeString(8, 'WAVE');

  // fmt Subchunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample

  // data Subchunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true); // Subchunk2Size

  // Extract channel data
  const channels: Float32Array[] = [];
  let maxPeak = 0;
  for (let ch = 0; ch < numChannels; ch++) {
    const data = buffer.getChannelData(ch);
    channels.push(data);
    if (normalize) {
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > maxPeak) maxPeak = abs;
      }
    }
  }

  const gain = normalize && maxPeak > 0 ? Math.min(0.98 / maxPeak, 3.0) : 1.0;

  // Interleave channels & write 16-bit PCM
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channels[ch][i] * gain;
      // Clamp between -1 and 1
      sample = Math.max(-1, Math.min(1, sample));
      // Scale to 16-bit signed integer
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, Math.round(intSample), true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Encodes an AudioBuffer to high quality MP3 using lamejs.
 */
export function audioBufferToMp3(
  buffer: AudioBuffer,
  bitrate: 128 | 192 | 320 = 192,
  normalize: boolean = false
): Blob {
  const numChannels = Math.min(buffer.numberOfChannels, 2);
  const sampleRate = buffer.sampleRate;
  const encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, bitrate);

  // Peak normalization calculation
  let maxPeak = 0;
  if (normalize) {
    for (let ch = 0; ch < numChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > maxPeak) maxPeak = abs;
      }
    }
  }
  const gain = normalize && maxPeak > 0 ? Math.min(0.98 / maxPeak, 3.0) : 1.0;

  const leftFloat = buffer.getChannelData(0);
  const rightFloat = numChannels > 1 ? buffer.getChannelData(1) : leftFloat;

  const length = buffer.length;
  const leftInt = new Int16Array(length);
  const rightInt = new Int16Array(length);

  for (let i = 0; i < length; i++) {
    let sL = Math.max(-1, Math.min(1, leftFloat[i] * gain));
    leftInt[i] = sL < 0 ? Math.round(sL * 0x8000) : Math.round(sL * 0x7fff);

    if (numChannels > 1) {
      let sR = Math.max(-1, Math.min(1, rightFloat[i] * gain));
      rightInt[i] = sR < 0 ? Math.round(sR * 0x8000) : Math.round(sR * 0x7fff);
    }
  }

  const mp3Data: Uint8Array[] = [];
  const sampleBlockSize = 1152; // LAME standard frame size

  for (let i = 0; i < length; i += sampleBlockSize) {
    const leftChunk = leftInt.subarray(i, i + sampleBlockSize);
    let mp3buf: Int8Array;
    if (numChannels === 1) {
      mp3buf = encoder.encodeBuffer(leftChunk);
    } else {
      const rightChunk = rightInt.subarray(i, i + sampleBlockSize);
      mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
    }
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf.buffer, mp3buf.byteOffset, mp3buf.length));
    }
  }

  const endBuf = encoder.flush();
  if (endBuf.length > 0) {
    mp3Data.push(new Uint8Array(endBuf.buffer, endBuf.byteOffset, endBuf.length));
  }

  return new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mp3' });
}

/**
 * Concatenates multiple AudioBuffers with an optional silence gap between them.
 */
export function concatenateAudioBuffers(
  audioContext: AudioContext | BaseAudioContext,
  buffers: AudioBuffer[],
  silenceSeconds: number = 0.35,
  silenceMap?: Record<number, number>
): AudioBuffer | null {
  if (buffers.length === 0) return null;
  if (buffers.length === 1 && (!silenceMap || !silenceMap[0])) return buffers[0];

  const sampleRate = buffers[0].sampleRate;
  const numChannels = Math.max(...buffers.map((b) => b.numberOfChannels));

  // Compute total samples
  let totalSamples = 0;
  for (let i = 0; i < buffers.length; i++) {
    totalSamples += buffers[i].length;
    if (i < buffers.length - 1) {
      const gapSec = silenceMap && silenceMap[i] !== undefined ? silenceMap[i] : silenceSeconds;
      totalSamples += Math.floor(gapSec * sampleRate);
    }
  }

  const resultBuffer = audioContext.createBuffer(numChannels, totalSamples, sampleRate);

  let currentOffset = 0;
  for (let i = 0; i < buffers.length; i++) {
    const buf = buffers[i];
    for (let ch = 0; ch < numChannels; ch++) {
      const sourceChData = buf.getChannelData(Math.min(ch, buf.numberOfChannels - 1));
      resultBuffer.copyToChannel(sourceChData, ch, currentOffset);
    }
    currentOffset += buf.length;

    if (i < buffers.length - 1) {
      const gapSec = silenceMap && silenceMap[i] !== undefined ? silenceMap[i] : silenceSeconds;
      currentOffset += Math.floor(gapSec * sampleRate);
    }
  }

  return resultBuffer;
}

/**
 * Time-domain WSOLA time-stretcher that alters duration by `stretchFactor`
 * without altering vocal pitch, using correlation-aligned Hann-windowed grains.
 */
function wsolaTimeStretch(input: Float32Array, sampleRate: number, stretchFactor: number): Float32Array {
  if (Math.abs(stretchFactor - 1.0) < 0.01 || input.length < 2048) {
    return input;
  }

  const winSize = Math.round(sampleRate * 0.032); // 32ms window
  const synthesisHop = Math.max(64, Math.floor(winSize / 4)); // 75% overlap
  const analysisHop = Math.max(32, Math.round(synthesisHop / stretchFactor));
  const searchRadius = Math.round(sampleRate * 0.008); // +/-8ms pitch period alignment

  const hann = new Float32Array(winSize);
  for (let i = 0; i < winSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (winSize - 1)));
  }

  const outLen = Math.max(winSize, Math.round(input.length * stretchFactor));
  const output = new Float32Array(outLen);
  const norm = new Float32Array(outLen);

  // Copy first window directly
  for (let i = 0; i < Math.min(winSize, input.length, outLen); i++) {
    output[i] += input[i] * hann[i];
    norm[i] += hann[i];
  }

  let inPos = analysisHop;
  let outPos = synthesisHop;

  while (outPos + winSize < outLen && inPos + winSize < input.length) {
    // Search best phase-aligned offset around nominal inPos
    let bestOffset = 0;
    let bestCorr = -Infinity;
    const overlapLen = winSize - synthesisHop;
    const minOff = Math.max(-searchRadius, -inPos);
    const maxOff = Math.min(searchRadius, input.length - winSize - inPos);

    for (let off = minOff; off <= maxOff; off += 2) {
      let corr = 0;
      const candStart = inPos + off;
      for (let i = 0; i < overlapLen; i += 2) {
        corr += output[outPos + i] * input[candStart + i];
      }
      if (corr > bestCorr) {
        bestCorr = corr;
        bestOffset = off;
      }
    }

    const alignedStart = inPos + bestOffset;
    for (let i = 0; i < winSize; i++) {
      output[outPos + i] += input[alignedStart + i] * hann[i];
      norm[outPos + i] += hann[i];
    }

    inPos += analysisHop;
    outPos += synthesisHop;
  }

  for (let i = 0; i < outLen; i++) {
    if (norm[i] > 1e-4) {
      output[i] /= norm[i];
    }
  }

  return output;
}

/**
 * Applies studio DSP tone shaping, independent pitch alignment & speed scaling,
 * and optional dynamics processing using WSOLA + OfflineAudioContext.
 */
export async function processAudioWithDSP(
  inputBuffer: AudioBuffer,
  options: {
    speed?: number; // 0.5 to 2.0
    pitch?: number; // pitch ratio e.g. 0.8 to 1.3
    bassBoostDb?: number; // -12 to +12
    trebleBoostDb?: number; // -12 to +12
    midPresenceDb?: number; // -12 to +12
    reverbWet?: number; // 0 to 0.4
    compression?: boolean;
    volume?: number;
  }
): Promise<AudioBuffer> {
  const speed = Math.max(0.6, Math.min(1.6, options.speed ?? 1.0));
  const pitchRatio = Math.max(0.75, Math.min(1.35, options.pitch ?? 1.0));
  const bassDb = options.bassBoostDb ?? 0;
  const trebleDb = options.trebleBoostDb ?? 0;
  const midDb = options.midPresenceDb ?? 0;
  const reverbWet = options.reverbWet ?? 0;
  const volume = options.volume ?? 1.0;
  const useCompression = options.compression === true;

  const isBypassed =
    Math.abs(speed - 1.0) < 0.01 &&
    Math.abs(pitchRatio - 1.0) < 0.01 &&
    Math.abs(bassDb) < 0.05 &&
    Math.abs(trebleDb) < 0.05 &&
    Math.abs(midDb) < 0.05 &&
    reverbWet <= 0.01 &&
    Math.abs(volume - 1.0) < 0.01 &&
    !useCompression;

  if (isBypassed) {
    return inputBuffer;
  }

  const sampleRate = inputBuffer.sampleRate;

  // Use WSOLA to decouple pitch and speed cleanly:
  // Stretch buffer by (pitchRatio / speed), then resample at playbackRate = pitchRatio.
  // Net duration = original / speed, net pitch = pitchRatio.
  let workingBuffer = inputBuffer;
  const olaStretch = pitchRatio / speed;
  if (Math.abs(olaStretch - 1.0) >= 0.012) {
    const tempCtx = new OfflineAudioContext(
      inputBuffer.numberOfChannels,
      Math.max(1024, Math.ceil(inputBuffer.length * olaStretch)),
      sampleRate
    );
    const stretchedChannels: Float32Array[] = [];
    let stretchedLen = 0;
    for (let ch = 0; ch < inputBuffer.numberOfChannels; ch++) {
      const stretched = wsolaTimeStretch(inputBuffer.getChannelData(ch), sampleRate, olaStretch);
      stretchedChannels.push(stretched);
      stretchedLen = Math.max(stretchedLen, stretched.length);
    }
    workingBuffer = tempCtx.createBuffer(inputBuffer.numberOfChannels, stretchedLen, sampleRate);
    for (let ch = 0; ch < inputBuffer.numberOfChannels; ch++) {
      workingBuffer.getChannelData(ch).set(stretchedChannels[ch]);
    }
  }

  const tailSeconds = reverbWet > 0.05 ? 0.3 : 0.04;
  const effectiveDuration = workingBuffer.duration / pitchRatio + tailSeconds;
  const totalFrames = Math.ceil(effectiveDuration * sampleRate);

  const offlineCtx = new OfflineAudioContext(
    workingBuffer.numberOfChannels,
    Math.max(1024, totalFrames),
    sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = workingBuffer;
  source.playbackRate.value = pitchRatio;

  let lastNode: AudioNode = source;

  if (Math.abs(bassDb) >= 0.05) {
    const lowShelf = offlineCtx.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 180;
    lowShelf.gain.value = Math.max(-8, Math.min(8, bassDb));
    lastNode.connect(lowShelf);
    lastNode = lowShelf;
  }

  if (Math.abs(midDb) >= 0.05) {
    const midPeak = offlineCtx.createBiquadFilter();
    midPeak.type = 'peaking';
    midPeak.frequency.value = 1800;
    midPeak.Q.value = 1.0;
    midPeak.gain.value = Math.max(-6, Math.min(6, midDb));
    lastNode.connect(midPeak);
    lastNode = midPeak;
  }

  if (Math.abs(trebleDb) >= 0.05) {
    const highShelf = offlineCtx.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 5500;
    highShelf.gain.value = Math.max(-8, Math.min(8, trebleDb));
    lastNode.connect(highShelf);
    lastNode = highShelf;
  }

  if (reverbWet > 0.02) {
    const delay = offlineCtx.createDelay();
    delay.delayTime.value = 0.024;

    const delayFilter = offlineCtx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 3500;

    const wetGain = offlineCtx.createGain();
    wetGain.gain.value = Math.min(reverbWet * 0.3, 0.1);

    const dryGain = offlineCtx.createGain();
    dryGain.gain.value = 1.0;

    lastNode.connect(dryGain);
    lastNode.connect(delay);
    delay.connect(delayFilter);
    delayFilter.connect(wetGain);

    const merger = offlineCtx.createGain();
    dryGain.connect(merger);
    wetGain.connect(merger);
    lastNode = merger;
  }

  if (useCompression) {
    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 18;
    compressor.ratio.value = 2.0;
    compressor.attack.value = 0.015;
    compressor.release.value = 0.2;
    lastNode.connect(compressor);
    lastNode = compressor;
  }

  const masterGain = offlineCtx.createGain();
  masterGain.gain.value = volume;
  lastNode.connect(masterGain);
  masterGain.connect(offlineCtx.destination);

  source.start(0);

  return await offlineCtx.startRendering();
}
