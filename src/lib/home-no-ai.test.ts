import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/*
 * The home page (and the map explorer it renders) must not generate or fetch
 * destination-specific AI content: AI lessons and the chat belong on
 * destination pages, after a place is chosen.
 */
describe("home page has no AI", () => {
  const importsOf = (path: string) =>
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => /^\s*import\b|\bfrom "/.test(line))
      .join(" ");
  const imports = `${importsOf("src/app/page.tsx")} ${importsOf("src/components/explore-section.tsx")}`;

  it("doesn't import the AI client, recommendations or chat", () => {
    expect(imports).toContain("@/lib/data"); // sanity: we're reading the real imports
    expect(imports).not.toMatch(/@\/lib\/ai\/|recommendations|chat|before-you-go/i);
  });

  it("the destination page loads the chat lazily, not on render", () => {
    const destination = readFileSync("src/app/destinations/[slug]/page.tsx", "utf8");
    expect(destination).toContain("ChatLauncher");
    expect(destination).not.toMatch(/from "@\/components\/destination-chat"/);
  });
});
