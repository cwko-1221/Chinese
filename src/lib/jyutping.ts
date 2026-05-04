import { getJyutping } from "to-jyutping";

export function jyutping(text: string) {
  return getJyutping(text.trim()).replace(/\s+/g, " ");
}

export function splitChars(text: string) {
  return Array.from(text.trim()).filter(Boolean);
}
