import { describe, it, expect, vi, afterEach } from "vitest";
import { formatMatchDay } from "../utils";

// Freeze time to a known Monday in the middle of the World Cup
const BASE_DATE = new Date("2026-06-15T12:00:00Z"); // lunes 15 jun 2026

describe("formatMatchDay", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna "Hoy" para la fecha de hoy', () => {
    vi.setSystemTime(BASE_DATE);
    const todayStr = BASE_DATE.toISOString();
    expect(formatMatchDay(todayStr)).toBe("Hoy");
  });

  it('retorna "Hoy" para medianoche de hoy (mismo día calendario)', () => {
    vi.setSystemTime(BASE_DATE);
    const midnight = new Date("2026-06-15T00:00:00Z");
    expect(formatMatchDay(midnight.toISOString())).toBe("Hoy");
  });

  it('retorna "Mañana" para la fecha de mañana', () => {
    vi.setSystemTime(BASE_DATE);
    const tomorrow = new Date("2026-06-16T12:00:00Z");
    expect(formatMatchDay(tomorrow.toISOString())).toBe("Mañana");
  });

  it('retorna "Mañana" para medianoche de mañana', () => {
    vi.setSystemTime(BASE_DATE);
    const tomorrowMidnight = new Date("2026-06-16T00:00:00Z");
    expect(formatMatchDay(tomorrowMidnight.toISOString())).toBe("Mañana");
  });

  it("retorna cadena localizada (no Hoy/Mañana) para fecha pasada", () => {
    vi.setSystemTime(BASE_DATE);
    const past = new Date("2026-06-10T12:00:00Z");
    const result = formatMatchDay(past.toISOString());
    expect(result).not.toBe("Hoy");
    expect(result).not.toBe("Mañana");
    expect(result.length).toBeGreaterThan(0);
  });

  it("retorna cadena localizada (no Hoy/Mañana) para fecha futura", () => {
    vi.setSystemTime(BASE_DATE);
    const future = new Date("2026-07-04T18:00:00Z");
    const result = formatMatchDay(future.toISOString());
    expect(result).not.toBe("Hoy");
    expect(result).not.toBe("Mañana");
    expect(result.length).toBeGreaterThan(0);
  });

  it("no retorna puntos en la cadena localizada", () => {
    vi.setSystemTime(BASE_DATE);
    const future = new Date("2026-07-04T18:00:00Z");
    const result = formatMatchDay(future.toISOString());
    expect(result).not.toContain(".");
  });

  it("no devuelve Hoy para la fecha de pasado mañana", () => {
    vi.setSystemTime(BASE_DATE);
    const dayAfterTomorrow = new Date("2026-06-17T12:00:00Z");
    expect(formatMatchDay(dayAfterTomorrow.toISOString())).not.toBe("Hoy");
    expect(formatMatchDay(dayAfterTomorrow.toISOString())).not.toBe("Mañana");
  });
});
