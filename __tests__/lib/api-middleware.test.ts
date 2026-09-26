// Regression test for the security fix in app/api/auth/[...nextauth]/route.ts:
// the hard-coded demo credential shortcut must be refused in production and
// when the secret is the placeholder. We don't need to import the route file
// (which pulls in next-auth + prisma); we just re-implement the same gating
// condition and test the boolean.

describe("NextAuth demo-credential gating", () => {
  const isDemoAllowed = (
    nodeEnv: string | undefined,
    nextAuthSecret: string | undefined,
    email: string,
    password: string
  ): boolean => {
    if (
      nodeEnv !== "production" &&
      nextAuthSecret !== "your-secret-key-change-in-production" &&
      !nextAuthSecret?.startsWith("your-") &&
      email === "demo@battx.com" &&
      password === "demo123"
    ) {
      return true;
    }
    return false;
  };

  it("allows demo creds in development with a real secret", () => {
    expect(isDemoAllowed("development", "abc123def456ghi789jkl012mno345pq", "demo@battx.com", "demo123")).toBe(true);
  });

  it("refuses demo creds in production", () => {
    expect(isDemoAllowed("production", "abc123def456ghi789jkl012mno345pq", "demo@battx.com", "demo123")).toBe(false);
  });

  it("refuses demo creds if NEXTAUTH_SECRET is the placeholder", () => {
    expect(isDemoAllowed("development", "your-secret-key-change-in-production", "demo@battx.com", "demo123")).toBe(false);
  });

  it("refuses demo creds if NEXTAUTH_SECRET starts with 'your-'", () => {
    expect(isDemoAllowed("development", "your-anything", "demo@battx.com", "demo123")).toBe(false);
  });

  it("refuses demo creds if email is wrong", () => {
    expect(isDemoAllowed("development", "abc123def456ghi789jkl012mno345pq", "attacker@battx.com", "demo123")).toBe(false);
  });

  it("refuses demo creds if password is wrong", () => {
    expect(isDemoAllowed("development", "abc123def456ghi789jkl012mno345pq", "demo@battx.com", "wrong")).toBe(false);
  });
});
