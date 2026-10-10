export const DESTINATION_ID = "5f0c2b7e-8a4d-4e6b-b1c2-3d4e5f6a7b8c";
export const SUBMISSION_KEY = "9d7f2a3b-1c4e-4f5a-8b6c-7d8e9f0a1b2c";

/** A valid raw submission, as the form would send it (all strings). */
export function validInput(overrides: Record<string, string | undefined> = {}) {
  const input: Record<string, string | undefined> = {
    locationType: "destination",
    destinationId: DESTINATION_ID,
    title: "The bus left earlier than listed",
    body: "I arrived at the stop ten minutes before the listed time and the last bus had already gone.",
    challenge: "I trusted an old timetable.",
    lesson: "Check departure times on the day.",
    advice: "Ask at the station the evening before you travel.",
    category: "transport",
    place: "",
    travelMonth: "",
    travelYear: "",
    latitude: "",
    longitude: "",
    consent: "on",
    submissionKey: SUBMISSION_KEY,
    website: "",
    ...overrides,
  };
  for (const key of Object.keys(input)) if (input[key] === undefined) delete input[key];
  return input;
}

export function toFormData(input: Record<string, string | undefined>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(input)) if (value !== undefined) formData.set(key, value);
  return formData;
}
