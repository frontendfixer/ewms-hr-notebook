import { describe, expect, it } from "vitest";
import {
  describeTotals,
  summarizeEvent,
  totalEvents,
  type SummaryEvent,
} from "@/lib/event-summary";
import { isActive, isMoreActive } from "@/lib/nav-routes";
import {
  barPercents,
  isSameMonth,
  monthDelta,
  monthLabel,
  rollUpClaims,
  currentReportMonth,
  financialYearOf,
  fyMonthSeries,
  parseReportMonth,
  shiftMonth,
  sharePercent,
  shortMonthLabel,
} from "@/lib/report-summary";
import {
  buildOverview,
  buildSettlementView,
  filterViews,
  groupByMonth,
  isOpen,
  parseClaimsFilter,
  stepDetails,
  waitingNote,
} from "@/lib/claim-summary";
import { daysSince } from "@/lib/utils";
import { timelineDomain } from "@/lib/event-filters";
import {
  getPeriodRange,
  parseTimelineFilters,
  parseTimelineLimit,
  recordsRedirectHref,
  timelineHref,
} from "@/lib/timeline-filters";

const base = { remarks: null };
const NOW = new Date("2026-11-08T06:00:00.000Z");

describe("summarizeEvent night duty", () => {
  const event: SummaryEvent = {
    ...base,
    domain: "NIGHT_DUTY",
    eventType: "NIGHT_DUTY_RECORDED",
    title: "Night Duty",
    occurredAt: new Date("2026-11-08T00:00:00.000Z"),
    remarks: "  Extra shift  ",
    payload: {
      startTime: "22:00",
      endTime: "06:00",
      nightMinutes: 450,
      amount: 1234.4,
    },
  };

  it("shows time window, night hours, amount, status and the remark", () => {
    const s = summarizeEvent(event, { claimStatus: "BILL_SUBMITTED" });
    expect(s.headline).toBe("Night duty");
    expect(s.meta).toEqual(["22:00–06:00", "7h 30m night"]);
    expect(s.value).toBe("₹1,234");
    expect(s.pill).toEqual({ label: "Billed", tone: "warning" });
    expect(s.note).toBe("Extra shift");
    expect(s.tile).toEqual({ day: "8", weekday: "Sun" });
  });

  it("omits the pill when no status is known", () => {
    expect(summarizeEvent(event).pill).toBeUndefined();
  });
});

describe("summarizeEvent travel", () => {
  const event: SummaryEvent = {
    ...base,
    domain: "TRAVEL",
    eventType: "TRAVEL_RECORDED",
    title: "Travel — Kota",
    occurredAt: new Date("2026-11-03T00:00:00.000Z"),
    payload: {
      from: "Jaipur",
      to: "Kota",
      purpose: "Inspection",
      departureTime: "08:30",
      returnTime: "20:15",
      returnDate: "2026-11-03T00:00:00.000Z",
      claimPercent: 70,
      amount: 560,
    },
  };

  it("builds the route, times, claim % and purpose", () => {
    const s = summarizeEvent(event, { claimStatus: "PAID" });
    expect(s.headline).toBe("Jaipur → Kota");
    expect(s.meta).toEqual(["08:30–20:15", "70% claim", "Inspection"]);
    expect(s.value).toBe("₹560");
    expect(s.pill?.tone).toBe("success");
  });

  it("skips a purpose that only repeats the destination", () => {
    const s = summarizeEvent({
      ...event,
      payload: { ...(event.payload as object), purpose: "Kota" },
    });
    expect(s.meta).toEqual(["08:30–20:15", "70% claim"]);
  });

  it("shows the return date for an overnight trip", () => {
    const s = summarizeEvent({
      ...event,
      payload: {
        ...(event.payload as object),
        returnDate: "2026-11-04T00:00:00.000Z",
        returnTime: "06:10",
      },
    });
    expect(s.meta[0]).toBe("08:30 → 4 Nov 06:10");
  });

  it("falls back to the title for old entries without a route", () => {
    const s = summarizeEvent({ ...event, payload: {} });
    expect(s.headline).toBe("Kota");
  });
});

