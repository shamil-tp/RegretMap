import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

const files = sourceFiles(SRC).map((path) => ({ path, text: readFileSync(path, "utf8") }));
const clientFiles = files.filter((f) => /^\s*["']use client["']/.test(f.text));

describe("secret handling", () => {
  it("finds client components to check", () => {
    expect(clientFiles.length).toBeGreaterThan(0);
  });

  it("client components never reference server-only secrets or modules", () => {
    const forbidden = [
      /SUPABASE_SECRET_KEY/,
      /SERVICE_ROLE/i,
      /GEMINI_API_KEY/,
      /@\/lib\/supabase\/server/,
      /@\/lib\/data["']/,
    ];
    for (const file of clientFiles) {
      for (const pattern of forbidden) {
        expect(file.text, `${file.path} matches ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("no secret is exposed through a NEXT_PUBLIC_ variable", () => {
    for (const file of files) {
      expect(file.text, file.path).not.toMatch(/NEXT_PUBLIC_[A-Z_]*(SECRET|SERVICE_ROLE|GEMINI)/);
    }
  });

  it("the Supabase client module is server-only", () => {
    const server = files.find((f) => f.path.endsWith(join("supabase", "server.ts")));
    expect(server?.text).toMatch(/^import "server-only";/m);
  });
});
