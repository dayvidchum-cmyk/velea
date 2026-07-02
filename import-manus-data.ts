/**
 * One-time import script: loads Manus JSON export into the local MySQL database.
 * Run with:  npx tsx import-manus-data.ts
 *
 * Maps Manus userId:1 → local userId:2 (david@velea.local).
 * Inserts profiles, projects, tasks, and reflections preserving the original IDs
 * so all foreign-key references stay intact.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb } from "./server/db";
import {
  users,
  profiles,
  projects,
  tasks,
  reflections,
} from "./drizzle/schema";

const LOCAL_USER_ID = 2; // david@velea.local

// ── Data ────────────────────────────────────────────────────────────────────

const PROFILES = [
  { id: 30001, name: "David Chum", birthDate: "1982-04-13", birthTime: "17:20", birthLocationCity: "Morong, Bataan", birthLocationLat: "14.6797", birthLocationLon: "120.2675", birthTimezone: "Asia/Manila", isOwner: true, isActive: true, lagnaSign: "Virgo", sunHouse: 7, moonHouse: 3, marsHouse: 1, mercuryHouse: 8, jupiterHouse: 2, venusHouse: 6, saturnHouse: 1, rahuHouse: 10, ketuHouse: 4, ascendantDegree: "17.64" },
  { id: 210001, name: "Lang", birthDate: "1989-11-18", birthTime: "17:32", birthLocationCity: "Boston, MA", birthLocationLat: "42.355508", birthLocationLon: "-71.056536", birthTimezone: "America/New_York", isOwner: false, isActive: false, lagnaSign: "Taurus", sunHouse: 7, moonHouse: 3, marsHouse: 6, mercuryHouse: 7, jupiterHouse: 2, venusHouse: 8, saturnHouse: 8, rahuHouse: 9, ketuHouse: 3, ascendantDegree: "24.88" },
  { id: 270001, name: "Lisa", birthDate: "1982-02-20", birthTime: "20:39", birthLocationCity: "West Islip, NY", birthLocationLat: "40.706210", birthLocationLon: "-73.306230", birthTimezone: "America/New_York", isOwner: false, isActive: false, lagnaSign: "Virgo", sunHouse: 6, moonHouse: 5, marsHouse: 1, mercuryHouse: 5, jupiterHouse: 2, venusHouse: 5, saturnHouse: 1, rahuHouse: 10, ketuHouse: 4, ascendantDegree: "15.99" },
  { id: 300001, name: "Simone", birthDate: "1988-05-25", birthTime: "06:32", birthLocationCity: "Providence, RI", birthLocationLat: "41.824484", birthLocationLon: "-71.412746", birthTimezone: "America/New_York", isOwner: false, isActive: false, lagnaSign: "Taurus", sunHouse: 1, moonHouse: 4, marsHouse: 10, mercuryHouse: 2, jupiterHouse: 12, venusHouse: 2, saturnHouse: 8, rahuHouse: 10, ketuHouse: 4, ascendantDegree: "29.36" },
  { id: 330001, name: "Krista", birthDate: "1982-04-28", birthTime: "08:40", birthLocationCity: "Suffern, NY 10901", birthLocationLat: "41.114818", birthLocationLon: "-74.149589", birthTimezone: "America/New_York", isOwner: false, isActive: false, lagnaSign: "Gemini", sunHouse: 11, moonHouse: 1, marsHouse: 4, mercuryHouse: 12, jupiterHouse: 5, venusHouse: 9, saturnHouse: 4, rahuHouse: 1, ketuHouse: 7, ascendantDegree: "1.00" },
  { id: 330002, name: "Linda Trifari", birthDate: "1983-04-29", birthTime: "08:02", birthLocationCity: "Fall River, MA", birthLocationLat: "41.701390", birthLocationLon: "-71.155229", birthTimezone: "America/New_York", isOwner: false, isActive: false, lagnaSign: "Taurus", sunHouse: 12, moonHouse: 7, marsHouse: 12, mercuryHouse: 1, jupiterHouse: 7, venusHouse: 1, saturnHouse: 6, rahuHouse: 2, ketuHouse: 8, ascendantDegree: "25.78" },
];

const PROJECTS = [
  { id: 1, profileId: 30001, name: "MEMOIRS-BOOK ONE: INSIDE THE AURA", archivedAt: null },
  { id: 2, profileId: 30001, name: "MONI MEKHALA & REAM EYSO", archivedAt: null },
  { id: 3, profileId: 30001, name: "VELEA", archivedAt: null },
  { id: 4, profileId: 30001, name: "HOME: CLEANING", archivedAt: new Date("2026-06-05T21:57:50.000Z") },
  { id: 5, profileId: 30001, name: "DCPC", archivedAt: null },
  { id: 6, profileId: 30001, name: "FINANCIAL STABILIZATION", archivedAt: null },
  { id: 7, profileId: 30001, name: "STUDIO", archivedAt: null },
  { id: 8, profileId: 30001, name: "CONTENT & BRAND", archivedAt: null },
  { id: 9, profileId: 30001, name: "HEALTH & SELF-CARE", archivedAt: null },
  { id: 10, profileId: 30001, name: "HOME", archivedAt: null },
  { id: 30001, profileId: 30001, name: "DCPC • Consumer Cosmetic Products & Pro Tools", archivedAt: null },
  { id: 60001, profileId: 30001, name: "FENG SHUI", archivedAt: null },
  { id: 90001, profileId: 30001, name: "PEOPLE", archivedAt: null },
];

const REFLECTIONS = [
  { id: 1, profileId: 30001, date: "2026-05-22", content: "Long intimate oral worship MCD, scoop n scootery, attached doors, put down runner, fine-tuned this app " },
  { id: 30001, profileId: 30001, date: "2026-06-01", content: "Primary Mode: Build\nConstraint: Selective\n\nBuild Day — Expansion Restricted" },
  { id: 60001, profileId: 30001, date: "2026-06-02", content: "-sex at 3AM with Larry, the 40-something, white South African Health Sector Finance guy. Average, but vibes are strong, physical chemistry is strong. He is married though. He is perfect for FB or FWB because hard to schedule so won't distract me. " },
  { id: 90001, profileId: 30001, date: "2026-06-03", content: "Woke up singing and dancing even after only 4-5 hours of sleep. Lang stayed over. Left after coffee. By the time he left I had already written more in the memoir. Today I am finding it easy to flow from memoir, to app development, to PMU procedure analysis for an upcoming touch-up, to Moni Mekhala development, to texts with family. " },
  { id: 120001, profileId: 30001, date: "2026-06-07", content: "Slept in until noon. Froze for a bit. Had a coffee. Went back to sleep until 3. Took my Adderall, in bed for a bit before I decided to get up to either write or work on the accounting stuff. Wrote for a solid 3 hours and then cleaned, smoked, caught up with coven via text. \n\nTook 2nd adderall around 9 PM. Steady progress today. I'm incapable of just devoting all my attention on one thing. So I spend as long as possible with something before I am compelled to move along. \n\nI also consciously told the evil ADHD demon in my head to shut up. It needs a new name. Hannah sucks. I thought maybe Oscar. \n" },
  { id: 150001, profileId: 30001, date: "2026-06-08", content: "Stayed up and cleaned and worked on other things. Continued to yell at my inner demon. \n\nFound myself getting sucked into my phone, per usual, when I would open it to do one simple thing. \n\nThinking I will start using detox lock more \n\nPurging a little bit today  " },
  { id: 180001, profileId: 30001, date: "2026-06-11", content: "Isolation is real when you are building. First my sister, now Lisa. I am the wizard in the watchtower. Locked away by himself. " },
  { id: 210001, profileId: 30001, date: "2026-06-15", content: "I met Chanda. Synchronicities. " },
  { id: 240001, profileId: 30001, date: "2026-06-17", content: "I was hungover and didn't do anything besides work on the styling of Velea too many times because Manus kept fucking up " },
  { id: 270001, profileId: 30001, date: "2026-06-18", content: "Greg visited. Reece responded with feedback on memoir aligned with the current edits anyway. Awesome. No check from saks. No response at the deadline yesterday. I sent them a follow-up email. " },
  { id: 300001, profileId: 30001, date: "2026-06-21", content: "Father's Day. Did not sleep, but it's fine. " },
  { id: 330001, profileId: 30001, date: "2026-06-22", content: "Hard to focus. Even the AI I can usually count on was glitching-Claude. Mercury Rx is in 2 days." },
];

// Tasks array — all 154 tasks
const TASKS = [
  { id: 1, profileId: 30001, title: "Clean bedroom", mode: "Build", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 10, cognitiveLoad: "Medium", physicalLoad: "Medium", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782259199999, notes: null },
  { id: 2, profileId: 30001, title: "Clean fish tank", mode: "Build", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-05-30", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 3, profileId: 30001, title: "Clean bathroom", mode: "Selective", priority: "Low", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 10, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1781896804165, notes: null },
  { id: 5, profileId: 30001, title: "Edit homepage", mode: "Build", priority: "Medium", isPinned: true, isCompleted: true, completedAt: new Date("2026-05-23T15:07:26.000Z"), dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 60001, profileId: 30001, title: "Fold laundry", mode: "Action", priority: "High", isPinned: true, isCompleted: true, completedAt: new Date("2026-05-20T18:47:08.000Z"), dueDate: "2026-05-18", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 90001, profileId: 30001, title: "Clean kitty litter", mode: "Action", priority: "High", isPinned: false, isCompleted: true, completedAt: new Date("2026-05-25T02:37:12.000Z"), dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 120001, profileId: 30001, title: "Edit body pages", mode: "Build", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 5, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782431999999, notes: null },
  { id: 120002, profileId: 30001, title: "Add FAQ to all pages for Ai optimization search", mode: "Build", priority: "Medium", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 150001, profileId: 30001, title: "Clean kitchen", mode: "Restraint", priority: "Medium", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: 10, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 180001, profileId: 30001, title: "Clean Livingroom", mode: "Build", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 10, cognitiveLoad: "Medium", physicalLoad: "Medium", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782345599999, notes: null },
  { id: 180002, profileId: 30001, title: "Continue with Velea app", mode: "Restraint", priority: "Low", isPinned: false, isCompleted: true, completedAt: new Date("2026-05-25T02:39:30.000Z"), dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 180003, profileId: 30001, title: "Continue with content schedule this week", mode: "Restraint", priority: "Medium", isPinned: true, isCompleted: true, completedAt: new Date("2026-05-24T22:03:23.000Z"), dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 210001, profileId: 30001, title: "Pull photos and info for styling carousel", mode: "Action", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 240002, profileId: 30001, title: "Review Budget", mode: "Build", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 270001, profileId: 30001, title: "Check e-mail", mode: "Action", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: "2026-05-25", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 300001, profileId: 30001, title: "Make client check-in calendar ", mode: "Restraint", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 5, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 330001, profileId: 30001, title: "Finish 2025 Taxes", mode: "Selective", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: true, projectId: 6, cognitiveLoad: "High", physicalLoad: "Medium", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 330002, profileId: 30001, title: "NDR Lawsuit emails ", mode: "Action", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 6, cognitiveLoad: "Low", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1781999999999, notes: null },
  { id: 330003, profileId: 30001, title: "List stuff to sell", mode: "Build", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 6, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1781999999999, notes: null },
  { id: 360001, profileId: 30001, title: "Content Calendar ", mode: "Action", priority: "Low", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 8, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1781999999999, notes: null },
  { id: 360002, profileId: 30001, title: "Schedule case studies post ", mode: "Action", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-05-27", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 360003, profileId: 30001, title: "Review Saks Bankruptcy letter ", mode: "Action", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-05-27", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 360004, profileId: 30001, title: "Finish Ai self-portrait carousel", mode: "Build", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 360005, profileId: 30001, title: "Finish May photo dump ", mode: "Build", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 360006, profileId: 30001, title: "Update emails for wardrobe on Acuity ", mode: "Restraint", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 5, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782086399999, notes: null },
  { id: 360007, profileId: 30001, title: "Email lawyers", mode: "Selective", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 6, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1781999999999, notes: null },
  { id: 390001, profileId: 30001, title: "Get iPhones fixed at Apple ", mode: "Selective", priority: "Medium", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: 9, cognitiveLoad: "Medium", physicalLoad: "Medium", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 390002, profileId: 30001, title: "Water plants home ", mode: "Action", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 390003, profileId: 30001, title: "Water plants studio", mode: "Restraint", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 390004, profileId: 30001, title: "Paint last green wall studio ", mode: "Build", priority: "Low", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 7, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782431999999, notes: null },
  { id: 390005, profileId: 30001, title: "Chart Christine & Send Pre-care after dinner time ", mode: "Restraint", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: "2026-06-03", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 390006, profileId: 30001, title: "Pigment reference guide ", mode: "Build", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 5, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782431999999, notes: null },
  { id: 390007, profileId: 30001, title: "Research grants ", mode: "Selective", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 6, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1781999999999, notes: null },
  { id: 390008, profileId: 30001, title: "Laundry", mode: "Selective", priority: "Low", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 10, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1781913599999, notes: null },
  { id: 420001, profileId: 30001, title: "Sell digital art on print platforms", mode: "Restraint", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 6, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1781999999999, notes: null },
  { id: 450001, profileId: 30001, title: "Call BOA about Apple refund $96 or $91 ", mode: "Restraint", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: 6, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 480001, profileId: 30001, title: "Check for a link for Saks bankruptcy thing ", mode: "Build", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-05-28", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 510001, profileId: 30001, title: "FedEx to print and mail", mode: "Build", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-05-28", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 510002, profileId: 30001, title: "BOA deposit money", mode: "Restraint", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: "2026-06-03", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 540001, profileId: 30001, title: "Fine tune budget", mode: "Restraint", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-06-03", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 540002, profileId: 30001, title: "Send Andrade grocery list ", mode: "Restraint", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: "2026-05-30", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 570001, profileId: 30001, title: "Edit prologue voice notes into a single file ", mode: "Build", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 1, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782431999999, notes: null },
  { id: 570002, profileId: 30001, title: "Download prologue onto hardrive/thumbdrive. ", mode: "Build", priority: "Low", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 1, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782431999999, notes: null },
  { id: 570003, profileId: 30001, title: "Move content into archive folders ", mode: "Build", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 1, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782518399999, notes: null },
  { id: 600001, profileId: 30001, title: "Schedule RAFT email", mode: "Build", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-06-01", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 600002, profileId: 30001, title: "Contact SNAP", mode: "Restraint", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 6, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782086399999, notes: null },
  { id: 660001, profileId: 30001, title: "Moni Mekhala & Ream Eyso", mode: "Build", priority: "Medium", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 660002, profileId: 30001, title: "Moni Mekhala & Ream Eyso", mode: "Restraint", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 2, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1781913599999, notes: null },
  { id: 690001, profileId: 30001, title: "Audit current digital campaigns ", mode: "Restraint", priority: "Medium", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 690002, profileId: 30001, title: "Audit current digital campaigns ", mode: "Selective", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 720001, profileId: 30001, title: "Set up dining area as an at home office ", mode: "Selective", priority: "Medium", isPinned: true, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: 10, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 750001, profileId: 30001, title: "Order 5U needles ", mode: "Restraint", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: "2026-06-03", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 750002, profileId: 30001, title: "Order fine U shaped microblogs ", mode: "Restraint", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 780001, profileId: 30001, title: "Block off all restraint days on acuity ", mode: "Restraint", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-06-03", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 810001, profileId: 30001, title: "Analyze Kian's current progress check-in ", mode: "Restraint", priority: "Medium", isPinned: false, isCompleted: true, completedAt: null, dueDate: "2026-06-04", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 810002, profileId: 30001, title: "Book Amtrak to PVD for Father's Day ", mode: "Restraint", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-06-03", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 810003, profileId: 30001, title: "Pay DCPC rent", mode: "Restraint", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-06-03", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 810004, profileId: 30001, title: "Place Amazon order ", mode: "Restraint", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-06-03", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 840001, profileId: 30001, title: "Audit photos for sale items ", mode: "Restraint", priority: "Medium", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-06-03", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 840002, profileId: 30001, title: "Write descriptions and prices for sale items", mode: "Restraint", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-06-03", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 840003, profileId: 30001, title: "Text Audrey for in-person check", mode: "Selective", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-06-04", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 840004, profileId: 30001, title: "Move all list items from iPhone to Velea", mode: "Restraint", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 9, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1781896811239, notes: null },
  { id: 870001, profileId: 30001, title: "Research aesthetics license ", mode: "Restraint", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-06-03", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 900001, profileId: 30001, title: "Groceries", mode: "Restraint", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-06-03", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 930001, profileId: 30001, title: "Work on Velea", mode: "Selective", priority: "Medium", isPinned: true, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 930002, profileId: 30001, title: "create Epinephrine Carousel for 6pm", mode: "Selective", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 930003, profileId: 30001, title: "End night with memoir writing", mode: "Build", priority: "Medium", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: true, projectId: 1, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 960001, profileId: 30001, title: "Budget review and strategy", mode: "Selective", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-06-04", wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 990001, profileId: 30001, title: "set-up robot vac again. ", mode: "Build", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 10, cognitiveLoad: "Low", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782086399999, notes: null },
  { id: 1050001, profileId: 30001, title: "Check Vision Insurance", mode: "Restraint", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 9, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "High", snoozedUntil: 1781999999999, notes: null },
  { id: 1050002, profileId: 30001, title: "Email", mode: "Selective", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: true, projectId: 6, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: true, emotionalLoad: "High", snoozedUntil: null, notes: null },
  { id: 1050003, profileId: 30001, title: "Post Blue Jay", mode: "Selective", priority: "Medium", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1050004, profileId: 30001, title: "Create Follow-up emails for touch-ups", mode: "Selective", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1080001, profileId: 30001, title: "Create Digital Gift Certificates ", mode: "Build", priority: "Low", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 5, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782518399999, notes: null },
  { id: 1110001, profileId: 30001, title: "text Audrey again", mode: "Selective", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1140001, profileId: 30001, title: "Continue bankruptcy research", mode: "Restraint", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: true, projectId: 6, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "High", snoozedUntil: 1781913599999, notes: "Just research and keep notes. Do not act on anything yet." },
  { id: 1170001, profileId: 30001, title: "Spot clean couch with flex", mode: "Selective", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1230001, profileId: 30001, title: "Bring into Studio", mode: "Action", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 7, cognitiveLoad: "High", physicalLoad: "High", creativeRequired: false, socialRequired: false, emotionalLoad: "High", snoozedUntil: 1782259199999, notes: null },
  { id: 1260001, profileId: 30001, title: "Feed the AI illustrations from the Golden Deer collection you never created. ", mode: "Restraint", priority: "Low", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 5, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782086399999, notes: null },
  { id: 1320001, profileId: 30001, title: "Research • Creative Residencies", mode: "Build", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 6, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782518399999, notes: null },
  { id: 1350001, profileId: 30001, title: "New T-mobile payment plan", mode: "Build", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-06-07", wealthFlow: true, projectId: 6, cognitiveLoad: "Low", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1350002, profileId: 30001, title: "Update money ledger", mode: "Build", priority: "High", isPinned: true, isCompleted: false, completedAt: null, dueDate: "2026-06-23", wealthFlow: true, projectId: 6, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "High", snoozedUntil: 1782262071878, notes: null },
  { id: 1380001, profileId: 30001, title: "Research", mode: "Build", priority: "Low", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: true, projectId: 60001, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1380002, profileId: 30001, title: "Move litter box to SW under table/desk. ", mode: "Selective", priority: "Medium", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: 10, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1410001, profileId: 30001, title: "Price your paintings", mode: "Build", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 6, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "High", snoozedUntil: 1782518399999, notes: null },
  { id: 1410002, profileId: 30001, title: "Follow 444 gallery", mode: "Action", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 5, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782259199999, notes: null },
  { id: 1440001, profileId: 30001, title: "Make income ideas sheet", mode: "Restraint", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 6, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1781999999999, notes: null },
  { id: 1470001, profileId: 30001, title: "Research Joseph Bruchac", mode: "Build", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 2, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782431999999, notes: null },
  { id: 1470002, profileId: 30001, title: "Shop used Apple Pencil", mode: "Selective", priority: "Low", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: 2, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1500001, profileId: 30001, title: "Images of the Gods: Khmer Mythology in Cambodia, Thailand and Laos by Vittorio Roveda", mode: "Build", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 2, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782431999999, notes: null },
  { id: 1500002, profileId: 30001, title: "Khmer Origins: Foundations of the Angkor Empire by A.J. Carmichael", mode: "Build", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 2, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782431999999, notes: null },
  { id: 1500003, profileId: 30001, title: "Moni Mekhala and Ream Eyso edited by Prumsodun Ok:", mode: "Restraint", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 2, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1781913599999, notes: null },
  { id: 1530001, profileId: 30001, title: "Penkuro (Pen Kakada)", mode: "Build", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 2, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782431999999, notes: null },
  { id: 1560001, profileId: 30001, title: "Linda", mode: "Restraint", priority: "Low", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 90001, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "High", snoozedUntil: 1782086399999, notes: null },
  { id: 1590001, profileId: 30001, title: "Simone & Gene Wedding Gift", mode: "Selective", priority: "Low", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 90001, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1781913599999, notes: null },
  { id: 1590002, profileId: 30001, title: "Coach Belt sale ", mode: "Selective", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: true, projectId: 6, cognitiveLoad: "Low", physicalLoad: "Medium", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1590003, profileId: 30001, title: "Brow Stencils", mode: "Build", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 30001, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782518399999, notes: null },
  { id: 1620001, profileId: 30001, title: "Mail SFA lawyer paper things ", mode: "Selective", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: "2026-06-09", wealthFlow: true, projectId: 6, cognitiveLoad: "Low", physicalLoad: "Medium", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1650001, profileId: 30001, title: "MCAD", mode: "Action", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: "2026-07-30", wealthFlow: true, projectId: 6, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "High", snoozedUntil: 1782243094689, notes: null },
  { id: 1650002, profileId: 30001, title: "Start SFA documentation ", mode: "Build", priority: "High", isPinned: true, isCompleted: false, completedAt: null, dueDate: "2026-06-23", wealthFlow: true, projectId: 6, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "High", snoozedUntil: 1782518399999, notes: null },
  { id: 1650003, profileId: 30001, title: "Print SFA documents ", mode: "Selective", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: "2026-06-08", wealthFlow: true, projectId: 6, cognitiveLoad: "Low", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1680001, profileId: 30001, title: "Research Artist housing, low-income housing ", mode: "Selective", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 6, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1781999999999, notes: null },
  { id: 1710001, profileId: 30001, title: "Survey Income Research ", mode: "Build", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 6, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1781999999999, notes: null },
  { id: 1740001, profileId: 30001, title: "Tell Psych to pause payments this month. ", mode: "Restraint", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: "2026-06-12", wealthFlow: true, projectId: 6, cognitiveLoad: "Low", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1770001, profileId: 30001, title: "Finish writing the prologue ", mode: "Selective", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-06-13", wealthFlow: false, projectId: 1, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1770002, profileId: 30001, title: "Write out the 3 part arc of this book", mode: "Restraint", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 1, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1781986254743, notes: "Karmik, although he was the catalyst, timing might be asking me to include him much much later in the future. " },
  { id: 1800001, profileId: 30001, title: "Check the laptop for any writing Pa may have left behind. ", mode: "Restraint", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-06-21", wealthFlow: true, projectId: 1, cognitiveLoad: "Low", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Medium", snoozedUntil: null, notes: "Check the boxes upstairs and ask mom about other places " },
  { id: 1830001, profileId: 30001, title: "Prepare for Chanda and Christine ", mode: "Build", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: "2026-06-15", wealthFlow: true, projectId: 5, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1860002, profileId: 30001, title: "Add litter", mode: "Build", priority: "Medium", isPinned: false, isCompleted: true, completedAt: null, dueDate: "2026-06-14", wealthFlow: false, projectId: 10, cognitiveLoad: "Low", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1860003, profileId: 30001, title: "Wash water fountain ", mode: "Build", priority: "Medium", isPinned: false, isCompleted: true, completedAt: null, dueDate: "2026-06-14", wealthFlow: false, projectId: 10, cognitiveLoad: "Low", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1860004, profileId: 30001, title: "Dracaena ", mode: "Build", priority: "Medium", isPinned: false, isCompleted: true, completedAt: null, dueDate: "2026-06-14", wealthFlow: false, projectId: 30001, cognitiveLoad: "Low", physicalLoad: "Medium", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1860005, profileId: 30001, title: "Remove nail polish", mode: "Build", priority: "Medium", isPinned: false, isCompleted: true, completedAt: null, dueDate: "2026-06-14", wealthFlow: false, projectId: 9, cognitiveLoad: "Low", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1860006, profileId: 30001, title: "Load MBTA card", mode: "Build", priority: "Medium", isPinned: false, isCompleted: true, completedAt: null, dueDate: "2026-06-14", wealthFlow: false, projectId: 7, cognitiveLoad: "Low", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1890001, profileId: 30001, title: "Fax claim stuff to BOA", mode: "Action", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: "2026-06-15", wealthFlow: true, projectId: 6, cognitiveLoad: "Medium", physicalLoad: "Medium", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782259199999, notes: null },
  { id: 1920001, profileId: 30001, title: "Stability housing office ", mode: "Build", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 6, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782518399999, notes: null },
  { id: 1950001, profileId: 30001, title: "Content Calendar", mode: "Action", priority: "Low", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 8, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1781913599999, notes: null },
  { id: 1950002, profileId: 30001, title: "stop the bleeding: contact these people", mode: "Build", priority: "High", isPinned: true, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 6, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "High", snoozedUntil: 1782518399999, notes: null },
  { id: 1950003, profileId: 30001, title: "Write google review for Salon Suites", mode: "Action", priority: "Medium", isPinned: true, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: true, projectId: 6, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1950004, profileId: 30001, title: "client outreach-create google review discount ", mode: "Restraint", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 5, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: true, socialRequired: true, emotionalLoad: "Low", snoozedUntil: 1781999999999, notes: null },
  { id: 1950005, profileId: 30001, title: "update inventory", mode: "Action", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: "2026-06-23", wealthFlow: false, projectId: 7, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782259199999, notes: null },
  { id: 1950006, profileId: 30001, title: "Christine", mode: "Action", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: "2026-06-15", wealthFlow: false, projectId: 5, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1950007, profileId: 30001, title: "latex practice new needles and blades ", mode: "Action", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-06-15", wealthFlow: false, projectId: 5, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1980001, profileId: 30001, title: "water plants", mode: "Action", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: 7, cognitiveLoad: "Low", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 1980002, profileId: 30001, title: "Print Case Studies cards to keep on display", mode: "Selective", priority: "Low", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 7, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1781913599999, notes: null },
  { id: 2010001, profileId: 30001, title: "Text Dani: which metals", mode: "Action", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: 5, cognitiveLoad: "Low", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 2010002, profileId: 30001, title: "Analyze Kishin's intake", mode: "Restraint", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 5, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1781913599999, notes: null },
  { id: 2010003, profileId: 30001, title: "contact grow light people about the stupid plug", mode: "Restraint", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 5, cognitiveLoad: "Low", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1781913599999, notes: null },
  { id: 2040001, profileId: 30001, title: "Edit current drafts in manuscript ", mode: "Build", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 1, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782433642412, notes: null },
  { id: 2070001, profileId: 30001, title: "Email Lisa's author lady", mode: "Selective", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: null, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: true, emotionalLoad: "Low", snoozedUntil: 1781913599999, notes: null },
  { id: 2100001, profileId: 30001, title: "Returns", mode: "Action", priority: "Low", isPinned: true, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 5, cognitiveLoad: "Medium", physicalLoad: "High", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782259199999, notes: null },
  { id: 2190001, profileId: 30001, title: "Finish prologue—again", mode: "Action", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: true, projectId: 1, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 2220001, profileId: 30001, title: "Find replacement single U shaped needles ", mode: "Action", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: true, projectId: 5, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 2250001, profileId: 30001, title: "Deposit cash ", mode: "Selective", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-06-19", wealthFlow: true, projectId: 6, cognitiveLoad: "Low", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 2280001, profileId: 30001, title: "Update Chanda's file ", mode: "Restraint", priority: "High", isPinned: true, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 5, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 2310001, profileId: 30001, title: "Govt Subcontracting ", mode: "Build", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 6, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782518399999, notes: null },
  { id: 2340001, profileId: 30001, title: "Create Vedic Astro Carousel", mode: "Action", priority: "Low", isPinned: true, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: true, projectId: 8, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: true, socialRequired: true, emotionalLoad: "Low", snoozedUntil: 1782259199999, notes: null },
  { id: 2340002, profileId: 30001, title: "Update expenses with express and other clothes for Saks from 2025, Chanel shit too.", mode: "Restraint", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: true, projectId: 6, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 2340003, profileId: 30001, title: "Research Aesthetician License for the future", mode: "Restraint", priority: "Low", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 5, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 2340004, profileId: 30001, title: "Order: FADE Medium Warm Brown", mode: "Restraint", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 5, cognitiveLoad: "Low", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 2340005, profileId: 30001, title: "Dentist Cleaning", mode: "Restraint", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 9, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 2340006, profileId: 30001, title: "Annual Physical", mode: "Restraint", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 9, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 2370001, profileId: 30001, title: "Run current Velea state through the AI", mode: "Build", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 3, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: true, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782431999999, notes: null },
  { id: 2370002, profileId: 30001, title: "Go through old photo albums: memoir prompts", mode: "Restraint", priority: "High", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: 1, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: true, socialRequired: true, emotionalLoad: "High", snoozedUntil: null, notes: null },
  { id: 2370003, profileId: 30001, title: "Nicotine Patches through health insurance, how?", mode: "Restraint", priority: "High", isPinned: true, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 9, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 2400001, profileId: 30001, title: "Microblading Insurance", mode: "Restraint", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 5, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: "Must also have saline removal as an option\n" },
  { id: 2430001, profileId: 30001, title: "Start using the 2026 Tax Organizer", mode: "Selective", priority: "High", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 5, cognitiveLoad: "High", physicalLoad: "Medium", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 2460001, profileId: 30001, title: "Add a recurring option on Velea for all tasks: daily, weekly, etc. Like Apple does. ", mode: "Build", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: false, projectId: 3, cognitiveLoad: "Low", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782431999999, notes: null },
  { id: 2490001, profileId: 30001, title: "Look up commuter rail schedules for Fridays this summer", mode: "Restraint", priority: "Low", isPinned: false, isCompleted: true, completedAt: null, dueDate: null, wealthFlow: false, projectId: 9, cognitiveLoad: "Low", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 2520001, profileId: 30001, title: "Reply to Chanda's photos", mode: "Action", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-06-22", wealthFlow: false, projectId: 5, cognitiveLoad: "Low", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782259199999, notes: null },
  { id: 2520002, profileId: 30001, title: "Clean Kitchen", mode: "Build", priority: "High", isPinned: true, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 10, cognitiveLoad: "Medium", physicalLoad: "Medium", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782449765179, notes: null },
  { id: 2520003, profileId: 30001, title: "Email SAKS", mode: "Action", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-06-24", wealthFlow: true, projectId: 6, cognitiveLoad: "Low", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782259199999, notes: null },
  { id: 2550001, profileId: 30001, title: "Add 2021-2024 start-up costs", mode: "Action", priority: "High", isPinned: true, isCompleted: true, completedAt: null, dueDate: "2026-06-23", wealthFlow: true, projectId: 6, cognitiveLoad: "Medium", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: null, notes: null },
  { id: 2580002, profileId: 30001, title: "Skill Selling", mode: "Build", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 6, cognitiveLoad: "High", physicalLoad: "Low", creativeRequired: false, socialRequired: false, emotionalLoad: "Low", snoozedUntil: 1782518399999, notes: null },
  { id: 2580003, profileId: 30001, title: "Work at beach", mode: "Action", priority: "Medium", isPinned: false, isCompleted: false, completedAt: null, dueDate: null, wealthFlow: true, projectId: 6, cognitiveLoad: "High", physicalLoad: "High", creativeRequired: true, socialRequired: true, emotionalLoad: "Low", snoozedUntil: null, notes: "Ambergris" },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // 1. Update user's profile/birth-chart fields (keep local email + passwordHash)
  console.log("Updating user profile data...");
  await db.update(users).set({
    name: "David Chum",
    role: "admin",
    locationCity: "Boston",
    locationLat: "42.358834",
    locationLon: "-71.057830",
    locationTimezone: "America/New_York",
    birthDate: "1982-04-13",
    birthTime: "17:20",
    birthLocationCity: "Morong, Bataan",
    birthLocationLat: "14.6797",
    birthLocationLon: "120.2675",
    birthTimezone: "Asia/Manila",
    lagnaSign: "Virgo",
    sunHouse: 7,
    moonHouse: 3,
    marsHouse: 1,
    mercuryHouse: 8,
    jupiterHouse: 2,
    venusHouse: 6,
    saturnHouse: 1,
    rahuHouse: 10,
    ketuHouse: 4,
    ascendantDegree: "17.64",
  }).where(eq(users.id, LOCAL_USER_ID));

  // 2. Profiles
  console.log(`Inserting ${PROFILES.length} profiles...`);
  for (const p of PROFILES) {
    await db.insert(profiles).values({
      id: p.id,
      userId: LOCAL_USER_ID,
      name: p.name,
      birthDate: p.birthDate ?? null,
      birthTime: p.birthTime ?? null,
      birthLocationCity: p.birthLocationCity ?? null,
      birthLocationLat: p.birthLocationLat ?? null,
      birthLocationLon: p.birthLocationLon ?? null,
      birthTimezone: p.birthTimezone ?? null,
      notes: null,
      isOwner: p.isOwner,
      isActive: p.isActive,
      lagnaSign: p.lagnaSign ?? null,
      sunHouse: p.sunHouse ?? null,
      moonHouse: p.moonHouse ?? null,
      marsHouse: p.marsHouse ?? null,
      mercuryHouse: p.mercuryHouse ?? null,
      jupiterHouse: p.jupiterHouse ?? null,
      venusHouse: p.venusHouse ?? null,
      saturnHouse: p.saturnHouse ?? null,
      rahuHouse: p.rahuHouse ?? null,
      ketuHouse: p.ketuHouse ?? null,
      ascendantDegree: p.ascendantDegree ?? null,
      archivedAt: null,
    }).onDuplicateKeyUpdate({ set: { name: p.name } });
  }

  // 3. Projects
  console.log(`Inserting ${PROJECTS.length} projects...`);
  for (const p of PROJECTS) {
    await db.insert(projects).values({
      id: p.id,
      userId: LOCAL_USER_ID,
      profileId: p.profileId,
      name: p.name,
      archivedAt: p.archivedAt,
    }).onDuplicateKeyUpdate({ set: { name: p.name } });
  }

  // 4. Tasks
  console.log(`Inserting ${TASKS.length} tasks...`);
  for (const t of TASKS) {
    await db.insert(tasks).values({
      id: t.id,
      userId: LOCAL_USER_ID,
      profileId: t.profileId,
      title: t.title,
      mode: t.mode as any,
      priority: t.priority as any,
      isPinned: t.isPinned,
      isCompleted: t.isCompleted,
      completedAt: t.completedAt,
      dueDate: t.dueDate ?? null,
      wealthFlow: t.wealthFlow,
      projectId: t.projectId ?? null,
      cognitiveLoad: t.cognitiveLoad as any,
      physicalLoad: t.physicalLoad as any,
      creativeRequired: t.creativeRequired,
      socialRequired: t.socialRequired,
      emotionalLoad: t.emotionalLoad as any,
      snoozedUntil: t.snoozedUntil ?? null,
      notes: t.notes ?? null,
    }).onDuplicateKeyUpdate({ set: { title: t.title } });
  }

  // 5. Reflections
  console.log(`Inserting ${REFLECTIONS.length} reflections...`);
  for (const r of REFLECTIONS) {
    await db.insert(reflections).values({
      id: r.id,
      userId: LOCAL_USER_ID,
      profileId: r.profileId,
      date: r.date,
      content: r.content,
    }).onDuplicateKeyUpdate({ set: { content: r.content } });
  }

  console.log("✓ Import complete.");
  console.log(`  User: updated (id=${LOCAL_USER_ID})`);
  console.log(`  Profiles: ${PROFILES.length}`);
  console.log(`  Projects: ${PROJECTS.length}`);
  console.log(`  Tasks: ${TASKS.length}`);
  console.log(`  Reflections: ${REFLECTIONS.length}`);
  process.exit(0);
}

main().catch(err => {
  console.error("Import failed:", err);
  process.exit(1);
});