describe("summarizeEvent leave", () => {
  const event: SummaryEvent = {
    ...base,
    domain: "LEAVE",
    eventType: "LEAVE_RECORDED",
    title: "CL leave — 12 Nov – 14 Nov 2026",
    occurredAt: new Date("2026-11-12T00:00:00.000Z"),
    payload: {
      leaveType: "CL",
      startDate: "2026-11-12T00:00:00.000Z",
      endDate: "2026-11-14T00:00:00.000Z",
      duration: "FULL",
      days: 3,
      excludedDays: [],
      usesCr: false,
    },
  };

  it("shows type, range and days charged", () => {
    const s = summarizeEvent(event);
    expect(s.headline).toBe("CL leave");
    expect(s.meta).toEqual(["12–14 Nov"]);
    expect(s.value).toBe("3 days");
  });

  it("notes half days and days that were not counted", () => {
    const s = summarizeEvent({
      ...event,
      payload: {
        ...(event.payload as object),
        endDate: "2026-11-12T00:00:00.000Z",
        duration: "FIRST_HALF",
        days: 1,
        excludedDays: ["2026-11-15T00:00:00.000Z"],
      },
    });
    expect(s.meta).toEqual(["12 Nov", "First half", "1 not counted"]);
    expect(s.value).toBe("1 day");
  });

  it("labels CR leave and spans month ends", () => {
    const s = summarizeEvent({
      ...event,
      payload: {
        ...(event.payload as object),
        usesCr: true,
        startDate: "2026-10-30T00:00:00.000Z",
        endDate: "2026-11-02T00:00:00.000Z",
      },
    });
    expect(s.headline).toBe("CR leave");
    expect(s.meta[0]).toBe("30 Oct – 2 Nov");
  });

  it("copes with entries that predate the leave payload", () => {
    const s = summarizeEvent({ ...event, payload: {} });
    expect(s.headline).toContain("CL");
    expect(s.value).toBeUndefined();
  });
});

describe("summarizeEvent CR credit", () => {
  const event = (expiresAt: string): SummaryEvent => ({
    ...base,
    domain: "CR",
    eventType: "CR_CREDIT_ISSUED",
    title: "+1 CR earned",
    occurredAt: new Date("2026-08-02T00:00:00.000Z"),
    payload: { amount: 1, expiresAt, dayLabel: "Sunday" },
  });

  it("is available well before expiry", () => {
    const s = summarizeEvent(event("2026-12-31T00:00:00.000Z"), { now: NOW });
    expect(s.headline).toBe("CR · Sunday");
    expect(s.value).toBe("+1 CR");
    expect(s.pill).toEqual({ label: "Available", tone: "success" });
    expect(s.meta).toEqual(["Expires 31 Dec 2026"]);
  });

  it("warns inside two weeks", () => {
    const s = summarizeEvent(event("2026-11-20T00:00:00.000Z"), { now: NOW });
    expect(s.pill).toEqual({ label: "12d left", tone: "warning" });
  });

  it("is expired on its expiry date, matching the ledger", () => {
    const s = summarizeEvent(event("2026-11-08T00:00:00.000Z"), { now: NOW });
    expect(s.pill?.label).toBe("Expired");
  });

  it("shows when it was used and fades", () => {
    const s = summarizeEvent(event("2026-12-31T00:00:00.000Z"), {
      now: NOW,
      crUsage: { appliedAt: new Date("2026-09-15T00:00:00.000Z"), used: 1 },
    });
    expect(s.muted).toBe(true);
    expect(s.pill).toEqual({ label: "Used", tone: "muted" });
    expect(s.meta).toEqual(["Used on 15 Sept 2026"]);
  });
});

