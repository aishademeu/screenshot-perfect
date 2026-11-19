import { describe, it, expect } from "vitest";

/**
 * Pure-logic tests for the five MILKONTROL business detection scenarios.
 * These run without Supabase — they test the detection formulas only.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function countMissedVisits(planned: { completed_at: string | null }[]): number {
  return planned.filter((v) => !v.completed_at).length;
}

function salesDropPercent(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

function planAchievement(actual: number, plan: number): number {
  if (plan === 0) return 0;
  return (actual / plan) * 100;
}

// ── Scenario 1: Five missed visits ───────────────────────────────────────────
describe("Scenario 1 — Missed visits detection", () => {
  it("detects exactly 5 missed visits from planned list", () => {
    const planned = [
      { completed_at: null },
      { completed_at: null },
      { completed_at: null },
      { completed_at: null },
      { completed_at: null },
      { completed_at: "2026-11-01T10:00:00Z" },
    ];
    expect(countMissedVisits(planned)).toBe(5);
  });

  it("triggers alert when count >= threshold (default 5)", () => {
    const threshold = 5;
    expect(countMissedVisits(Array(5).fill({ completed_at: null })) >= threshold).toBe(true);
    expect(countMissedVisits(Array(4).fill({ completed_at: null })) >= threshold).toBe(false);
  });
});

// ── Scenario 2: 30% sales drop ───────────────────────────────────────────────
describe("Scenario 2 — Sales drop 30%", () => {
  it("calculates correct drop percentage", () => {
    const pct = salesDropPercent(70, 100);
    expect(pct).toBeCloseTo(-30, 1);
  });

  it("triggers alert when drop >= 30%", () => {
    const threshold = -30;
    expect(salesDropPercent(70, 100) <= threshold).toBe(true);
    expect(salesDropPercent(80, 100) <= threshold).toBe(false);
  });

  it("handles zero previous period without crash", () => {
    expect(salesDropPercent(100, 0)).toBe(0);
  });
});

// ── Scenario 3: Missing freezer ──────────────────────────────────────────────
describe("Scenario 3 — Missing freezer", () => {
  it("detects missing status as a problem", () => {
    const equipment = { status: "missing", expected: true };
    const isMissing = equipment.expected && equipment.status === "missing";
    expect(isMissing).toBe(true);
  });

  it("does not flag installed equipment as missing", () => {
    const equipment = { status: "installed", expected: true };
    const isMissing = equipment.expected && equipment.status === "missing";
    expect(isMissing).toBe(false);
  });
});

// ── Scenario 4: Freezer with no sales ────────────────────────────────────────
describe("Scenario 4 — Installed freezer, zero sales", () => {
  it("detects idle freezer when status=installed and sales=0", () => {
    const eq = { status: "installed" };
    const sales = { amount: 0 };
    const isIdle = eq.status === "installed" && sales.amount === 0;
    expect(isIdle).toBe(true);
  });

  it("does not flag when sales are positive", () => {
    const eq = { status: "installed" };
    const sales = { amount: 1500 };
    const isIdle = eq.status === "installed" && sales.amount === 0;
    expect(isIdle).toBe(false);
  });
});

// ── Scenario 5: 50% plan achievement ─────────────────────────────────────────
describe("Scenario 5 — Plan achievement ≤ 50%", () => {
  it("flags achievement at exactly 50%", () => {
    const threshold = 50;
    expect(planAchievement(50, 100) <= threshold).toBe(true);
  });

  it("does not flag achievement above threshold", () => {
    const threshold = 50;
    expect(planAchievement(51, 100) <= threshold).toBe(false);
  });

  it("calculates remaining gap correctly", () => {
    const actual = 50_000;
    const plan = 100_000;
    const gap = plan - actual;
    expect(gap).toBe(50_000);
  });

  it("handles zero plan without division error", () => {
    expect(planAchievement(100, 0)).toBe(0);
  });
});
