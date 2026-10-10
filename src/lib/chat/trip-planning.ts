/*
 * Fixed, server-written wording for broad trip-planning questions ("I want to
 * go to Dubai, give me full guidelines"). The chat can only relay what
 * travellers wrote, so these answers always state that scope first and point
 * to a human travel agency for a full plan. This text never comes from the
 * model, so it can't be altered or embellished.
 */

const PLANNING_PATTERN =
  /\b(plan|planning|itinerar\w*|guide|guidelines?|full details|everything|visa|visas|book|booking|package|tour|trip|i want to (go|visit|travel)|want to (go|visit|travel)|going to|travel to|how (do|can|should) i (go|get|travel|visit))\b/i;

/** True for questions asking for a plan, full guidance, visas or bookings. */
export function isTripPlanningRequest(question: string) {
  return PLANNING_PATTERN.test(question);
}

export function planningScopeNote(destinationName: string) {
  return `I can only share what travellers have posted on RegretMap about ${destinationName} — their real experiences and regrets — not a complete travel guide.`;
}

export const PLANNING_REFERRAL =
  "For a full trip plan, visa help or bookings, you can contact The Visa Guy, a travel agency that can plan your trip with you.";

/** Wraps an answer with the scope note and agency referral for planning questions. */
export function withPlanningNotes(question: string, destinationName: string, answer: string) {
  if (!isTripPlanningRequest(question)) return answer;
  return `${planningScopeNote(destinationName)}\n\n${answer}\n\n${PLANNING_REFERRAL}`;
}