describe("summarizeEvent CR credit, partial use and edges", () => {
  const credit = (over: object = {}): SummaryEvent => ({
    ...base,
    domain: "CR",
    eventType: "CR_CREDIT_ISSUED",
    title: "+1 CR earned",
    occurredAt: new Date("2026-08-02T00:00:00.000Z"),
    payload: { amount: 1, expiresAt: "2026-12-31T00:00:00.000Z", dayLabel: "Sunday", ...over },
  });

  it("shows what is left of a half-used credit instead of calling it used", () => {
    const s = summarizeEvent(credit(), {
      now: NOW,
      crUsage: { appliedAt: new Date("2026-09-15T00:00:00.000Z"), used: 0.5 },
    });
    expect(s.muted).toBe(false);
    expect(s.pill).toEqual({ label: "0.5 left", tone: "success" });
    expect(s.meta).toEqual(["0.5 used on 15 Sept 2026", "Expires 31 Dec 2026"]);
  });

  it("says 1d left on the last valid day", () => {
    const s = summarizeEvent(credit({ expiresAt: "2026-11-09T00:00:00.000Z" }), { now: NOW });
    expect(s.pill).toEqual({ label: "1d left", tone: "warning" });
  });

  it("reads the amount from the title of older entries", () => {
    const s = summarizeEvent(
      { ...credit(), title: "+0.5 CR earned (expires 31 Dec 2026)", payload: {} },
      { now: NOW },
    );
    expect(s.value).toBe("+0.5 CR");
    expect(s.pill?.label).toBe("Available");
  });

  it("uses India time for the tile of an entry stored at IST midnight", () => {
    // 18:30Z on the 7th is 00:00 IST on the 8th.
    const s = summarizeEvent({
      ...base,
      domain: "NIGHT_DUTY",
      eventType: "NIGHT_DUTY_RECORDED",
      title: "Night Duty",
      occurredAt: new Date("2026-11-07T18:30:00.000Z"),
      payload: {},
    });
    expect(s.tile).toEqual({ day: "8", weekday: "Sun" });
  });

  it("shortens the unbilled pill", () => {
    const s = summarizeEvent(
      {
        ...base,
        domain: "NIGHT_DUTY",
        eventType: "NIGHT_DUTY_RECORDED",
        title: "Night Duty",
        occurredAt: NOW,
        payload: {},
      },
      { claimStatus: "DRAFT" },
    );
    expect(s.pill).toEqual({ label: "Unbilled", tone: "muted" });
  });
});

describe("totals", () => {
  const events = [
    { eventType: "NIGHT_DUTY_RECORDED", title: "Night Duty", payload: { amount: 1000 } },
    { eventType: "TRAVEL_RECORDED", title: "Travel — Kota", payload: { amount: 250.5 } },
    { eventType: "LEAVE_RECORDED", title: "CL leave", payload: { days: 2.5 } },
    { eventType: "CR_CREDIT_ISSUED", title: "+1 CR earned", payload: { amount: 1 } },
    { eventType: "CR_CREDIT_ISSUED", title: "+1 CR earned", payload: {} },
  ];

  it("adds money, leave days and CR separately", () => {
    expect(totalEvents(events)).toEqual({
      count: 5,
      claimAmount: 1250.5,
      leaveDays: 2.5,
      crEarned: 2,
    });
  });

  it("counts an older half-day CR from its title, like the row does", () => {
    const totals = totalEvents([
      { eventType: "CR_CREDIT_ISSUED", title: "+0.5 CR earned", payload: {} },
    ]);
    expect(totals.crEarned).toBe(0.5);
  });

  it("describes only the non-zero parts", () => {
    expect(describeTotals(totalEvents(events))).toEqual(["₹1,251", "2.5d leave", "+2 CR"]);
    expect(describeTotals(totalEvents([]))).toEqual([]);
  });
});

