declare module 'google-tts-api' {
  export interface AudioBase64Option {
    lang?: string;
    slow?: boolean;
    host?: string;
    timeout?: number;
    splitPunct?: string;
  }
  export function getAudioBase64(text: string, options?: AudioBase64Option): Promise<string>;
  export function getAllAudioBase64(
    text: string,
    options?: AudioBase64Option
  ): Promise<Array<{ base64: string; shortText: string }>>;
  export function getAudioUrl(text: string, options?: AudioBase64Option): string;
  export function getAllAudioUrls(
    text: string,
    options?: AudioBase64Option
  ): Array<{ url: string; shortText: string }>;
}
