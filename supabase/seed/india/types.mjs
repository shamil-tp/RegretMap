// JSDoc types for the India editorial seed data. No runtime code.

/**
 * @typedef {"transport" | "planning" | "weather" | "packing" | "activity" |
 *   "accessibility" | "safety" | "costs" | "local_customs" | "other"} Category
 *
 * @typedef {object} Note
 * @property {string} key    Stable id within the destination; never change it once seeded.
 * @property {Category} cat
 * @property {string} title
 * @property {string} place  Public place the note is about.
 * @property {[number, number]} at  [latitude, longitude] of that place.
 * @property {string} body
 * @property {string} [challenge]
 * @property {string} lesson
 * @property {string} [advice]
 * @property {number} [month]  Only when the note is inherently about one month.
 *
 * @typedef {object} Destination
 * @property {string} slug
 * @property {string} name
 * @property {[number, number]} at
 * @property {string} about
 * @property {Note[]} notes
 *
 * @typedef {object} Region
 * @property {string} region  State or Union Territory name, stored in destinations.region.
 * @property {"state" | "ut"} kind
 * @property {Destination[]} destinations
 */

export {};
