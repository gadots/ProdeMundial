import { ALL_WC_TEAMS, EXTRA_FLAGS } from "@/lib/mock-data";

const FLAG_MAP: Record<string, string> = {
  ...Object.fromEntries(ALL_WC_TEAMS.map((t) => [t.shortName, t.flag])),
  ...EXTRA_FLAGS,
};

describe("ALL_WC_TEAMS", () => {
  test("tiene exactamente 48 equipos", () => {
    expect(ALL_WC_TEAMS).toHaveLength(48);
  });

  test("todos los equipos tienen shortName y flag no vacíos", () => {
    ALL_WC_TEAMS.forEach(({ shortName, flag, name }) => {
      expect(shortName.length, `${name}: shortName vacío`).toBeGreaterThan(0);
      expect(flag.length, `${name}: flag vacío`).toBeGreaterThan(0);
    });
  });

  test("no hay shortNames duplicados", () => {
    const codes = ALL_WC_TEAMS.map((t) => t.shortName);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });
});

describe("FLAG_MAP (ALL_WC_TEAMS + EXTRA_FLAGS)", () => {
  test("incluye SRB — código alternativo de Serbia en football-data.org", () => {
    expect(FLAG_MAP["SRB"]).toBe("🇷🇸");
  });

  test("incluye QAT (Qatar)", () => {
    expect(FLAG_MAP["QAT"]).toBe("🇶🇦");
  });

  test("incluye HAI y HTI (Haití)", () => {
    expect(FLAG_MAP["HAI"]).toBe("🇭🇹");
    expect(FLAG_MAP["HTI"]).toBe("🇭🇹");
  });

  test("todos los equipos de ALL_WC_TEAMS tienen entrada en FLAG_MAP", () => {
    ALL_WC_TEAMS.forEach(({ shortName, name }) => {
      expect(FLAG_MAP[shortName], `${name} (${shortName}) sin bandera en FLAG_MAP`).toBeTruthy();
    });
  });

  test("SER (nuestra clave para Serbia) sigue presente", () => {
    expect(FLAG_MAP["SER"]).toBe("🇷🇸");
  });

  test("EXTRA_FLAGS no tiene valores vacíos", () => {
    Object.entries(EXTRA_FLAGS).forEach(([code, flag]) => {
      expect(flag.length, `Código ${code} tiene flag vacío`).toBeGreaterThan(0);
    });
  });
});
