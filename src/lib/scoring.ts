function normalize(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[，。！？、,.!?'"`\s]/g, "");
}

export function speechScore(transcript: string, expected: string) {
  const a = normalize(transcript);
  const b = normalize(expected);
  if (!a || !b) return { correct: false, confidence: 0 };
  if (a.includes(b) || b.includes(a)) return { correct: true, confidence: 0.95 };
  return { correct: false, confidence: 0 };
}