describe("timeline filters", () => {
  it("reads type and period independently", () => {
    expect(parseTimelineFilters("NIGHT_DUTY", "month")).toEqual({
      type: "NIGHT_DUTY",
      period: "month",
    });
  });

  it("still understands older ?filter=month links", () => {
    expect(parseTimelineFilters("month")).toEqual({ type: "all", period: "month" });
    expect(parseTimelineFilters("year", undefined)).toEqual({ type: "all", period: "year" });
  });

  it("ignores unknown values", () => {
    expect(parseTimelineFilters("bogus", "decade")).toEqual({ type: "all", period: "all" });
  });

  it("builds short URLs", () => {
    expect(timelineHref({ type: "all", period: "all" })).toBe("/timeline");
    expect(timelineHref({ type: "pending", period: "month" })).toBe(
      "/timeline?filter=pending&period=month",
    );
    expect(timelineHref({ type: "CR", period: "all" }, 200)).toBe(
      "/timeline?filter=CR&limit=200",
    );
  });

  it("sends old /records links to the matching timeline filter", () => {
    expect(recordsRedirectHref("all")).toBe("/timeline");
    expect(recordsRedirectHref("cr")).toBe("/timeline?filter=CR");
    expect(recordsRedirectHref("leave", "month")).toBe("/timeline?filter=LEAVE&period=month");
    expect(recordsRedirectHref("night", "year")).toBe("/timeline?filter=NIGHT_DUTY&period=year");
    expect(recordsRedirectHref("ta", "pending")).toBe("/timeline?filter=pending");
    expect(recordsRedirectHref("all", "pending")).toBe("/timeline?filter=pending");
    expect(recordsRedirectHref("nonsense", "bogus")).toBe("/timeline");
    expect(recordsRedirectHref()).toBe("/timeline");
  });

  it("clamps the page size", () => {
    expect(parseTimelineLimit(undefined)).toBe(100);
    expect(parseTimelineLimit("5")).toBe(100);
    expect(parseTimelineLimit("300")).toBe(300);
    expect(parseTimelineLimit("99999")).toBe(500);
    expect(parseTimelineLimit("abc")).toBe(100);
  });

  it("reads the month in India time, not UTC", () => {
    // 20:00Z on 30 Nov is 01:30 IST on 1 Dec.
    const { from, to } = getPeriodRange("month", new Date("2026-11-30T20:00:00.000Z"));
    expect(from).toEqual(new Date(2026, 11, 1));
    expect(to).toEqual(new Date(2026, 11, 31, 23, 59, 59, 999));
    expect(getPeriodRange("year", new Date("2026-12-31T20:00:00.000Z")).from).toEqual(
      new Date(2027, 0, 1),
    );
  });

  it("maps entry types to domains", () => {
    expect(timelineDomain("NIGHT_DUTY")).toBe("NIGHT_DUTY");
    expect(timelineDomain("TRAVEL")).toBe("TRAVEL");
    expect(timelineDomain("pending")).toBeUndefined();
    expect(timelineDomain("all")).toBeUndefined();
  });

  it("covers the whole month, including days still to come", () => {
    const { from, to } = getPeriodRange("month", new Date(2026, 10, 8));
    expect(from).toEqual(new Date(2026, 10, 1));
    expect(to).toEqual(new Date(2026, 10, 30, 23, 59, 59, 999));
    expect(getPeriodRange("all")).toEqual({});
  });
});

describe("nav routes", () => {
  it("is active on the route and below it, not on a lookalike", () => {
    expect(isActive("/timeline", "/timeline")).toBe(true);
    expect(isActive("/timeline/abc/edit", "/timeline")).toBe(true);
    expect(isActive("/timelines", "/timeline")).toBe(false);
  });

  it("maps the secondary pages to the More tab", () => {
    for (const path of ["/more", "/leaves", "/leaves/x", "/reports/insights", "/settings/holidays", "/profile", "/search"]) {
      expect(isMoreActive(path)).toBe(true);
    }
    expect(isMoreActive("/timeline")).toBe(false);
    expect(isMoreActive("/leavesX")).toBe(false);
  });

  it("keeps the domain-plus-pending redirect as plain pending", () => {
    expect(recordsRedirectHref("cr", "pending")).toBe("/timeline?filter=pending");
  });
});

