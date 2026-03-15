import { describe, it, expect, vi, afterEach } from "vitest";
import {
  calculatePoints,
  maxPointsForMatch,
  streakBonusPoints,
  isGroupStageOver,
  GROUP_STAGE_END_DATE,
} from "../scoring";

// ---------------------------------------------------------------------------
// calculatePoints
// ---------------------------------------------------------------------------

describe("calculatePoints", () => {
  describe("resultado exacto", () => {
    it("GROUP: 3 pts con resultado exacto", () => {
      const r = calculatePoints(2, 1, 2, 1, "GROUP");
      expect(r.points).toBe(3);
      expect(r.reason).toContain("exacto");
    });

    it("ROUND_OF_16: 10 pts con resultado exacto", () => {
      const r = calculatePoints(0, 0, 0, 0, "ROUND_OF_16");
      expect(r.points).toBe(10);
    });

    it("SEMI_FINAL: 30 pts con resultado exacto", () => {
      const r = calculatePoints(3, 1, 3, 1, "SEMI_FINAL");
      expect(r.points).toBe(30);
    });

    it("FINAL: 50 pts con resultado exacto", () => {
      const r = calculatePoints(1, 0, 1, 0, "FINAL");
      expect(r.points).toBe(50);
    });
  });

  describe("ganador correcto (no exacto)", () => {
    it("GROUP: 1 pt por ganador correcto", () => {
      const r = calculatePoints(2, 0, 3, 1, "GROUP"); // predicted home wins, actual home wins
      expect(r.points).toBe(1);
      expect(r.reason).toContain("Ganador correcto");
    });

    it("QUARTER_FINAL: 6 pts por ganador correcto", () => {
      const r = calculatePoints(1, 0, 2, 0, "QUARTER_FINAL");
      expect(r.points).toBe(6);
    });

    it("FINAL: 20 pts por ganador correcto", () => {
      const r = calculatePoints(2, 1, 3, 2, "FINAL");
      expect(r.points).toBe(20);
    });
  });

  describe("empate correcto", () => {
    it("GROUP: 2 pts por empate correcto", () => {
      const r = calculatePoints(1, 1, 2, 2, "GROUP"); // both draw, not exact
      expect(r.points).toBe(2);
      expect(r.reason).toContain("Empate correcto");
    });

    it("GROUP: 2 pts por empate correcto exacto (empate es un resultado exacto)", () => {
      const r = calculatePoints(0, 0, 0, 0, "GROUP");
      // exacto tiene prioridad sobre empate
      expect(r.points).toBe(3);
      expect(r.reason).toContain("exacto");
    });

    it("ROUND_OF_16: draw=0 pts (no hay empate en eliminatorias)", () => {
      // draw=0 en fases eliminatorias
      const r = calculatePoints(1, 1, 2, 2, "ROUND_OF_16");
      expect(r.points).toBe(0); // draw: 0
    });
  });

  describe("sin puntos", () => {
    it("retorna 0 cuando el ganador es incorrecto", () => {
      const r = calculatePoints(2, 0, 0, 1, "GROUP"); // predicted home wins, actual away wins
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

  describe("tokens multiplicadores", () => {
    it("token 2x duplica los puntos exactos", () => {
      const r = calculatePoints(2, 1, 2, 1, "GROUP", 2);
      expect(r.points).toBe(6); // 3 * 2
      expect(r.reason).toContain("2x");
    });

    it("token 3x triplica los puntos", () => {
      const r = calculatePoints(2, 1, 2, 1, "GROUP", 3);
      expect(r.points).toBe(9); // 3 * 3
    });

    it("token 5x quintuplica los puntos", () => {
      const r = calculatePoints(2, 1, 2, 1, "GROUP", 5);
      expect(r.points).toBe(15); // 3 * 5
    });

    it("token 2x no cambia el resultado cuando hay 0 pts", () => {
      const r = calculatePoints(2, 0, 0, 1, "GROUP", 2);
      expect(r.points).toBe(0);
    });

    it("token 5x en FINAL exacto: 250 pts", () => {
      const r = calculatePoints(1, 0, 1, 0, "FINAL", 5);
      expect(r.points).toBe(250); // 50 * 5
    });
  });

  describe("streak bonus", () => {
    it("suma streak bonus cuando hay puntos", () => {
      const r = calculatePoints(2, 1, 2, 1, "GROUP", 1, 2);
      expect(r.points).toBe(5); // 3 + 2
      expect(r.reason).toContain("bonus racha");
    });

    it("streak bonus de 5 se suma correctamente", () => {
      const r = calculatePoints(2, 1, 2, 1, "GROUP", 1, 5);
      expect(r.points).toBe(8); // 3 + 5
    });

    it("streak bonus NO se suma cuando hay 0 pts base", () => {
      const r = calculatePoints(2, 0, 0, 1, "GROUP", 1, 2);
      expect(r.points).toBe(0); // no points → no bonus
    });

    it("token + streak se combinan: 2x en GROUP exacto + racha 2", () => {
      const r = calculatePoints(2, 1, 2, 1, "GROUP", 2, 2);
      expect(r.points).toBe(8); // (3 * 2) + 2
    });
  });
});

// ---------------------------------------------------------------------------
// maxPointsForMatch
// ---------------------------------------------------------------------------

describe("maxPointsForMatch", () => {
  it("GROUP sin token: 3", () => {
    expect(maxPointsForMatch("GROUP")).toBe(3);
  });

  it("FINAL sin token: 50", () => {
    expect(maxPointsForMatch("FINAL")).toBe(50);
  });

  it("SEMI_FINAL con 5x: 150", () => {
    expect(maxPointsForMatch("SEMI_FINAL", 5)).toBe(150); // 30 * 5
  });

  it("QUARTER_FINAL con 3x: 54", () => {
    expect(maxPointsForMatch("QUARTER_FINAL", 3)).toBe(54); // 18 * 3
  });
});

// ---------------------------------------------------------------------------
// streakBonusPoints
// ---------------------------------------------------------------------------

describe("streakBonusPoints", () => {
  it("0 → 0 pts", () => { expect(streakBonusPoints(0)).toBe(0); });
  it("1 → 0 pts", () => { expect(streakBonusPoints(1)).toBe(0); });
  it("2 → 0 pts", () => { expect(streakBonusPoints(2)).toBe(0); });
  it("3 → 2 pts", () => { expect(streakBonusPoints(3)).toBe(2); });
  it("4 → 2 pts", () => { expect(streakBonusPoints(4)).toBe(2); });
  it("5 → 5 pts", () => { expect(streakBonusPoints(5)).toBe(5); });
  it("10 → 5 pts", () => { expect(streakBonusPoints(10)).toBe(5); });
  it("100 → 5 pts", () => { expect(streakBonusPoints(100)).toBe(5); });
});

// ---------------------------------------------------------------------------
// isGroupStageOver
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
