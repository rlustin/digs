import { runMigrations } from "../migrations";
import { expo } from "../client";

jest.mock("../client", () => ({
  expo: {
    getFirstSync: jest.fn(),
    execSync: jest.fn(),
  },
}));
const mockGetFirstSync = expo.getFirstSync as jest.MockedFunction<typeof expo.getFirstSync>;
const mockExecSync = expo.execSync as jest.MockedFunction<typeof expo.execSync>;

describe("runMigrations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("runs V1 and V2 when at version 0", () => {
    mockGetFirstSync.mockReturnValue({ user_version: 0 });

    runMigrations();

    const calls = mockExecSync.mock.calls.map((c: any[]) => c[0] as string);

    // V1 creates the tables
    expect(calls.some((sql: string) => sql.includes("CREATE TABLE IF NOT EXISTS folders"))).toBe(true);
    expect(calls.some((sql: string) => sql.includes("CREATE TABLE IF NOT EXISTS releases"))).toBe(true);

    // V2 drops and recreates triggers
    expect(calls.some((sql: string) => sql.includes("DROP TRIGGER IF EXISTS releases_ad"))).toBe(true);
    expect(calls.some((sql: string) => sql.includes("DROP TRIGGER IF EXISTS releases_au"))).toBe(true);
    expect(calls.some((sql: string) =>
      sql.includes("CREATE TRIGGER releases_ad") && sql.includes("json_each(old.artists)")
    )).toBe(true);

    // V2 rebuilds FTS index
    expect(calls.some((sql: string) => sql.includes("releases_fts") && sql.includes("rebuild"))).toBe(true);

    // Sets version to 3
    expect(calls.some((sql: string) => sql.includes("PRAGMA user_version = 3"))).toBe(true);
  });

  it("runs V2 and V3 when at version 1", () => {
    mockGetFirstSync.mockReturnValue({ user_version: 1 });

    runMigrations();

    const calls = mockExecSync.mock.calls.map((c: any[]) => c[0] as string);

    // Should NOT run V1 table creation
    expect(calls.some((sql: string) => sql.includes("CREATE TABLE IF NOT EXISTS folders"))).toBe(false);

    // Should run V2 trigger fixes
    expect(calls.some((sql: string) => sql.includes("DROP TRIGGER IF EXISTS releases_ad"))).toBe(true);

    // Should run V3 COALESCE triggers
    expect(calls.some((sql: string) =>
      sql.includes("CREATE TRIGGER releases_ai") && sql.includes("COALESCE")
    )).toBe(true);

    // Sets version to 3
    expect(calls.some((sql: string) => sql.includes("PRAGMA user_version = 3"))).toBe(true);
  });

  it("runs V3 when at version 2", () => {
    mockGetFirstSync.mockReturnValue({ user_version: 2 });

    runMigrations();

    const calls = mockExecSync.mock.calls.map((c: any[]) => c[0] as string);

    // Should NOT run V1 or V2
    expect(calls.some((sql: string) => sql.includes("CREATE TABLE IF NOT EXISTS folders"))).toBe(false);

    // V3: drops all three triggers and recreates with COALESCE
    expect(calls.some((sql: string) => sql.includes("DROP TRIGGER IF EXISTS releases_ai"))).toBe(true);
    expect(calls.some((sql: string) =>
      sql.includes("CREATE TRIGGER releases_ai") && sql.includes("COALESCE")
    )).toBe(true);
    expect(calls.some((sql: string) =>
      sql.includes("CREATE TRIGGER releases_ad") && sql.includes("COALESCE")
    )).toBe(true);
    expect(calls.some((sql: string) =>
      sql.includes("CREATE TRIGGER releases_au") && sql.includes("COALESCE")
    )).toBe(true);

    // FTS rebuild
    expect(calls.some((sql: string) => sql.includes("releases_fts") && sql.includes("rebuild"))).toBe(true);

    // Sets version to 3
    expect(calls.some((sql: string) => sql.includes("PRAGMA user_version = 3"))).toBe(true);
  });

  it("skips all migrations when already at version 3", () => {
    mockGetFirstSync.mockReturnValue({ user_version: 3 });

    runMigrations();

    // Only the PRAGMA read — no execSync calls
    expect(mockExecSync).not.toHaveBeenCalled();
  });
});
