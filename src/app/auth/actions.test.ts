import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  ip: 0,
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": `192.0.2.${++state.ip}`, origin: "http://localhost:3000" }),
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}));
vi.mock("@/lib/supabase/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/supabase/session")>()),
  createSessionClient: async () => ({
    auth: { signInWithPassword: state.signInWithPassword, signUp: state.signUp },
  }),
}));

const { signInAction, signUpAction } = await import("@/app/auth/actions");
const { isModeratorEmail } = await import("@/lib/supabase/session");

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};
const idle = { status: "idle" } as const;

beforeEach(() => {
  state.signInWithPassword.mockReset();
  state.signUp.mockReset();
});

describe("isModeratorEmail", () => {
  it("matches the allowlist case-insensitively and ignores blanks", () => {
    expect(isModeratorEmail("Mod@Example.com", " mod@example.com , other@x.io ,")).toBe(true);
    expect(isModeratorEmail("someone@example.com", "mod@example.com")).toBe(false);
    expect(isModeratorEmail("mod@example.com", "")).toBe(false);
    expect(isModeratorEmail(null, "mod@example.com")).toBe(false);
  });
});

describe("auth actions", () => {
  it("validates email and password before calling Supabase", async () => {
    expect(await signInAction(idle, form({ email: "nope", password: "longenough" }))).toMatchObject({ status: "error" });
    expect(await signInAction(idle, form({ email: "a@b.co", password: "short" }))).toMatchObject({
      status: "error",
      message: expect.stringMatching(/8 characters/),
    });
    expect(state.signInWithPassword).not.toHaveBeenCalled();
  });

  it("maps Supabase errors to friendly messages without leaking details", async () => {
    state.signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials", message: "Invalid login credentials" } });
    expect(await signInAction(idle, form({ email: "a@b.co", password: "password123" }))).toEqual({
      status: "error",
      message: "Email or password is incorrect.",
    });
    state.signInWithPassword.mockResolvedValue({ error: { code: "email_not_confirmed" } });
    expect(await signInAction(idle, form({ email: "a@b.co", password: "password123" }))).toMatchObject({
      message: expect.stringMatching(/confirm your email/),
    });
  });

  it("redirects only to a safe path after signing in", async () => {
    state.signInWithPassword.mockResolvedValue({ error: null });
    await expect(
      signInAction(idle, form({ email: "a@b.co", password: "password123", next: "https://evil.example" })),
    ).rejects.toThrow("REDIRECT:/account");
    await expect(
      signInAction(idle, form({ email: "a@b.co", password: "password123", next: "/destinations/manali" })),
    ).rejects.toThrow("REDIRECT:/destinations/manali");
  });

  it("asks new users to confirm their email, with a callback on this site", async () => {
    state.signUp.mockResolvedValue({ data: { session: null, user: {} }, error: null });
    expect(await signUpAction(idle, form({ email: "new@b.co", password: "password123" }))).toEqual({
      status: "check_email",
      email: "new@b.co",
    });
    expect(state.signUp.mock.calls[0][0].options.emailRedirectTo).toBe(
      "http://localhost:3000/auth/callback?next=%2Faccount",
    );
  });

  it("rate-limits repeated attempts from one IP", async () => {
    const fixed = new Headers({ "x-forwarded-for": "198.51.100.99", origin: "http://localhost:3000" });
    const headersModule = await import("next/headers");
    vi.spyOn(headersModule, "headers").mockImplementation(async () => fixed as never);
    state.signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials" } });
    const results = [];
    for (let i = 0; i < 11; i++) results.push(await signInAction(idle, form({ email: "a@b.co", password: "password123" })));
    expect(results.at(-1)).toMatchObject({ message: expect.stringMatching(/Too many attempts/) });
    expect(state.signInWithPassword).toHaveBeenCalledTimes(10);
  });
});
