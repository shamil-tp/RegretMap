import type { StoryPreview } from "@/lib/stories";

/**
 * DEMO DATA — illustrative examples written for development only.
 * These are not real community submissions and must never be presented as such.
 */
export const demoStories: StoryPreview[] = [
  {
    id: "demo-1",
    title: "I underestimated how long the drive up would take",
    destination: "Manali",
    region: "Himachal Pradesh, India",
    category: "transport",
    travelMonth: 5,
    body: "I planned to reach Manali by evening and do a short walk the same day. Traffic near the valley and a few slow stretches meant we arrived after dark, tired and with nothing booked for dinner.",
    lesson:
      "Keep the arrival day free and add a few hours of buffer to any road estimate in the hills.",
    isDemo: true,
  },
  {
    id: "demo-2",
    title: "Packed for sunshine, got a week of mist",
    destination: "Munnar",
    region: "Kerala, India",
    category: "weather",
    travelMonth: 7,
    body: "I visited during the monsoon expecting clear views of the tea estates. Most mornings were misty and the evenings were colder than I expected, and my shoes never fully dried.",
    lesson:
      "Bring a light rain jacket, quick-dry shoes, and a warm layer even if the forecast looks mild.",
    isDemo: true,
  },
  {
    id: "demo-3",
    title: "Midday sightseeing wore me out",
    destination: "Jaipur",
    region: "Rajasthan, India",
    category: "planning",
    travelMonth: 4,
    body: "I packed three forts into one afternoon. By the second one the heat had drained me and I rushed through it without really seeing anything.",
    lesson:
      "Start early, rest through the hottest hours, and pick fewer places per day.",
    isDemo: true,
  },
  {
    id: "demo-4",
    title: "I skipped acclimatisation and lost a day",
    destination: "Leh",
    region: "Ladakh, India",
    category: "activity",
    travelMonth: 6,
    body: "I flew in and went sightseeing the same afternoon. That night I had a headache and felt short of breath, so I spent the next day resting instead of exploring.",
    lesson:
      "Plan a full rest day after arriving at altitude, and follow medical advice rather than my own guesswork.",
    isDemo: true,
  },
  {
    id: "demo-5",
    title: "Cash ran out sooner than I expected",
    destination: "Varkala",
    region: "Kerala, India",
    category: "costs",
    travelMonth: 12,
    body: "Several small places along the cliff only took cash, and the nearest ATM I found had a long queue. I spent part of an evening just sorting out money.",
    lesson: "Carry some cash for small purchases and withdraw before you need it.",
    isDemo: true,
  },
  {
    id: "demo-6",
    title: "The steps were harder than the photos suggested",
    destination: "Jaipur",
    region: "Rajasthan, India",
    category: "accessibility",
    travelMonth: 11,
    body: "I travelled with my father, who uses a walking stick. Some sections had steep, uneven steps that we did not know about in advance, so we turned back halfway.",
    lesson:
      "Ask about step-free routes and rest points before visiting older monuments with family members who have limited mobility.",
    isDemo: true,
  },
];