describe("report summary helpers", () => {
  it("shifts months across year ends", () => {
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 3 }, 0)).toEqual({ year: 2026, month: 3 });
  });

  it("labels months without timezone drift", () => {
    expect(monthLabel({ year: 2026, month: 11 })).toBe("November 2026");
    expect(shortMonthLabel({ year: 2027, month: 1 })).toBe("Jan 2027");
    expect(isSameMonth({ year: 2026, month: 11 }, { year: 2026, month: 11 })).toBe(true);
    expect(isSameMonth({ year: 2025, month: 11 }, { year: 2026, month: 11 })).toBe(false);
  });

  it("treats a draft or missing bill as not billed, not as due", () => {
    const bill = (paid: number, outstanding: number, status: string) => ({
      paid,
      outstanding,
      total: paid + outstanding,
      status,
    });
    expect(rollUpClaims([{ total: 0, settlement: null }])).toMatchObject({
      unbilled: 0,
      billed: false,
      allPaid: false,
    });
    expect(rollUpClaims([{ total: 901, settlement: bill(0, 901, "DRAFT") }])).toMatchObject({
      unbilled: 901,
      outstanding: 0,
      billed: false,
    });
    expect(rollUpClaims([{ total: 700, settlement: null }])).toMatchObject({ unbilled: 700 });
  });

  it("rolls billed claims into received and due", () => {
    const bill = (paid: number, outstanding: number, status: string) => ({
      paid,
      outstanding,
      total: paid + outstanding,
      status,
    });
    const mixed = rollUpClaims([
      { total: 500, settlement: bill(500, 0, "PAID") },
      { total: 300, settlement: bill(0, 300, "PASSED") },
    ]);
    expect(mixed).toMatchObject({ paid: 500, outstanding: 300, billed: true, allPaid: false });
    expect(
      rollUpClaims([
        { total: 500, settlement: bill(500, 0, "PAID") },
        { total: 0, settlement: null },
      ]).allPaid,
    ).toBe(true);
    // Money from one domain still unbilled keeps it from being "all paid".
    expect(
      rollUpClaims([
        { total: 500, settlement: bill(500, 0, "PAID") },
        { total: 200, settlement: null },
      ]),
    ).toMatchObject({ allPaid: false, unbilled: 200 });
  });

  it("flags a bill paid below the claim as short-paid", () => {
    const r = rollUpClaims([
      { total: 1000, settlement: { paid: 800, outstanding: 200, total: 1000, status: "PAID" } },
    ]);
    expect(r).toMatchObject({ shortPaid: true, allPaid: false, outstanding: 200 });
  });

  it("compares with the previous month", () => {
    expect(monthDelta(0, 0)).toBeNull();
    expect(monthDelta(1500, 1000)).toEqual({ diff: 500, direction: "up" });
    expect(monthDelta(400, 1000)).toEqual({ diff: 600, direction: "down" });
    expect(monthDelta(1000, 1000)).toEqual({ diff: 0, direction: "same" });
    expect(monthDelta(300, 0)).toEqual({ diff: 300, direction: "up" });
  });

  it("parses a report month and falls back to the current one", () => {
    const now = new Date("2026-11-08T06:00:00.000Z");
    expect(parseReportMonth("2026-03", now)).toEqual({ year: 2026, month: 3 });
    expect(parseReportMonth("2026-13", now)).toEqual({ year: 2026, month: 11 });
    expect(parseReportMonth("foo", now)).toEqual({ year: 2026, month: 11 });
    expect(parseReportMonth(undefined, now)).toEqual({ year: 2026, month: 11 });
  });

  it("reads the current month in India, not UTC", () => {
    // 20:00Z on 30 Nov is 01:30 IST on 1 Dec.
    expect(currentReportMonth(new Date("2026-11-30T20:00:00.000Z"))).toEqual({
      year: 2026,
      month: 12,
    });
  });

  it("finds the financial year for January to March and April onwards", () => {
    expect(financialYearOf({ year: 2027, month: 2 }).label).toBe("FY 2026-27");
    expect(financialYearOf({ year: 2026, month: 4 }).label).toBe("FY 2026-27");
    expect(financialYearOf({ year: 2026, month: 3 }).label).toBe("FY 2025-26");
  });

  it("buckets money April to March and ignores anything outside the year", () => {
    const series = fyMonthSeries(2026, [
      { occurredAt: new Date(2026, 3, 5), amount: 100 },
      { occurredAt: new Date(2026, 3, 20), amount: 50.5 },
      { occurredAt: new Date(2027, 2, 31), amount: 75 },
      { occurredAt: new Date(2026, 2, 31), amount: 999 },
    ]);
    expect(series).toHaveLength(12);
    expect(series[0]).toEqual({ year: 2026, month: 4, amount: 150.5 });
    expect(series[11]).toEqual({ year: 2027, month: 3, amount: 75 });
    expect(series.reduce((s, m) => s + m.amount, 0)).toBe(225.5);
  });

  it("scales chart bars to the tallest month and keeps a tick for empty ones", () => {
    expect(barPercents([0, 50, 100])).toEqual([4, 50, 100]);
    expect(barPercents([0, 0])).toEqual([4, 4]);
    expect(barPercents([1, 100])).toEqual([4, 100]);
  });

  it("computes shares safely", () => {
    expect(sharePercent(1, 4)).toBe(25);
    expect(sharePercent(0, 0)).toBe(0);
  });
});

