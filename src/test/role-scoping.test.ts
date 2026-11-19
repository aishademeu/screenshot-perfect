import { describe, it, expect } from "vitest";
import { isManager, canReviewPhotos, canAssignTasks, canDownloadReports } from "@/lib/roles";

describe("Role scoping", () => {
  it("sd and ceo are managers", () => {
    expect(isManager("sd")).toBe(true);
    expect(isManager("ceo")).toBe(true);
    expect(isManager("rd")).toBe(false);
    expect(isManager("rep")).toBe(false);
  });

  it("rd, sd, ceo can review photos", () => {
    expect(canReviewPhotos("rd")).toBe(true);
    expect(canReviewPhotos("sd")).toBe(true);
    expect(canReviewPhotos("ceo")).toBe(true);
    expect(canReviewPhotos("rep")).toBe(false);
  });

  it("rd, sd, ceo can assign tasks", () => {
    expect(canAssignTasks("rd")).toBe(true);
    expect(canAssignTasks("sd")).toBe(true);
    expect(canAssignTasks("ceo")).toBe(true);
    expect(canAssignTasks("rep")).toBe(false);
  });

  it("rd, sd, ceo can download reports", () => {
    expect(canDownloadReports("rd")).toBe(true);
    expect(canDownloadReports("sd")).toBe(true);
    expect(canDownloadReports("ceo")).toBe(true);
    expect(canDownloadReports("rep")).toBe(false);
  });

  it("null role has no permissions", () => {
    expect(isManager(null)).toBe(false);
    expect(canReviewPhotos(null)).toBe(false);
    expect(canAssignTasks(null)).toBe(false);
    expect(canDownloadReports(null)).toBe(false);
  });
});
