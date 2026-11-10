import { describe, expect, it } from "vitest";
import { computeVoteWeight, totalVotesFromPlayerIds, votedFully } from "@/lib/rankedVoteSession";

describe("computeVoteWeight", () => {
  it("gives a Base badge owner 1.5x and everyone else 1", () => {
    const weight = computeVoteWeight(["a", "b", "c"], new Set(["b"]));
    expect(weight).toEqual({ a: 1, b: 1.5, c: 1 });
  });

  it("returns a plain 1 for everyone when nobody owns the Base badge", () => {
    const weight = computeVoteWeight(["a", "b"], new Set());
    expect(weight).toEqual({ a: 1, b: 1 });
  });
});

describe("totalVotesFromPlayerIds", () => {
  it("is just a headcount, regardless of who owns the Base badge", () => {
    // Unlike the old allowance-sum, a Base badge owner no longer adds an
    // extra tap to the total — everyone taps exactly once.
    expect(totalVotesFromPlayerIds(["a", "b", "c"])).toBe(3);
    expect(totalVotesFromPlayerIds([])).toBe(0);
  });
});

describe("votedFully", () => {
  it("is true once a player has tapped at least once, regardless of their vote weight", () => {
    expect(votedFully({ a: 1 }, "a")).toBe(true);
    expect(votedFully({ a: 0 }, "a")).toBe(false);
    expect(votedFully({}, "a")).toBe(false);
  });
});