describe("claim settlement views", () => {
  const ev = (
    id: string,
    eventType: string,
    day: string,
    payload: unknown = {},
  ) => ({
    id,
    eventType,
    payload,
    recordedAt: new Date(`${day}T10:00:00.000Z`),
    occurredAt: new Date(`${day}T10:00:00.000Z`),
  });
  const settlement = {
    ...ev("s1", "MONTHLY_CLAIM_SETTLEMENT", "2026-11-01", { year: 2026, month: 11, currentStatus: "DRAFT" }),
    title: "Night Duty — November 2026",
    domain: "NIGHT_DUTY",
  };
  const claims = [
    { occurredAt: new Date("2026-11-06T00:00:00.000Z"), payload: { amount: 450.53 } },
    { occurredAt: new Date("2026-11-07T00:00:00.000Z"), payload: { amount: 450.53 } },
  ];

  it("starts as an unbilled draft worth the sum of its entries", () => {
    const v = buildSettlementView({ settlement, steps: [], claims });
    expect(v).toMatchObject({
      status: "DRAFT",
      total: 901.06,
      paid: 0,
      outstanding: 901.06,
      shortPaid: 0,
      entryCount: 2,
      year: 2026,
      month: 11,
    });
    expect(v.firstEntry).toEqual(new Date("2026-11-06T00:00:00.000Z"));
    expect(v.lastEntry).toEqual(new Date("2026-11-07T00:00:00.000Z"));
  });

  it("follows the bill, pass and payment steps and records their details", () => {
    const steps = [
      ev("p", "PAYMENT_RECEIVED", "2026-11-20", { to: "PAID", amount: 901.06, paymentReference: "UTR9" }),
      ev("b", "BILL_SUBMITTED", "2026-11-10", { to: "BILL_SUBMITTED", billNumber: "B7" }),
      ev("c", "CLAIM_PASSED", "2026-11-15", { to: "PASSED" }),
    ];
    const v = buildSettlementView({ settlement, steps, claims });
    expect(v.status).toBe("PAID");
    expect(v).toMatchObject({ paid: 901.06, outstanding: 0, shortPaid: 0 });
    expect(v.bill?.number).toBe("B7");
    expect(v.passedAt).toEqual(new Date("2026-11-15T10:00:00.000Z"));
    expect(v.payments).toEqual([
      { at: new Date("2026-11-20T10:00:00.000Z"), amount: 901.06, reference: "UTR9" },
    ]);
  });

  it("reports a bill paid below the claim as short-paid", () => {
    const steps = [ev("p", "PAYMENT_RECEIVED", "2026-11-20", { to: "PAID", amount: 800 })];
    const v = buildSettlementView({ settlement, steps, claims });
    expect(v).toMatchObject({ status: "PAID", paid: 800, outstanding: 101.06, shortPaid: 101.06 });
    expect(isOpen(v)).toBe(true);
  });

  it("counts a payment recorded without an amount as the full total", () => {
    const steps = [ev("p", "PAYMENT_RECEIVED", "2026-11-20", { to: "PAID" })];
    const v = buildSettlementView({ settlement, steps, claims });
    expect(v).toMatchObject({ paid: 901.06, outstanding: 0 });
  });

  it("is open until paid in full", () => {
    const draft = buildSettlementView({ settlement, steps: [], claims });
    expect(isOpen(draft)).toBe(true);
    const paid = buildSettlementView({
      settlement,
      steps: [ev("p", "PAYMENT_RECEIVED", "2026-11-20", { to: "PAID", amount: 901.06 })],
      claims,
    });
    expect(isOpen(paid)).toBe(false);
    expect(isOpen(buildSettlementView({ settlement, steps: [], claims: [] }))).toBe(false);
  });

  const mk = (domain: "NIGHT_DUTY" | "TRAVEL", year: number, month: number, total: number, steps: ReturnType<typeof ev>[] = []) =>
    buildSettlementView({
      settlement: {
        ...ev(`${domain}-${year}-${month}`, "MONTHLY_CLAIM_SETTLEMENT", `${year}-${String(month).padStart(2, "0")}-01`, {
          year,
          month,
          currentStatus: "DRAFT",
        }),
        title: "t",
        domain,
      },
      steps,
      claims: [{ occurredAt: new Date(year, month - 1, 5), payload: { amount: total } }],
    });

  it("groups both bills of a month, night duty first, newest month first", () => {
    const groups = groupByMonth([
      mk("TRAVEL", 2026, 10, 1000),
      mk("TRAVEL", 2026, 11, 700),
      mk("NIGHT_DUTY", 2026, 11, 900),
    ]);
    expect(groups.map((g) => `${g.year}-${g.month}`)).toEqual(["2026-11", "2026-10"]);
    expect(groups[0].views.map((v) => v.domain)).toEqual(["NIGHT_DUTY", "TRAVEL"]);
    expect(groups[0]).toMatchObject({ total: 1600, outstanding: 1600, paid: 0 });
  });

  it("filters open, paid and all", () => {
    const paid = mk("NIGHT_DUTY", 2026, 10, 500, [
      ev("p", "PAYMENT_RECEIVED", "2026-10-20", { to: "PAID", amount: 500 }),
    ]);
    const open = mk("TRAVEL", 2026, 11, 700);
    expect(filterViews([paid, open], "open")).toEqual([open]);
    expect(filterViews([paid, open], "paid")).toEqual([paid]);
    expect(filterViews([paid, open], "all")).toHaveLength(2);
    expect(parseClaimsFilter("paid")).toBe("paid");
    expect(parseClaimsFilter("nonsense")).toBe("open");
    expect(parseClaimsFilter(undefined)).toBe("open");
  });

  it("totals what is due by stage and this year's claims by type", () => {
    const billed = mk("TRAVEL", 2026, 9, 400, [
      ev("b", "BILL_SUBMITTED", "2026-09-10", { to: "BILL_SUBMITTED" }),
    ]);
    const passed = mk("NIGHT_DUTY", 2026, 10, 600, [
      ev("b", "BILL_SUBMITTED", "2026-10-10", { to: "BILL_SUBMITTED" }),
      ev("c", "CLAIM_PASSED", "2026-10-12", { to: "PASSED" }),
    ]);
    const paid = mk("NIGHT_DUTY", 2026, 8, 500, [
      ev("p", "PAYMENT_RECEIVED", "2026-08-20", { to: "PAID", amount: 500 }),
    ]);
    const short = mk("TRAVEL", 2025, 12, 300, [
      ev("p", "PAYMENT_RECEIVED", "2026-01-05", { to: "PAID", amount: 250 }),
    ]);
    const draft = mk("TRAVEL", 2026, 11, 700);
    const o = buildOverview([billed, passed, paid, short, draft], 2026);
    expect(o.due).toBe(400 + 600 + 50 + 700);
    expect(o.openBills).toBe(4);
    expect(o.stages.DRAFT).toEqual({ amount: 700, count: 1 });
    expect(o.stages.BILL_SUBMITTED).toEqual({ amount: 400, count: 1 });
    expect(o.stages.PASSED).toEqual({ amount: 600, count: 1 });
    expect(o.stages.SHORT_PAID).toEqual({ amount: 50, count: 1 });
    // The December 2025 bill is last year's: not in this year's figures.
    expect(o.yearClaimed).toBe(400 + 600 + 500 + 700);
    expect(o.yearReceived).toBe(500);
    expect(o.nightDuty).toEqual({ amount: 1100, count: 2 });
    expect(o.travel).toEqual({ amount: 1100, count: 2 });
  });

  it("says how long a bill has been waiting", () => {
    const now = new Date("2026-11-20T06:00:00.000Z");
    const billed = buildSettlementView({
      settlement,
      steps: [ev("b", "BILL_SUBMITTED", "2026-11-08", { to: "BILL_SUBMITTED", billNumber: "B1" })],
      claims,
    });
    expect(waitingNote(billed, now)).toBe("Billed 12 days ago");
    const passedToday = buildSettlementView({
      settlement,
      steps: [
        ev("b", "BILL_SUBMITTED", "2026-11-08", { to: "BILL_SUBMITTED" }),
        ev("c", "CLAIM_PASSED", "2026-11-20", { to: "PASSED" }),
      ],
      claims,
    });
    expect(waitingNote(passedToday, now)).toBe("Passed today");
    expect(waitingNote(buildSettlementView({ settlement, steps: [], claims }), now)).toBeNull();
  });

  it("treats a month reopened after payment as open again, owing only the new entry", () => {
    const steps = [
      ev("b", "BILL_SUBMITTED", "2026-11-10", { to: "BILL_SUBMITTED", billNumber: "B7" }),
      ev("p", "PAYMENT_RECEIVED", "2026-11-20", { to: "PAID", amount: 901.06 }),
      ev("r", "STATUS_CHANGED", "2026-11-25", { from: "PAID", to: "DRAFT", reason: "supplementary" }),
    ];
    const withNew = [...claims, { occurredAt: new Date("2026-11-24T00:00:00.000Z"), payload: { amount: 200 } }];
    const v = buildSettlementView({ settlement, steps, claims: withNew });
    expect(v).toMatchObject({ status: "DRAFT", total: 1101.06, paid: 901.06, outstanding: 200 });
    expect(isOpen(v)).toBe(true);
    const o = buildOverview([v], 2026);
    expect(o.stages.DRAFT).toEqual({ amount: 200, count: 1 });
    expect(o.due).toBe(200);
    expect(o.yearReceived).toBe(901.06);
  });

  it("owes nothing after a reopen when the old payment covered a legacy total", () => {
    const steps = [
      ev("p", "PAYMENT_RECEIVED", "2026-11-20", { to: "PAID" }),
      ev("r", "STATUS_CHANGED", "2026-11-25", { from: "PAID", to: "DRAFT" }),
    ];
    const v = buildSettlementView({ settlement, steps, claims });
    expect(v).toMatchObject({ paid: 901.06, outstanding: 0 });
    const o = buildOverview([v], 2026);
    expect(o.due).toBe(0);
    expect(o.stages.DRAFT.amount).toBe(0);
  });

  it("keeps the overview due equal to what the open month headers add up to", () => {
    const views = [
      mk("TRAVEL", 2026, 10, 1000),
      mk("NIGHT_DUTY", 2026, 11, 900),
      mk("TRAVEL", 2026, 11, 700, [ev("b", "BILL_SUBMITTED", "2026-11-09", { to: "BILL_SUBMITTED" })]),
      mk("NIGHT_DUTY", 2026, 9, 500, [ev("p", "PAYMENT_RECEIVED", "2026-09-30", { to: "PAID", amount: 500 })]),
    ];
    const open = groupByMonth(filterViews(views, "open"));
    const fromHeaders = Math.round(open.reduce((s, g) => s + g.outstanding, 0) * 100) / 100;
    expect(buildOverview(views, 2026).due).toBe(fromHeaders);
    expect(fromHeaders).toBe(2600);
  });

  it("describes each step for the stepper", () => {
    const v = buildSettlementView({
      settlement,
      steps: [
        ev("b", "BILL_SUBMITTED", "2026-11-10", { to: "BILL_SUBMITTED", billNumber: "B7" }),
        ev("p", "PAYMENT_RECEIVED", "2026-11-20", { to: "PAID", amount: 901.06, paymentReference: "UTR9" }),
      ],
      claims,
    });
    const d = stepDetails(v);
    expect(d.BILL_SUBMITTED).toEqual({ date: "10 Nov 2026", note: "Bill B7" });
    expect(d.PAID).toEqual({ date: "20 Nov 2026", note: "₹901.06 received · UTR9" });
    expect(d.PASSED).toBeUndefined();
  });
});

describe("daysSince", () => {
  it("counts calendar days in India, not elapsed hours", () => {
    // 18:00Z is 23:30 IST the same day; 19:00Z is 00:30 IST the next day.
    expect(daysSince(new Date("2026-11-10T18:00:00.000Z"), new Date("2026-11-10T19:00:00.000Z"))).toBe(1);
    expect(daysSince(new Date("2026-11-10T01:00:00.000Z"), new Date("2026-11-10T17:00:00.000Z"))).toBe(0);
    expect(daysSince(new Date("2026-11-08T06:00:00.000Z"), new Date("2026-11-20T06:00:00.000Z"))).toBe(12);
  });
});
