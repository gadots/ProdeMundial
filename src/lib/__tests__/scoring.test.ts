import { describe, it, expect, vi, afterEach } from "vitest";
import {
  calculatePoints,
  maxPointsForMatch,
  streakBonusPoints,
  isGroupStageOver,
  areTokensExpired,
  GROUP_STAGE_END_DATE,
  TOKENS_EXPIRY_DATE,
} from "../scoring";

// ---------------------------------------------------------------------------
// calculatePoints — GROUP phase
// ---------------------------------------------------------------------------

describe("calculatePoints — GROUP", () => {
  describe("resultado exacto", () => {
    it("GROUP: 3 pts con resultado exacto", () => {
      const r = calculatePoints(2, 1, 2, 1, "GROUP");
      expect(r.points).toBe(3);
      expect(r.reason).toContain("exacto");
    });

    it("GROUP: exacto en empate (0-0) vale 3 pts", () => {
      const r = calculatePoints(0, 0, 0, 0, "GROUP");
      expect(r.points).toBe(3);
      expect(r.reason).toContain("exacto");
    });
  });

  describe("ganador correcto (no exacto)", () => {
    it("GROUP: 1 pt por ganador correcto", () => {
      const r = calculatePoints(2, 0, 3, 1, "GROUP");
      expect(r.points).toBe(1);
      expect(r.reason).toContain("Ganador correcto");
    });
  });

  describe("empate correcto", () => {
    it("GROUP: 1 pt por empate correcto (no exacto)", () => {
      const r = calculatePoints(1, 1, 2, 2, "GROUP");
      expect(r.points).toBe(1);
      expect(r.reason).toContain("Empate correcto");
    });
  });

  describe("sin puntos", () => {
    it("retorna 0 cuando el ganador es incorrecto", () => {
      const r = calculatePoints(2, 0, 0, 1, "GROUP");
      expect(r.points).toBe(0);
      expect(r.reason).toBe("Sin puntos");
    });

    it("retorna 0 cuando predijo empate pero hubo ganador", () => {
      const r = calculatePoints(1, 1, 2, 0, "GROUP");
      expect(r.points).toBe(0);
    });

    it("retorna 0 cuando predijo ganador pero hubo empate", () => {
      const r = calculatePoints(2, 1, 1, 1, "GROUP");
      expect(r.points).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// calculatePoints — KNOCKOUT phases (penalty winner logic)
// ---------------------------------------------------------------------------

describe("calculatePoints — KNOCKOUT", () => {
  describe("ROUND_OF_32", () => {
    it("exacto en tiempo regular (no empate): 5 pts", () => {
      const r = calculatePoints(2, 1, 2, 1, "ROUND_OF_32");
      expect(r.points).toBe(5);
    });

    it("ganador correcto (no exacto, no empate): 2 pts", () => {
      const r = calculatePoints(1, 0, 2, 0, "ROUND_OF_32");
      expect(r.points).toBe(2);
    });

    it("empate correcto (no exacto) + penales correctos: 3 pts", () => {
      const r = calculatePoints(1, 1, 2, 2, "ROUND_OF_32", 1, 0, "home", "home");
      expect(r.points).toBe(3);
      expect(r.reason).toContain("penales");
    });

    it("exacto de empate + penales correctos: 5 pts", () => {
      const r = calculatePoints(1, 1, 1, 1, "ROUND_OF_32", 1, 0, "away", "away");
      expect(r.points).toBe(5);
    });

    it("exacto de empate + penales incorrectos: 0 pts", () => {
      const r = calculatePoints(1, 1, 1, 1, "ROUND_OF_32", 1, 0, "home", "away");
      expect(r.points).toBe(0);
    });

    it("empate correcto + penales incorrectos: 0 pts", () => {
      const r = calculatePoints(1, 1, 2, 2, "ROUND_OF_32", 1, 0, "home", "away");
      expect(r.points).toBe(0);
    });

    it("empate correcto + sin penalty winner predicho: 0 pts", () => {
      const r = calculatePoints(1, 1, 2, 2, "ROUND_OF_32", 1, 0, undefined, "home");
      expect(r.points).toBe(0);
    });

    it("ganador incorrecto: 0 pts", () => {
      const r = calculatePoints(2, 0, 0, 1, "ROUND_OF_32");
      expect(r.points).toBe(0);
    });
  });

  describe("otros valores de fase", () => {
    it("ROUND_OF_16 exacto: 12 pts", () => {
      const r = calculatePoints(0, 1, 0, 1, "ROUND_OF_16");
      expect(r.points).toBe(12);
    });

    it("QUARTER_FINAL ganador: 8 pts", () => {
      const r = calculatePoints(1, 0, 2, 0, "QUARTER_FINAL");
      expect(r.points).toBe(8);
    });

    it("SEMI_FINAL exacto: 35 pts", () => {
      const r = calculatePoints(3, 1, 3, 1, "SEMI_FINAL");
      expect(r.points).toBe(35);
    });

    it("FINAL exacto: 60 pts", () => {
      const r = calculatePoints(1, 0, 1, 0, "FINAL");
      expect(r.points).toBe(60);
    });

    it("FINAL ganador: 25 pts", () => {
      const r = calculatePoints(2, 1, 3, 2, "FINAL");
      expect(r.points).toBe(25);
    });

    it("FINAL empate + penales correctos: 35 pts", () => {
      const r = calculatePoints(1, 1, 2, 2, "FINAL", 1, 0, "away", "away");
      expect(r.points).toBe(35);
    });
  });
});

// ---------------------------------------------------------------------------
// Tokens multiplicadores
// ---------------------------------------------------------------------------

describe("tokens multiplicadores", () => {
  it("token 2x duplica los puntos exactos en GROUP", () => {
    const r = calculatePoints(2, 1, 2, 1, "GROUP", 2);
    expect(r.points).toBe(6); // 3 * 2
    expect(r.reason).toContain("2x");
  });

  it("token 3x triplica los puntos en GROUP", () => {
    const r = calculatePoints(2, 1, 2, 1, "GROUP", 3);
    expect(r.points).toBe(9); // 3 * 3
  });

  it("token 5x quintuplica los puntos en GROUP", () => {
    const r = calculatePoints(2, 1, 2, 1, "GROUP", 5);
    expect(r.points).toBe(15); // 3 * 5
  });

  it("token 2x no cambia el resultado cuando hay 0 pts", () => {
    const r = calculatePoints(2, 0, 0, 1, "GROUP", 2);
    expect(r.points).toBe(0);
  });

  it("token 5x en FINAL exacto: 300 pts", () => {
    const r = calculatePoints(1, 0, 1, 0, "FINAL", 5);
    expect(r.points).toBe(300); // 60 * 5
  });
});

// ---------------------------------------------------------------------------
// Streak bonus — nuevo orden (base + racha) × multiplicador
// ---------------------------------------------------------------------------

describe("streak bonus", () => {
  it("suma streak bonus cuando hay puntos", () => {
    const r = calculatePoints(2, 1, 2, 1, "GROUP", 1, 3);
    expect(r.points).toBe(6); // (3 + 3) * 1
    expect(r.reason).toContain("racha");
  });

  it("streak bonus de 8 se suma correctamente", () => {
    const r = calculatePoints(2, 1, 2, 1, "GROUP", 1, 8);
    expect(r.points).toBe(11); // (3 + 8) * 1
  });

  it("streak bonus NO se suma cuando hay 0 pts base", () => {
    const r = calculatePoints(2, 0, 0, 1, "GROUP", 1, 3);
    expect(r.points).toBe(0); // no points → no bonus
  });

  it("token + streak: (base + racha) × mult — GROUP exacto 2x + racha 3", () => {
    const r = calculatePoints(2, 1, 2, 1, "GROUP", 2, 3);
    expect(r.points).toBe(12); // (3 + 3) * 2
  });

  it("token + streak en KNOCKOUT exacto: (35 + 8) * 1 = 43 pts", () => {
    const r = calculatePoints(3, 1, 3, 1, "SEMI_FINAL", 1, 8);
    expect(r.points).toBe(43); // (35 + 8) * 1
  });
});

// ---------------------------------------------------------------------------
// maxPointsForMatch
// ---------------------------------------------------------------------------

describe("maxPointsForMatch", () => {
  it("GROUP sin token: 3", () => {
    expect(maxPointsForMatch("GROUP")).toBe(3);
  });

  it("FINAL sin token: 60", () => {
    expect(maxPointsForMatch("FINAL")).toBe(60);
  });

  it("SEMI_FINAL con 5x: 175", () => {
    expect(maxPointsForMatch("SEMI_FINAL", 5)).toBe(175); // 35 * 5
  });

  it("QUARTER_FINAL con 3x: 60", () => {
    expect(maxPointsForMatch("QUARTER_FINAL", 3)).toBe(60); // 20 * 3
  });

  it("GROUP con 2x + racha 3: (3 + 3) * 2 = 12", () => {
    expect(maxPointsForMatch("GROUP", 2, 3)).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// streakBonusPoints
// ---------------------------------------------------------------------------

describe("streakBonusPoints", () => {
  it("0 → 0 pts", () => { expect(streakBonusPoints(0)).toBe(0); });
  it("1 → 0 pts", () => { expect(streakBonusPoints(1)).toBe(0); });
  it("2 → 0 pts", () => { expect(streakBonusPoints(2)).toBe(0); });
  it("3 → 3 pts", () => { expect(streakBonusPoints(3)).toBe(3); });
  it("4 → 3 pts", () => { expect(streakBonusPoints(4)).toBe(3); });
  it("5 → 8 pts", () => { expect(streakBonusPoints(5)).toBe(8); });
  it("10 → 8 pts", () => { expect(streakBonusPoints(10)).toBe(8); });
  it("100 → 8 pts", () => { expect(streakBonusPoints(100)).toBe(8); });
});

// ---------------------------------------------------------------------------
// isGroupStageOver / areTokensExpired
// ---------------------------------------------------------------------------

describe("isGroupStageOver", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retorna false antes del fin de la fase de grupos", () => {
    vi.setSystemTime(new Date("2026-06-01T00:00:00Z"));
    expect(isGroupStageOver()).toBe(false);
  });

  it("retorna true después del fin de la fase de grupos", () => {
    vi.setSystemTime(new Date("2026-06-27T00:00:00Z"));
    expect(isGroupStageOver()).toBe(true);
  });

  it("retorna false exactamente en la fecha límite", () => {
    vi.setSystemTime(GROUP_STAGE_END_DATE);
    expect(isGroupStageOver()).toBe(false);
  });

  it("retorna true 1 segundo después del límite", () => {
    vi.setSystemTime(new Date(GROUP_STAGE_END_DATE.getTime() + 1000));
    expect(isGroupStageOver()).toBe(true);
  });
});

describe("areTokensExpired", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retorna false antes del fin de Octavos", () => {
    vi.setSystemTime(new Date("2026-06-01T00:00:00Z"));
    expect(areTokensExpired()).toBe(false);
  });

  it("retorna true después del fin de Octavos", () => {
    vi.setSystemTime(new Date("2026-07-06T00:00:00Z"));
    expect(areTokensExpired()).toBe(true);
  });

  it("retorna false exactamente en la fecha límite", () => {
    vi.setSystemTime(TOKENS_EXPIRY_DATE);
    expect(areTokensExpired()).toBe(false);
  });

  it("retorna true 1 segundo después del límite", () => {
    vi.setSystemTime(new Date(TOKENS_EXPIRY_DATE.getTime() + 1000));
    expect(areTokensExpired()).toBe(true);
  });
});
