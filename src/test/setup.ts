import { vi } from "vitest";

// Unit tests run outside a Next.js request; connection() would throw there.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));
