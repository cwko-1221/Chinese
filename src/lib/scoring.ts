import { getJyutpingText } from "to-jyutping";

function normalize(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[，。！？、,.!?'"`\s]/g, "");
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[a.length][b.length];
}

export function speechScore(transcript: string, expected: string) {
  const a = normalize(transcript);
  const b = normalize(expected);
  
  if (!a || !b) return { correct: false, confidence: 0, score: 0 };
  if (a.includes(b) || b.includes(a)) return { correct: true, confidence: 0.95, score: 100 };

  const aJyutping = getJyutpingText(a);
  const bJyutping = getJyutpingText(b);

  const charDist = levenshtein(a, b);
  const charScore = Math.max(0, 1 - charDist / Math.max(a.length, b.length)) * 100;

  const jpDist = levenshtein(aJyutping, bJyutping);
  const jpScore = Math.max(0, 1 - jpDist / Math.max(aJyutping.length, bJyutping.length)) * 100;

  // Give partial credit if they ignore tones, by checking jyutping without numbers
  const aJpNoTone = aJyutping.replace(/\d/g, "");
  const bJpNoTone = bJyutping.replace(/\d/g, "");
  const jpNoToneDist = levenshtein(aJpNoTone, bJpNoTone);
  const jpNoToneScore = Math.max(0, 1 - jpNoToneDist / Math.max(aJpNoTone.length, bJpNoTone.length)) * 100 * 0.9; // 10% penalty for wrong tones

  const finalScore = Math.max(charScore, jpScore, jpNoToneScore);

  return { 
    correct: finalScore >= 75, // 75% similarity to pass
    confidence: finalScore / 100,
    score: Math.round(finalScore)
  };
}
