import { describe, expect, it } from "vitest";
import { computeVoteWeight, totalVotesFromPlayerIds, votedFully, formatVoteCount } from "@/lib/rankedVoteSession";

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

describe("formatVoteCount", () => {
  it("rounds a Base badge owner's .5 weight away, so their tap's option looks identical to a genuine whole-number tally", () => {
    // 2 plain taps (weight 1 each) + 1 Base owner's tap (weight 1.5) = 3.5
    // — displaying that exact value would be the only way an option could
    // ever show a .5, which (since Base ownership is public) singles out
    // that one option as "a Base owner picked this" without needing a
    // name attached to it at all.
    expect(formatVoteCount(3.5)).toBe(4);
    expect(formatVoteCount(1.5)).toBe(2);
  });

  it("leaves a genuine whole-number tally untouched", () => {
    expect(formatVoteCount(0)).toBe(0);
    expect(formatVoteCount(4)).toBe(4);
  });

  it("still rounds correctly when two Base owners' taps land on the same option (an already-whole sum)", () => {
    // 1 plain tap + 2 Base owners' taps = 1 + 1.5 + 1.5 = 4, no rounding
    // needed, but formatVoteCount must be a no-op here too.
    expect(formatVoteCount(4)).toBe(4);
  });
});
