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
      /@\/lib\/submissions/,
      /@\/lib\/supabase\/admin/,
      /@\/lib\/rate-limit/,
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

  it("Supabase clients and the submission service are server-only", () => {
    for (const suffix of [
      join("supabase", "server.ts"),
      join("supabase", "admin.ts"),
      join("lib", "submissions.ts"),
      join("lib", "data.ts"),
      join("moderation", "gemini.ts"),
      join("ai", "gemini-client.ts"),
      join("recommendations", "service.ts"),
      join("moderation", "service.ts"),
    ]) {
      const file = files.find((f) => f.path.endsWith(suffix));
      expect(file?.text, suffix).toMatch(/^import "server-only";/m);
    }
  });

  it("only the submission, moderation and recommendation-cache services use the privileged client", () => {
    const users = files
      .filter((f) => f.text.includes("getSupabaseAdmin") && !f.path.endsWith(join("supabase", "admin.ts")))
      .map((f) => f.path.replaceAll("\\", "/"))
      .sort();
    expect(users).toEqual([
      expect.stringMatching(/lib\/moderation\/service\.ts$/),
      expect.stringMatching(/lib\/recommendations\/service\.ts$/),
      expect.stringMatching(/lib\/submissions\.ts$/),
    ]);
  });

  it("only the shared Gemini client reads Gemini API keys", () => {
    const readers = files
      .filter((f) => /GEMINI_API_KEY/.test(f.text))
      .map((f) => f.path.replaceAll("\\", "/"));
    expect(readers).toEqual([expect.stringMatching(/lib\/ai\/gemini-client\.ts$/)]);
  });
});
