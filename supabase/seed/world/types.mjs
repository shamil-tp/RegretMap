// JSDoc types for the worldwide editorial seed data. No runtime code.

/**
 * @typedef {import("../india/types.mjs").Note} Note
 *
 * @typedef {object} Destination
 * @property {string} slug  Must not clash with the India seed's slugs.
 * @property {string} name
 * @property {string} [region]  State, province or region, stored in destinations.region.
 * @property {[number, number]} at
 * @property {string} about
 * @property {Note[]} notes
 *
 * @typedef {object} Country
 * @property {string} country  Stored in destinations.country.
 * @property {Destination[]} destinations
 */

export {};
