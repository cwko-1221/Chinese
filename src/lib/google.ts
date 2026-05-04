import textToSpeech from "@google-cloud/text-to-speech";
import speech, { protos } from "@google-cloud/speech";
import { speechScore } from "@/lib/scoring";

type SttAudioMetadata = {
  mimeType: string;
  sampleRateHertz?: number;
};

const audioEncoding = protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding;

export function isGoogleConfigured() {
  return !!(process.env.GOOGLE_CREDENTIALS_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

function googleClientOptions() {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    return { credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON) };
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return {};
  }

  throw new Error("Google Cloud credentials are not configured.");
}

let _ttsClient: InstanceType<typeof textToSpeech.TextToSpeechClient> | null = null;
let _sttClient: InstanceType<typeof speech.SpeechClient> | null = null;

function ttsClient() {
  if (!_ttsClient) _ttsClient = new textToSpeech.TextToSpeechClient({ ...googleClientOptions(), fallback: true });
  return _ttsClient;
}

function sttClient() {
  if (!_sttClient) _sttClient = new speech.SpeechClient({ ...googleClientOptions(), fallback: true });
  return _sttClient;
}

export async function synthesizeCantonese(text: string) {
  const [response] = await ttsClient().synthesizeSpeech({
    input: { text },
    voice: { languageCode: "yue-HK", ssmlGender: "FEMALE" },
    audioConfig: { audioEncoding: "MP3", speakingRate: 0.9 },
  });

  if (!response.audioContent) {
    throw new Error("Google TTS did not return audio.");
  }

  return Buffer.from(response.audioContent as Uint8Array);
}

function recognitionConfig({ mimeType, sampleRateHertz }: SttAudioMetadata) {
  const normalizedMimeType = mimeType.toLowerCase();
  const sampleRate = sampleRateHertz && sampleRateHertz > 0 ? sampleRateHertz : 48000;

  if (normalizedMimeType.includes("webm")) {
    return {
      encoding: audioEncoding.WEBM_OPUS,
      sampleRateHertz: sampleRate,
      languageCode: "yue-HK",
      enableAutomaticPunctuation: false,
      model: "default",
    };
  }

  if (normalizedMimeType.includes("ogg")) {
    return {
      encoding: audioEncoding.OGG_OPUS,
      sampleRateHertz: sampleRate,
      languageCode: "yue-HK",
      enableAutomaticPunctuation: false,
      model: "default",
    };
  }

  if (normalizedMimeType.includes("wav") || normalizedMimeType.includes("wave")) {
    return {
      encoding: audioEncoding.LINEAR16,
      sampleRateHertz: sampleRate,
      languageCode: "yue-HK",
      enableAutomaticPunctuation: false,
      model: "default",
    };
  }

  throw new Error("此瀏覽器的錄音格式未支援，請改用 Safari/Chrome 最新版本或使用自我評估。");
}

export async function transcribeCantonese(audio: Buffer, expectedText: string, metadata: SttAudioMetadata) {
  if (audio.length === 0) {
    throw new Error("錄音內容是空的，請重新錄音。");
  }

  const [response] = await sttClient().recognize({
    audio: { content: audio },
    config: recognitionConfig(metadata),
  });

  const best = response.results?.[0]?.alternatives?.[0];
  const transcript = best?.transcript ?? "";
  const score = speechScore(transcript, expectedText);
  return {
    ...score,
    transcript,
    confidence: best?.confidence ?? score.confidence,
  };
}
