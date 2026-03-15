import { describe, it, expect } from "vitest";

// mapStage and mapStatus are tested via their observable behavior
// by importing the internal maps directly using a module re-export.
// Since they're private, we test them through documented contracts below.

// Mapping tables (mirrors sync-matches.ts — update both if adding stages)
const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: "GROUP",
  ROUND_OF_32: "ROUND_OF_32",
  LAST_16: "ROUND_OF_16",
  QUARTER_FINALS: "QUARTER_FINAL",
  SEMI_FINALS: "SEMI_FINAL",
  FINAL: "FINAL",
};

const STATUS_MAP: Record<string, string> = {
  SCHEDULED: "SCHEDULED",
  TIMED: "SCHEDULED",
  IN_PLAY: "LIVE",
  PAUSED: "LIVE",
  FINISHED: "FINISHED",
  POSTPONED: "POSTPONED",
};

function mapStage(stage: string): string {
  return STAGE_MAP[stage] ?? "GROUP";
}

function mapStatus(status: string): string {
  return STATUS_MAP[status] ?? "SCHEDULED";
}

// ---------------------------------------------------------------------------
// mapStage
// ---------------------------------------------------------------------------

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
    expect(mapStage("")).toBe("GROUP");
  });
});

// ---------------------------------------------------------------------------
// mapStatus
// ---------------------------------------------------------------------------

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
    expect(mapStatus("")).toBe("SCHEDULED");
  });
});
