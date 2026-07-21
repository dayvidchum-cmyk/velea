import { describe, it, expect } from "vitest";
import { resolveDaySky } from "./resolve-day-sky.js";
import { profileToSubject } from "../astrology-subject.js";

// THE LOCATION TIERS MUST TRAVEL WITH THE SUBJECT (v902).
//
// resolveDaySky takes a ProfileLocFields. 11 of its 33 call sites hand it an AstrologySubject
// instead of the profiles row, and the fields that decide the tier — isOwner and the whole
// hometown set — were absent from that object. ProfileLocFields marks them optional, so those
// call sites type-checked while resolving a DIFFERENT sky than the other 22.
//
// This is the control: the same person, described both ways, must resolve the same sky. Before the
// fix the first case failed with Newark/birth (row) against Boston/current (subject) — David's
// morning v-loc bug, still live on a third of the paths because the fix landed in the resolver and
// a third of the callers could not see it.
describe("the subject shape and the profile row resolve the same sky", () => {
  const user = { locationCity: "Boston", locationLat: "42.3601", locationLon: "-71.0589", locationTimezone: "America/New_York" };
  const date = "2026-07-21";
  const now = new Date("2026-07-21T12:00:00Z");

  const row = (over: Record<string, unknown>) => ({
    id: 1, name: "Lisa", birthDate: "1980-05-05", birthTime: null, lagnaBasis: "chandra",
    birthLocationCity: null, birthLocationLat: null, birthLocationLon: null, birthTimezone: null,
    hometownCity: null, hometownLat: null, hometownLon: null, hometownTimezone: null,
    isOwner: false, ...over,
  }) as any;

  const bothWays = async (r: any) => {
    const fromRow = await resolveDaySky({ user, profile: r, dateStr: date, now });
    const subject = profileToSubject(r, [], "profile");
    const fromSubject = await resolveDaySky({ user, profile: subject, dateStr: date, now });
    return [
      { city: fromRow.city, source: fromRow.source },
      { city: fromSubject.city, source: fromSubject.source },
    ];
  };

  it("someone else's chart with their own birth ground is read from THAT ground, either way", async () => {
    const [a, b] = await bothWays(row({
      birthLocationCity: "Newark", birthLocationLat: "40.7357", birthLocationLon: "-74.1724", birthTimezone: "America/New_York",
    }));
    expect(a).toEqual({ city: "Newark", source: "birth" });
    expect(b).toEqual(a);
  });

  it("a hometown outranks birth, either way", async () => {
    const [a, b] = await bothWays(row({
      birthLocationCity: "Newark", birthLocationLat: "40.7357", birthLocationLon: "-74.1724", birthTimezone: "America/New_York",
      hometownCity: "Providence", hometownLat: "41.8240", hometownLon: "-71.4128", hometownTimezone: "America/New_York",
    }));
    expect(a).toEqual({ city: "Providence", source: "hometown" });
    expect(b).toEqual(a);
  });

  // THE CONTROL IN THE OTHER DIRECTION: the account holder's own chart SHOULD take the current
  // city — that tier is not broken, and a fix that silenced it everywhere would be its own bug.
  it("the account holder's own chart still takes the current city, either way", async () => {
    const [a, b] = await bothWays(row({
      isOwner: true,
      birthLocationCity: "Newark", birthLocationLat: "40.7357", birthLocationLon: "-74.1724", birthTimezone: "America/New_York",
    }));
    expect(a).toEqual({ city: "Boston", source: "current" });
    expect(b).toEqual(a);
  });

  // And someone else with NO ground of their own genuinely does follow the account holder.
  it("someone else with no ground of their own follows the account, either way", async () => {
    const [a, b] = await bothWays(row({}));
    expect(a).toEqual({ city: "Boston", source: "current" });
    expect(b).toEqual(a);
  });
});
