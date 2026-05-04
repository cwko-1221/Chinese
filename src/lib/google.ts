import textToSpeech from "@google-cloud/text-to-speech";
import speech from "@google-cloud/speech";
import { speechScore } from "@/lib/scoring";

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

export async function transcribeCantonese(audio: Buffer, expectedText: string) {
  const [response] = await sttClient().recognize({
    audio: { content: audio.toString("base64") },
    config: {
      languageCode: "yue-HK",
      enableAutomaticPunctuation: false,
      model: "default",
    },
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

