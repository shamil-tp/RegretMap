/*
 * Server-side grounding checks applied to model output before anyone sees it.
 * The prompt asks the model to stay within the supplied stories; these checks
 * enforce the parts that can be verified mechanically, so a model that ignores
 * the prompt (or a tester trying to make it hallucinate) can't get unsupported
 * specifics through. Pure functions.
 */

/** Removes evidence references the model wrote into prose: "(S1)", "[S2, S3]", "S4". */
export function stripRefs(text: string) {
  return text
    .replace(/\s*[([]\s*S\d{1,2}(?:\s*(?:,|and|&)\s*S\d{1,2})*\s*[)\]]/g, "")
    .replace(/\bS\d{1,2}\b/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

const NUMBER = /\d+(?:[.,]\d+)*/g;

function numbersIn(text: string) {
  return (text.match(NUMBER) ?? []).map((n) => n.replace(/,/g, "").replace(/\.$/, ""));
}

/**
 * Numbers (prices, distances, times, years, percentages…) that appear in the
 * model's text but in none of the evidence texts. Any such number is a
 * fabricated specific, because the model may only restate the stories.
 */
export function unsupportedNumbers(text: string, evidence: string[]) {
  const allowed = new Set(evidence.flatMap(numbersIn));
  return numbersIn(text).filter((n) => !allowed.has(n));
}
