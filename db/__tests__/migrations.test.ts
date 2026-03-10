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

  it("runs V1 when at version 0", () => {
    mockGetFirstSync.mockReturnValue({ user_version: 0 });

    runMigrations();

    const calls = mockExecSync.mock.calls.map((c: any[]) => c[0] as string);

    // Creates the tables
    expect(calls.some((sql: string) => sql.includes("CREATE TABLE IF NOT EXISTS folders"))).toBe(true);
    expect(calls.some((sql: string) => sql.includes("CREATE TABLE IF NOT EXISTS releases"))).toBe(true);

    // Creates FTS5 virtual table
    expect(calls.some((sql: string) => sql.includes("CREATE VIRTUAL TABLE IF NOT EXISTS releases_fts"))).toBe(true);

    // Creates triggers with COALESCE and JSON extraction
    expect(calls.some((sql: string) =>
      sql.includes("CREATE TRIGGER") && sql.includes("releases_ai") && sql.includes("COALESCE")
    )).toBe(true);
    expect(calls.some((sql: string) =>
      sql.includes("CREATE TRIGGER") && sql.includes("releases_ad") && sql.includes("COALESCE")
    )).toBe(true);
    expect(calls.some((sql: string) =>
      sql.includes("CREATE TRIGGER") && sql.includes("releases_au") && sql.includes("COALESCE")
    )).toBe(true);

    // Sets version to 1
    expect(calls.some((sql: string) => sql.includes("PRAGMA user_version = 1"))).toBe(true);
  });

  it("skips all migrations when already at version 1", () => {
    mockGetFirstSync.mockReturnValue({ user_version: 1 });

    runMigrations();

    // Only the PRAGMA read — no execSync calls
    expect(mockExecSync).not.toHaveBeenCalled();
  });
});
