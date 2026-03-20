import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mapStage, mapStatus, syncMatches } from "../sync-matches";

// ──────────────────────────────────────────────────────────────────────────────
// mapStage — uses the real implementation, no local duplicate
// ──────────────────────────────────────────────────────────────────────────────

describe("mapStage", () => {
  it("mapea GROUP_STAGE → GROUP", () => {
    expect(mapStage("GROUP_STAGE")).toBe("GROUP");
  });

  it("mapea ROUND_OF_32 → ROUND_OF_32", () => {
    expect(mapStage("ROUND_OF_32")).toBe("ROUND_OF_32");
  });

  it("mapea LAST_16 → ROUND_OF_16", () => {
    expect(mapStage("LAST_16")).toBe("ROUND_OF_16");
  });

  it("mapea QUARTER_FINALS → QUARTER_FINAL", () => {
    expect(mapStage("QUARTER_FINALS")).toBe("QUARTER_FINAL");
  });

  it("mapea SEMI_FINALS → SEMI_FINAL", () => {
    expect(mapStage("SEMI_FINALS")).toBe("SEMI_FINAL");
  });

  it("mapea FINAL → FINAL", () => {
    expect(mapStage("FINAL")).toBe("FINAL");
  });

  it("fallback a GROUP para stages desconocidos", () => {
    expect(mapStage("UNKNOWN_STAGE")).toBe("GROUP");
  });

  it("fallback a GROUP para string vacío", () => {
    expect(mapStage("")).toBe("GROUP");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// mapStatus — uses the real implementation, no local duplicate
// ──────────────────────────────────────────────────────────────────────────────

describe("mapStatus", () => {
  it("mapea SCHEDULED → SCHEDULED", () => {
    expect(mapStatus("SCHEDULED")).toBe("SCHEDULED");
  });

  it("mapea TIMED → SCHEDULED", () => {
    expect(mapStatus("TIMED")).toBe("SCHEDULED");
  });

  it("mapea IN_PLAY → LIVE", () => {
    expect(mapStatus("IN_PLAY")).toBe("LIVE");
  });

  it("mapea PAUSED → LIVE", () => {
    expect(mapStatus("PAUSED")).toBe("LIVE");
  });

  it("mapea FINISHED → FINISHED", () => {
    expect(mapStatus("FINISHED")).toBe("FINISHED");
  });

  it("mapea POSTPONED → POSTPONED", () => {
    expect(mapStatus("POSTPONED")).toBe("POSTPONED");
  });

  it("fallback a SCHEDULED para statuses desconocidos", () => {
    expect(mapStatus("CANCELLED")).toBe("SCHEDULED");
  });

  it("fallback a SCHEDULED para string vacío", () => {
    expect(mapStatus("")).toBe("SCHEDULED");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// syncMatches — integration-level unit tests with mocked fetch + Supabase
// ──────────────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

describe("syncMatches", () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = { FOOTBALL_DATA_API_KEY: process.env.FOOTBALL_DATA_API_KEY };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.FOOTBALL_DATA_API_KEY = savedEnv.FOOTBALL_DATA_API_KEY;
    vi.unstubAllGlobals();
  });

  // ── sin API key ────────────────────────────────────────────────────────────

  it("retorna error cuando FOOTBALL_DATA_API_KEY no está seteada", async () => {
    delete process.env.FOOTBALL_DATA_API_KEY;
    const result = await syncMatches();
    expect(result.error).toMatch(/FOOTBALL_DATA_API_KEY not set/);
    expect(result.synced).toBe(0);
    expect(result.calculated).toBe(0);
    expect(result.decayedTokens).toBe(0);
    expect(result.at).toBeDefined();
  });

  // ── API non-200 ────────────────────────────────────────────────────────────

  it("retorna error cuando football-data.org devuelve status no-200", async () => {
    process.env.FOOTBALL_DATA_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "Too Many Requests",
    }));
    const result = await syncMatches();
    expect(result.error).toMatch(/API error 429/);
    expect(result.synced).toBe(0);
  });

  // ── matches vacíos ─────────────────────────────────────────────────────────

  it("retorna ceros cuando la API devuelve matches vacío", async () => {
    process.env.FOOTBALL_DATA_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ matches: [] }),
    }));
    const result = await syncMatches();
    expect(result.synced).toBe(0);
    expect(result.error).toBeUndefined();
  });

  // ── error de upsert ────────────────────────────────────────────────────────

  it("retorna error cuando Supabase upsert falla", async () => {
    process.env.FOOTBALL_DATA_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        matches: [{
          id: 1, stage: "GROUP_STAGE", status: "SCHEDULED",
          utcDate: "2026-06-12T18:00:00Z",
          homeTeam: { name: "A", tla: "AAA" },
          awayTeam: { name: "B", tla: "BBB" },
          score: { fullTime: { home: null, away: null } },
        }],
      }),
    }));

    const mockUpsert = vi.fn().mockResolvedValue({ error: { message: "constraint violation" } });
    const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });
    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue({
      from: mockFrom,
      rpc: vi.fn(),
    } as unknown as ReturnType<typeof createAdminClient>);

    const result = await syncMatches();
    expect(result.error).toMatch(/constraint violation/);
    expect(result.synced).toBe(0);
  });

  // ── happy path ─────────────────────────────────────────────────────────────

  it("hace upsert y llama RPCs correctamente en el camino feliz", async () => {
    process.env.FOOTBALL_DATA_API_KEY = "test-key";

    const mockApiResponse = {
      matches: [
        {
          id: 101,
          stage: "GROUP_STAGE",
          status: "FINISHED",
          utcDate: "2026-06-12T18:00:00Z",
          homeTeam: { name: "Argentina", tla: "ARG" },
          awayTeam: { name: "Brasil", tla: "BRA" },
          score: { fullTime: { home: 2, away: 1 } },
          group: "Group A",
          venue: "MetLife Stadium",
        },
        {
          id: 102,
          stage: "FINAL",
          status: "SCHEDULED",
          utcDate: "2026-07-19T18:00:00Z",
          homeTeam: { name: "France", tla: "FRA" },
          awayTeam: { name: "England", tla: "ENG" },
          score: { fullTime: { home: null, away: null } },
          group: null,
          venue: null,
        },
      ],
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    }));

    const mockRpc = vi.fn()
      .mockResolvedValueOnce({ data: 3, error: null })  // calculate_match_points
      .mockResolvedValueOnce({ data: 0, error: null }); // decay_group_tokens

    const mockIs = vi.fn().mockResolvedValue({ data: [{ id: "uuid-101" }] });
    const mockEq = vi.fn().mockReturnValue({ is: mockIs });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert, select: mockSelect });

    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue({
      from: mockFrom,
      rpc: mockRpc,
    } as unknown as ReturnType<typeof createAdminClient>);

    const result = await syncMatches();

    // Conteos generales
    expect(result.synced).toBe(2);
    expect(result.calculated).toBe(3); // sum del valor devuelto por calculate_match_points
    expect(result.decayedTokens).toBe(0);
    expect(result.error).toBeUndefined();

    // Verificar mapeo de filas
    const upsertedRows = mockUpsert.mock.calls[0][0] as Record<string, unknown>[];
    expect(upsertedRows).toHaveLength(2);

    const row1 = upsertedRows[0];
    expect(row1.api_id).toBe("101");
    expect(row1.phase).toBe("GROUP");       // mapStage("GROUP_STAGE")
    expect(row1.status).toBe("FINISHED");   // mapStatus("FINISHED")
    expect(row1.home_score).toBe(2);
    expect(row1.away_score).toBe(1);
    expect(row1.group_name).toBe("Group A");
    expect(row1.venue).toBe("MetLife Stadium");

    const row2 = upsertedRows[1];
    expect(row2.api_id).toBe("102");
    expect(row2.phase).toBe("FINAL");       // mapStage("FINAL")
    expect(row2.status).toBe("SCHEDULED");  // mapStatus("SCHEDULED")
    expect(row2.home_score).toBeNull();
    expect(row2.away_score).toBeNull();
    expect(row2.group_name).toBeNull();
    expect(row2.venue).toBeNull();
  });
});
