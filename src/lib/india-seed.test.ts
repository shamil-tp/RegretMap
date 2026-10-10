import { describe, expect, it } from "vitest";
// The seed lives outside src/ as plain ESM so it can run with `node` alone.
import {
  buildSeedSql,
  regions,
  seedUuid,
  STATES,
  validate,
} from "../../supabase/seed/india/build.mjs";

describe("India editorial seed data", () => {
  const result = validate(regions);

  it("passes every validation rule", () => {
    expect(result.problems).toEqual([]);
  });

  it("covers all 28 states with at least five notes each", () => {
    for (const state of STATES) {
      const count = result.notes.filter((n: { region: string }) => n.region === state).length;
      expect(count, state).toBeGreaterThanOrEqual(5);
    }
  });

  it("uses stable, unique ids derived from seed keys", () => {
    expect(seedUuid("hampi/river-crossing")).toBe(seedUuid("hampi/river-crossing"));
    expect(seedUuid("hampi/river-crossing")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    const ids = result.notes.map((n: { id: string }) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("generates SQL that marks every note editorial and never overwrites community rows", () => {
    const sql = buildSeedSql(result);
    expect(sql).toContain("'published', now() - make_interval(mins => v.ord), false, 'editorial'");
    expect(sql).toContain("on conflict (slug) do nothing");
    expect(sql).toContain("where s.source = 'editorial'");
    // Statements only (story text may contain words like "drop").
    expect(sql).not.toMatch(/^\s*(delete|drop|truncate|alter)\s/im);
    expect(sql).not.toMatch(/\bauthor_id\b|submission_key/);
  });

  it("flags problems in bad data", () => {
    const bad = validate([
      {
        region: "Kerala",
        kind: "state",
        destinations: [
          {
            slug: "Bad Slug",
            name: "Somewhere",
            at: [28.6, 77.2],
            about: "Wrong state coordinates.",
            notes: [
              {
                key: "a",
                cat: "nonsense",
                title: "Hi",
                place: "Here",
                at: [28.6, 77.2],
                body: "Too short",
                lesson: "Always plan ahead.",
              },
            ],
          },
        ],
      },
    ]).problems.join("\n");
    expect(bad).toMatch(/invalid slug/);
    expect(bad).toMatch(/outside Kerala/);
    expect(bad).toMatch(/unknown category/);
    expect(bad).toMatch(/title must be/);
    expect(bad).toMatch(/body must be/);
    expect(bad).toMatch(/always plan ahead/);
    expect(bad).toMatch(/State not covered: Assam/);
  });
});
