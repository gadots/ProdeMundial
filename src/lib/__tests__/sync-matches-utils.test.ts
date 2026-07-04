import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mapStage, mapStatus, syncMatches, parseScore } from "../sync-matches";

// ──────────────────────────────────────────────────────────────────────────────
// parseScore — separa tiempo regular/ET del shootout de penales
// ──────────────────────────────────────────────────────────────────────────────

describe("parseScore", () => {
  it("partido normal: usa fullTime, sin penales", () => {
    expect(parseScore({ duration: "REGULAR", fullTime: { home: 2, away: 1 } })).toEqual({
      home: 2, away: 1, penaltyHome: null, penaltyAway: null,
    });
  });

  it("shootout con objeto penalties: fullTime es el empate del ET", () => {
    expect(parseScore({
      duration: "PENALTY_SHOOTOUT",
      fullTime: { home: 1, away: 1 },
      penalties: { home: 5, away: 3 },
    })).toEqual({ home: 1, away: 1, penaltyHome: 5, penaltyAway: 3 });
  });

  it("shootout sin objeto penalties: fullTime trae el shootout, ET desconocido", () => {
    expect(parseScore({
      duration: "PENALTY_SHOOTOUT",
      fullTime: { home: 5, away: 3 },
    })).toEqual({ home: null, away: null, penaltyHome: 5, penaltyAway: 3 });
  });

  it("empate de grupos no se confunde con penales", () => {
    expect(parseScore({ duration: "REGULAR", fullTime: { home: 1, away: 1 } })).toEqual({
      home: 1, away: 1, penaltyHome: null, penaltyAway: null,
    });
  });
});

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

  it("mapea LAST_32 (convención football-data 2026) → ROUND_OF_32", () => {
    expect(mapStage("LAST_32")).toBe("ROUND_OF_32");
  });

  it("mapea LAST_16 → ROUND_OF_16", () => {
    expect(mapStage("LAST_16")).toBe("ROUND_OF_16");
  });

  it("mapea ROUND_OF_16 → ROUND_OF_16", () => {
    expect(mapStage("ROUND_OF_16")).toBe("ROUND_OF_16");
  });

  it("mapea QUARTER_FINALS → QUARTER_FINAL", () => {
    expect(mapStage("QUARTER_FINALS")).toBe("QUARTER_FINAL");
  });

  it("mapea THIRD_PLACE → THIRD_PLACE", () => {
    expect(mapStage("THIRD_PLACE")).toBe("THIRD_PLACE");
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

  it("retorna error cuando football-data.org devuelve status no-200 (no reintentable)", async () => {
    process.env.FOOTBALL_DATA_API_KEY = "test-key";
    // 403 (p. ej. API key inválida) no es reintentable → vuelve de inmediato.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => "Forbidden",
    }));
    const result = await syncMatches();
    expect(result.error).toMatch(/API error 403/);
    expect(result.synced).toBe(0);
  });

  it("reintenta en 429 y devuelve error si persiste", async () => {
    process.env.FOOTBALL_DATA_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "Too Many Requests",
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();
    const promise = syncMatches();
    await vi.runAllTimersAsync();
    const result = await promise;
    vi.useRealTimers();
    expect(fetchMock).toHaveBeenCalledTimes(4); // 1 inicial + 3 reintentos
    expect(result.error).toMatch(/API error 429/);
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

  // ── fallback a request sin parámetros cuando el rango da 400 ─────────────────

  it("cae al request sin parámetros si football-data rechaza el rango con 400", async () => {
    process.env.FOOTBALL_DATA_API_KEY = "test-key";

    // 1er fetch (con dateFrom/dateTo) → 400; 2º fetch (pelado) → 200 con un partido.
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 400, text: async () => "Bad date range" })
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          matches: [{
            id: 201, stage: "GROUP_STAGE", status: "SCHEDULED",
            utcDate: "2026-06-13T18:00:00Z",
            homeTeam: { name: "C", tla: "CCC" },
            awayTeam: { name: "D", tla: "DDD" },
            score: { fullTime: { home: null, away: null } },
            group: "Group B",
          }],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const matchesChain: Record<string, unknown> = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    matchesChain.select = vi.fn(() => matchesChain);
    matchesChain.eq = vi.fn(() => matchesChain);
    matchesChain.is = vi.fn(() => Promise.resolve({ data: [] }));
    matchesChain.in = vi.fn(() => Promise.resolve({ data: [] }));

    const predsChain: Record<string, unknown> = {};
    predsChain.select = vi.fn(() => predsChain);
    predsChain.is = vi.fn(() => Promise.resolve({ data: [] }));

    const mockFrom = vi.fn((table: string) =>
      table === "predictions" ? predsChain : matchesChain
    );
    const mockRpc = vi.fn().mockResolvedValue({ data: 0, error: null }); // decay_group_tokens

    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue({
      from: mockFrom,
      rpc: mockRpc,
    } as unknown as ReturnType<typeof createAdminClient>);

    const result = await syncMatches();

    expect(fetchMock).toHaveBeenCalledTimes(2); // rango (400) + pelado (200)
    expect(result.synced).toBe(1);
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
    // El snapshot previo al upsert hace matches.select().in() → soportarlo.
    const matchesChain: Record<string, unknown> = { upsert: mockUpsert };
    matchesChain.select = vi.fn(() => matchesChain);
    matchesChain.in = vi.fn(() => Promise.resolve({ data: [] }));
    const mockFrom = vi.fn().mockReturnValue(matchesChain);
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

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });

    // matches: select().eq().is() → un partido FINISHED sin calcular.
    // También soporta .in() para la tercera query (no se usa en este caso).
    const matchesChain: Record<string, unknown> = {
      upsert: mockUpsert,
    };
    matchesChain.select = vi.fn(() => matchesChain);
    matchesChain.eq = vi.fn(() => matchesChain);
    matchesChain.is = vi.fn(() => Promise.resolve({ data: [{ id: "uuid-101" }] }));
    matchesChain.in = vi.fn(() => Promise.resolve({ data: [{ id: "uuid-101" }] }));

    // predictions: select().is() → sin predicciones pendientes (data vacía).
    const predsChain: Record<string, unknown> = {};
    predsChain.select = vi.fn(() => predsChain);
    predsChain.is = vi.fn(() => Promise.resolve({ data: [] }));

    const mockFrom = vi.fn((table: string) =>
      table === "predictions" ? predsChain : matchesChain
    );

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

  // ── corrección de marcador en partido ya FINISHED ───────────────────────────

  it("llama recalculate_all_points cuando un partido FINISHED corrige su marcador", async () => {
    process.env.FOOTBALL_DATA_API_KEY = "test-key";

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        matches: [{
          id: 101,
          stage: "GROUP_STAGE",
          status: "FINISHED",
          utcDate: "2026-06-12T18:00:00Z",
          homeTeam: { name: "Egypt", tla: "EGY" },
          awayTeam: { name: "Iran", tla: "IRN" },
          score: { fullTime: { home: 1, away: 1 } }, // corregido a 1-1
          group: "Group G",
          venue: null,
        }],
      }),
    }));

    // El snapshot previo devuelve el partido ya FINISHED con marcador viejo (0-1).
    const matchesChain: Record<string, unknown> = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    matchesChain.select = vi.fn(() => matchesChain);
    matchesChain.eq = vi.fn(() => matchesChain);
    matchesChain.is = vi.fn(() => Promise.resolve({ data: [] }));
    matchesChain.in = vi.fn(() =>
      Promise.resolve({ data: [{ api_id: "101", status: "FINISHED", home_score: 0, away_score: 1 }] })
    );

    const predsChain: Record<string, unknown> = {};
    predsChain.select = vi.fn(() => predsChain);
    predsChain.is = vi.fn(() => Promise.resolve({ data: [] }));

    const mockFrom = vi.fn((table: string) =>
      table === "predictions" ? predsChain : matchesChain
    );

    const mockRpc = vi.fn()
      .mockResolvedValueOnce({ data: 5, error: null })  // recalculate_all_points
      .mockResolvedValueOnce({ data: 0, error: null }); // decay_group_tokens

    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue({
      from: mockFrom,
      rpc: mockRpc,
    } as unknown as ReturnType<typeof createAdminClient>);

    const result = await syncMatches();

    expect(mockRpc).toHaveBeenCalledWith("recalculate_all_points");
    expect(result.calculated).toBe(5);
    expect(result.synced).toBe(1);
    expect(result.error).toBeUndefined();
  });
});
