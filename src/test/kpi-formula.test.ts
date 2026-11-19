import { describe, it, expect } from "vitest";
import { calculateKPI, calculateBonus, KPI_BONUS_THRESHOLD } from "@/lib/roles";

describe("KPI formula", () => {
  it("computes KPI with equal weights", () => {
    // 50% plan × 0.5 + 80% visits × 0.3 + 90% photo × 0.2
    // = 50 × 0.5 + 80 × 0.3 + 90 × 0.2 = 25 + 24 + 18 = 67
    expect(calculateKPI(50, 80, 90)).toBe(67);
  });

  it("caps plan contribution at 120%", () => {
    const kpiNormal = calculateKPI(100, 100, 100); // 50 + 30 + 20 = 100
    const kpiAt120 = calculateKPI(120, 100, 100); // 60 + 30 + 20 = 110
    const kpiOver120 = calculateKPI(150, 100, 100); // plan capped at 120 -> 60 + 30 + 20 = 110
    expect(kpiNormal).toBe(100);
    expect(kpiAt120).toBe(110);
    expect(kpiOver120).toBe(110);
  });

  it("awards bonus when KPI >= 70", () => {
    expect(calculateBonus(70)).toBe(70 * 3000);
    expect(calculateBonus(85)).toBe(85 * 3000);
  });

  it("awards no bonus when KPI < 70", () => {
    expect(calculateBonus(69)).toBe(0);
    expect(calculateBonus(0)).toBe(0);
  });

  it("threshold is configurable constant", () => {
    expect(KPI_BONUS_THRESHOLD).toBe(70);
  });
});
