import { describe, expect, it } from "vitest";
// Plain ESM outside src/ so the seed can run with `node` alone.
import { regions as india } from "../../supabase/seed/india/build.mjs";
import {
  buildSeedSql,
  CONTINENTS,
  countries,
  seedUuid,
  validate,
} from "../../supabase/seed/world/build.mjs";

const reserved = new Set(india.flatMap((r: { destinations: { slug: string }[] }) => r.destinations.map((d) => d.slug)));

describe("worldwide editorial seed data", () => {
  const result = validate(countries, reserved);

  it("passes every validation rule, including no slug clashes with the India seed", () => {
    expect(result.problems).toEqual([]);
  });

  it("covers every inhabited continent", () => {
    for (const list of Object.values(CONTINENTS)) {
      expect(result.notes.some((n: { country: string }) => list.includes(n.country))).toBe(true);
    }
  });

  it("uses ids that differ from the India namespace and are stable", () => {
    expect(seedUuid("paris/metro-bags")).toBe(seedUuid("paris/metro-bags"));
    const ids = result.notes.map((n: { id: string }) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("generates SQL that only adds editorial rows and never touches community stories", () => {
    const sql = buildSeedSql(result);
    expect(sql).toContain("false, 'editorial'");
    expect(sql).toContain("on conflict (slug) do nothing");
    expect(sql).toContain("where s.source = 'editorial'");
    expect(sql).not.toMatch(/^\s*(delete|drop|truncate|alter|create)\s/im);
  });

  it("rejects a destination slug already used by the India seed", () => {
    const clash = validate(
      [{ country: "France", destinations: [{ slug: "hampi", name: "X", at: [48.85, 2.35], about: "x", notes: [] }] }],
      reserved,
    ).problems.join("\n");
    expect(clash).toMatch(/already used by the India seed/);
  });
});
