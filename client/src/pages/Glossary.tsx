import { useState, useMemo, useEffect, useRef } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useDayModeColor } from "@/hooks/useDayModeColor";
import { useSettingsContext } from "@/contexts/SettingsContext";

export interface GlossaryTerm {
  term: string;
  category: string;
  definition: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  // ── Modes ───────────────────────────────────────────────────────────────────
  { term: "Day Mode", category: "Modes", definition: "Velea reads the day's panchang and distills it into one of four day modes — Action, Build, Selective, or Restraint — telling you what kind of work the day favors. The whole app tints to the current mode's color. Tag a task with the mode it suits and it rises on days that match, so what you do lines up with what the day supports." },
  { term: "Action", category: "Modes", definition: "Visible movement. The day favors initiating, publishing, reaching out, and making decisions. Best for: publishing or launching, outreach and first contact, committing to decisions, starting something new. Ease off: endless prep, waiting for perfect conditions, second-guessing." },
  { term: "Build", category: "Modes", definition: "Preparation and systems. The day favors strengthening the container — drafting, editing, and setup — over going public. Best for: drafting and editing, setup and organizing, planning and research, fixing what's broken. Ease off: launching or big public asks, forcing visibility, cold outreach." },
  { term: "Selective", category: "Modes", definition: "Advance, don't initiate. The day favors moving existing threads forward — warm leads, live conversations, follow-ups — not brand-new fronts. Best for: following up on warm leads, active conversations, advancing work already in motion, finishing one thing. Ease off: cold starts, opening many new fronts, broad untargeted outreach." },
  { term: "Restraint", category: "Modes", definition: "Contain and stabilize. The day favors rest, repair, and reducing exposure — finish rather than start, and don't force outcomes. Best for: rest, repair and cleanup, finishing rather than starting, pouring quiet steady attention into something already in the works, behind-the-scenes work. Ease off: launching or going public, confrontation or high-stakes asks, forcing outcomes. (Restraint is discernment about where finite attention goes — not blank withdrawal: contained focus on what's underway counts.)" },
  { term: "Submode (Qualifier)", category: "Modes", definition: "Each day mode comes with a qualifier — a second word that tunes how the mode expresses itself. The mode answers 'what kind of work is favored today?'; the qualifier answers 'what style of behavior is favored?'. For example, 'Full Action' pushes maximum visibility while 'Contained Action' moves but keeps it small; 'Cautious Selective' advances threads carefully. The qualifier sharpens the day's guidance but never overrides the base mode." },

  // ── Panchang ──────────────────────────────────────────────────────────────
  { term: "Panchang", category: "Panchang", definition: "The Vedic almanac. 'Pancha' means five, 'anga' means limb. The five limbs are: Tithi (lunar day), Vara (weekday), Nakshatra (lunar mansion), Yoga (Sun-Moon combination), and Karana (half-tithi). Together they give the complete energetic signature of any given day." },
  { term: "Tithi", category: "Panchang", definition: "Lunar day — one of 30 divisions of the lunar month based on the angular relationship between Sun and Moon. Each tithi spans 12° of separation. The lunar month divides into two fortnights: Shukla Paksha (waxing) and Krishna Paksha (waning). Each tithi carries a specific quality — some are auspicious for beginnings, others for completion or rest." },
  { term: "Nakshatra", category: "Panchang", definition: "Lunar mansion — one of 27 divisions of the zodiac, each spanning 13°20'. The Moon moves through roughly one nakshatra per day. Nakshatras carry precise behavioral and energetic qualities that refine the meaning of any planet placed within them. They are the backbone of Vedic timing and the basis of the Vimshottari Dasha system." },
  { term: "Pada", category: "Panchang", definition: "Each nakshatra is divided into 4 padas (quarters) of 3°20' each. The pada a planet occupies adds another layer of nuance — each pada corresponds to one sign of the zodiac in sequence, coloring the planet's expression with that sign's qualities." },
  { term: "Vara", category: "Panchang", definition: "The weekday, each ruled by a planet: Sunday (Sun), Monday (Moon), Tuesday (Mars), Wednesday (Mercury), Thursday (Jupiter), Friday (Venus), Saturday (Saturn). The ruling planet of the day adds its energy to all activities undertaken." },
  { term: "Yoga (Panchang)", category: "Panchang", definition: "One of the five limbs of the Panchang. Calculated from the combined longitude of the Sun and Moon, divided into 27 equal parts. Each yoga has a name and quality — some are considered auspicious (Siddha, Shubha), others inauspicious (Vyatipata, Vaidhriti). Distinct from the practice of yoga." },
  { term: "Karana", category: "Panchang", definition: "Half of a tithi — there are 11 karanas that repeat in a cycle. Each karana spans 6° of Sun-Moon separation. Karanas refine the quality of the tithi and are used in muhurta (electional astrology) to choose optimal timing for specific activities." },
  { term: "Shukla Paksha", category: "Panchang", definition: "The waxing fortnight — from New Moon to Full Moon. Generally supportive for initiating, building, and expanding. Energy is building toward fullness. The 15th tithi of Shukla Paksha is Purnima (Full Moon)." },
  { term: "Krishna Paksha", category: "Panchang", definition: "The waning fortnight — from Full Moon to New Moon. Associated with releasing, refining, and completing. Not inherently negative — many strong action days fall in Krishna Paksha, as the nakshatra quality often matters more than the paksha alone." },
  { term: "Purnima", category: "Panchang", definition: "Full Moon — the 15th tithi of Shukla Paksha. A time of culmination, heightened emotion, and peak energy. Considered auspicious for spiritual practice. The nakshatra the Moon occupies at Purnima gives the month its name (e.g., Pushya Purnima)." },
  { term: "Amavasya", category: "Panchang", definition: "New Moon — the 30th tithi, when Sun and Moon conjoin. A time of rest, introspection, and releasing what no longer serves. Traditionally avoided for new beginnings but considered powerful for ancestor rituals (Pitru Tarpana) and deep inner work." },
  { term: "Tithi Groups (Nanda–Purna)", category: "Panchang", definition: "The 14 numbered tithis repeat in five quality-groups, each recurring every fifth tithi: Nanda (joyous — 1st, 6th, 11th), Bhadra (nourishing — 2nd, 7th, 12th), Jaya (victorious — 3rd, 8th, 13th), Rikta (empty — 4th, 9th, 14th), and Purna (full — 5th, 10th, 15th). The group hints at what the day supports. So a tithi has two labels: its number-name (e.g. Tritiya) and its group (Jaya). Rikta tithis are traditionally avoided for new beginnings but suit clearing and endings." },
  { term: "Pratipada", category: "Panchang", definition: "1st tithi of a fortnight — a Nanda (joyous) tithi. Favorable for beginnings, celebrations, and auspicious undertakings. Follows the New Moon in Shukla Paksha, the Full Moon in Krishna Paksha." },
  { term: "Dwitiya", category: "Panchang", definition: "2nd tithi — a Bhadra (nourishing) tithi. Good for laying foundations, health, learning, relationships, and steady day-to-day work." },
  { term: "Tritiya", category: "Panchang", definition: "3rd tithi — a Jaya (victorious) tithi. Favorable for overcoming obstacles, competition, and decisive action. \"Krishna Tritiya\" simply means the 3rd tithi of the waning (Krishna) fortnight." },
  { term: "Chaturthi", category: "Panchang", definition: "4th tithi — a Rikta (empty) tithi. Traditionally avoided for new beginnings; better for removing obstacles, clearing, and finishing hard tasks. Associated with Ganesha." },
  { term: "Panchami", category: "Panchang", definition: "5th tithi — a Purna (full) tithi. Complete, supportive energy; good for most auspicious activities, wealth, and learning." },
  { term: "Shashthi", category: "Panchang", definition: "6th tithi — a Nanda (joyous) tithi. Favorable for beginnings, courage, and vitality; associated with health and strength." },
  { term: "Saptami", category: "Panchang", definition: "7th tithi — a Bhadra (nourishing) tithi. Good for travel, movement, service, and steady progress." },
  { term: "Ashtami", category: "Panchang", definition: "8th tithi — a Jaya (victorious) tithi. Strength and confrontation; favorable for facing challenges. Krishna Ashtami carries devotional significance (e.g. Janmashtami)." },
  { term: "Navami", category: "Panchang", definition: "9th tithi — a Rikta (empty) tithi. Generally avoided for beginnings; suited to endings, clearing, and resolving. Shukla Navami is Rama Navami." },
  { term: "Dashami", category: "Panchang", definition: "10th tithi — a Purna (full) tithi. Complete, supportive energy; good for most undertakings, virtue, and success." },
  { term: "Ekadashi", category: "Panchang", definition: "11th tithi — a Nanda (joyous) tithi. Spiritually potent; traditionally observed with fasting and devotion. Excellent for spiritual practice and discipline." },
  { term: "Dwadashi", category: "Panchang", definition: "12th tithi — a Bhadra (nourishing) tithi. Good for service, generosity, and completing what was begun; often when the Ekadashi fast is broken." },
  { term: "Trayodashi", category: "Panchang", definition: "13th tithi — a Jaya (victorious) tithi. Favorable for courage, friendship, and decisive effort; associated with Pradosha (Shiva worship)." },
  { term: "Chaturdashi", category: "Panchang", definition: "14th tithi — a Rikta (empty) tithi. Avoided for beginnings; suited to intense, removing, or protective work. Krishna Chaturdashi precedes Amavasya (e.g. Maha Shivaratri)." },
  { term: "Sunrise (Brahma Muhurta)", category: "Panchang", definition: "The period approximately 1.5 hours before sunrise is called Brahma Muhurta — considered the most auspicious time of day for meditation, study, and spiritual practice. The panchang day technically begins at sunrise, not midnight." },

  // ── Nakshatras ────────────────────────────────────────────────────────────
  { term: "Ashwini", category: "Nakshatra", definition: "1st nakshatra (0°–13°20' Aries). Ruled by Ketu. Symbol: horse's head. Deity: Ashwini Kumars (divine physicians). Quality: swift, healing, pioneering. The first impulse — quick action, fresh starts, and the energy of dawn." },
  { term: "Bharani", category: "Nakshatra", definition: "2nd nakshatra (13°20'–26°40' Aries). Ruled by Venus. Symbol: yoni (womb). Deity: Yama (god of death and dharma). Quality: transformation, containment, creative force. Carries the energy of bearing — both birth and death, creation and destruction." },
  { term: "Krittika", category: "Nakshatra", definition: "3rd nakshatra (26°40' Aries–10° Taurus). Ruled by Sun. Symbol: razor/flame. Deity: Agni (fire god). Quality: sharp, purifying, cutting through illusion. Associated with the Pleiades. Gives the ability to cut away what is unnecessary and forge what is essential." },
  { term: "Rohini", category: "Nakshatra", definition: "4th nakshatra (10°–23°20' Taurus). Ruled by Moon. Symbol: chariot, ox cart. Deity: Brahma (creator). Quality: fertile, sensual, creative, growth-oriented. The Moon's favorite nakshatra — considered the most beautiful and abundant of the 27. Associated with material manifestation and artistic beauty." },
  { term: "Mrigashira", category: "Nakshatra", definition: "5th nakshatra (23°20' Taurus–6°40' Gemini). Ruled by Mars. Symbol: deer's head. Deity: Soma (Moon god). Quality: searching, gentle, curious. The eternal seeker — always looking for something more beautiful or meaningful. Gives a restless, questing intelligence." },
  { term: "Ardra", category: "Nakshatra", definition: "6th nakshatra (6°40'–20° Gemini). Ruled by Rahu. Symbol: teardrop, diamond. Deity: Rudra (storm god). Quality: intense, transformative, destructive-creative. Associated with storms, grief, and radical change. The nakshatra of Sirius — carries fierce, penetrating intelligence." },
  { term: "Punarvasu", category: "Nakshatra", definition: "7th nakshatra (20° Gemini–3°20' Cancer). Ruled by Jupiter. Symbol: quiver of arrows. Deity: Aditi (mother of gods, goddess of infinity). Quality: renewal, return, abundance. 'Punarvasu' means 'return of the light.' Associated with restoration, forgiveness, and the ability to begin again." },
  { term: "Pushya", category: "Nakshatra", definition: "8th nakshatra (3°20'–16°40' Cancer). Ruled by Saturn. Symbol: lotus, circle, arrow. Deity: Brihaspati (Jupiter, teacher of the gods). Quality: nourishing, protective, spiritual. Considered the most auspicious of all nakshatras. Associated with nourishment, teaching, and the expansion of dharma." },
  { term: "Ashlesha", category: "Nakshatra", definition: "9th nakshatra (16°40'–30° Cancer). Ruled by Mercury. Symbol: coiled serpent. Deity: Nagas (serpent deities). Quality: penetrating, hypnotic, transformative. The nakshatra of the serpent — carries kundalini energy, deep insight, and the ability to see through surfaces. Can be intensely perceptive or manipulative." },
  { term: "Magha", category: "Nakshatra", definition: "10th nakshatra (0°–13°20' Leo). Ruled by Ketu. Symbol: royal throne. Deity: Pitrs (ancestors). Quality: regal, authoritative, ancestral. Associated with lineage, legacy, and the power of the past. Gives natural authority and a connection to ancestral wisdom." },
  { term: "Purva Phalguni", category: "Nakshatra", definition: "11th nakshatra (13°20'–26°40' Leo). Ruled by Venus. Symbol: hammock, front legs of a bed. Deity: Bhaga (god of delight and marital bliss). Quality: pleasure, creativity, rest, indulgence. The nakshatra of enjoyment — associated with the arts, romance, and the sweetness of life." },
  { term: "Uttara Phalguni", category: "Nakshatra", definition: "12th nakshatra (26°40' Leo–10° Virgo). Ruled by Sun. Symbol: back legs of a bed. Deity: Aryaman (god of patronage and contracts). Quality: service, commitment, social contracts. Bridges pleasure (Purva Phalguni) with duty. Associated with patronage, helpfulness, and the fulfillment of obligations." },
  { term: "Hasta", category: "Nakshatra", definition: "13th nakshatra (10°–23°20' Virgo). Ruled by Moon. Symbol: hand. Deity: Savitar (the Sun as creative force). Quality: skillful, practical, healing. The nakshatra of the craftsperson — associated with manual skill, healing arts, and the ability to manifest through one's hands." },
  { term: "Chitra", category: "Nakshatra", definition: "14th nakshatra (23°20' Virgo–6°40' Libra). Ruled by Mars. Symbol: bright jewel, pearl. Deity: Tvashtar/Vishwakarma (divine architect). Quality: creative, brilliant, architectural. Associated with beauty, design, and the ability to construct something magnificent. Gives aesthetic vision and technical mastery." },
  { term: "Swati", category: "Nakshatra", definition: "15th nakshatra (6°40'–20° Libra). Ruled by Rahu. Symbol: young plant shoot in the wind. Deity: Vayu (wind god). Quality: independent, flexible, scattered. The nakshatra of independence — associated with freedom of movement, commerce, and the ability to adapt. Can be restless or scattered without grounding." },
  { term: "Vishakha", category: "Nakshatra", definition: "16th nakshatra (20° Libra–3°20' Scorpio). Ruled by Jupiter. Symbol: triumphal arch, potter's wheel. Deity: Indra and Agni (king of gods and fire). Quality: purposeful, ambitious, goal-oriented. The nakshatra of focused determination — associated with achieving goals through sustained effort and the willingness to wait for the right moment." },
  { term: "Anuradha", category: "Nakshatra", definition: "17th nakshatra (3°20'–16°40' Scorpio). Ruled by Saturn. Symbol: lotus, staff. Deity: Mitra (god of friendship and contracts). Quality: devoted, disciplined, friendly. Associated with deep friendship, loyalty, and the ability to maintain relationships across distance and time." },
  { term: "Jyeshtha", category: "Nakshatra", definition: "18th nakshatra (16°40'–30° Scorpio). Ruled by Mercury. Symbol: circular amulet, umbrella. Deity: Indra (king of gods). Quality: protective, eldest, powerful. The nakshatra of the chief or elder — associated with authority, protection of the vulnerable, and the responsibilities that come with power." },
  { term: "Mula", category: "Nakshatra", definition: "19th nakshatra (0°–13°20' Sagittarius). Ruled by Ketu. Symbol: tied bunch of roots, elephant goad. Deity: Nirriti (goddess of dissolution). Quality: investigative, destructive-creative, root-seeking. Associated with going to the root of things — can indicate uprooting, research, and the destruction of what is no longer needed for growth." },
  { term: "Purva Ashadha", category: "Nakshatra", definition: "20th nakshatra (13°20'–26°40' Sagittarius). Ruled by Venus. Symbol: elephant tusk, fan, winnowing basket. Deity: Apas (water goddess). Quality: invincible, purifying, philosophical. Associated with the early stages of a campaign — the gathering of energy before a decisive push forward." },
  { term: "Uttara Ashadha", category: "Nakshatra", definition: "21st nakshatra (26°40' Sagittarius–10° Capricorn). Ruled by Sun. Symbol: elephant tusk, small bed. Deity: Vishwadevas (universal gods). Quality: victorious, ethical, lasting. Associated with final victory achieved through righteousness. Gives the ability to complete what was begun and make it endure." },
  { term: "Shravana", category: "Nakshatra", definition: "22nd nakshatra (10°–23°20' Capricorn). Ruled by Moon. Symbol: ear, three footprints. Deity: Vishnu (preserver). Quality: listening, learning, connecting. The nakshatra of hearing — associated with the transmission of knowledge, learning through listening, and the ability to connect disparate things." },
  { term: "Dhanishtha", category: "Nakshatra", definition: "23rd nakshatra (23°20' Capricorn–6°40' Aquarius). Ruled by Mars. Symbol: drum, flute. Deity: Ashta Vasus (eight elemental gods). Quality: wealthy, musical, ambitious. Associated with abundance, music, and the rhythmic pulse of life. Gives strong ambition and the ability to accumulate resources." },
  { term: "Shatabhisha", category: "Nakshatra", definition: "24th nakshatra (6°40'–20° Aquarius). Ruled by Rahu. Symbol: empty circle, 1000 stars. Deity: Varuna (god of cosmic law and the ocean). Quality: healing, secretive, independent. 'Shatabhisha' means '100 healers' or '1000 physicians.' Associated with healing through unconventional or hidden means, research, and the ability to work alone." },
  { term: "Purva Bhadrapada", category: "Nakshatra", definition: "25th nakshatra (20° Aquarius–3°20' Pisces). Ruled by Jupiter. Symbol: sword, two front legs of a funeral cot. Deity: Aja Ekapada (one-footed goat, a form of Rudra). Quality: intense, transformative, passionate. Associated with the fire of purification — can indicate asceticism, intense focus, or the burning away of attachments." },
  { term: "Uttara Bhadrapada", category: "Nakshatra", definition: "26th nakshatra (3°20'–16°40' Pisces). Ruled by Saturn. Symbol: twins, back legs of a funeral cot. Deity: Ahir Budhnya (serpent of the deep). Quality: deep, wise, restrained. Associated with the wisdom that comes from depth — patience, the long view, and the ability to hold complexity without resolution." },
  { term: "Revati", category: "Nakshatra", definition: "27th nakshatra (16°40'–30° Pisces). Ruled by Mercury. Symbol: fish, drum. Deity: Pushan (nourisher, guide of souls). Quality: nurturing, guiding, completing. The final nakshatra — associated with completion, safe passage, and the care of those who are vulnerable. Carries the quality of a gentle ending and transition." },

  // ── Timing ────────────────────────────────────────────────────────────────
  { term: "Vimshottari Dasha", category: "Timing", definition: "The primary timing system in Jyotish. 'Vimshottari' means 120 — the total cycle spans 120 years, cycling through 9 planets in a fixed sequence: Ketu (7), Venus (20), Sun (6), Moon (10), Mars (7), Rahu (18), Jupiter (16), Saturn (19), Mercury (17). The sequence begins from the Moon's nakshatra at birth." },
  { term: "Mahadasha", category: "Timing", definition: "Major planetary period in the Vimshottari Dasha system. Each planet rules a period of specific length. The mahadasha sets the overarching theme and engine of a life phase — the planet's significations, house rulerships, and natal condition all become dominant." },
  { term: "Antardasha", category: "Timing", definition: "Sub-period within a Mahadasha. Each major period is subdivided into 9 sub-periods, each ruled by one of the 9 planets in the same Vimshottari sequence. The antardasha planet modifies and colors the expression of the mahadasha planet — its themes layer on top of the major period's themes." },
  { term: "Pratyantar Dasha", category: "Timing", definition: "Sub-sub-period — the third level of the Vimshottari Dasha system, nested within the antardasha. Used for precise timing of specific events. At this level of granularity, the periods last weeks to months." },
  { term: "Annual Profection", category: "Timing", definition: "A timing technique from traditional astrology that activates one house of your chart per year of life. At birth (age 0), the 1st house is activated. Age 1 = 2nd house. After 12 years, the cycle repeats. The activated house becomes the 'year lord' house, and its ruling planet becomes especially significant for that year." },
  { term: "Muhurta", category: "Timing", definition: "Electional astrology — the art of choosing an auspicious moment to begin an activity. A muhurta is also a unit of time equal to 48 minutes (1/30th of a day). Muhurta practice uses panchang data, planetary positions, and the nature of the activity to identify the most favorable window." },
  { term: "Hora", category: "Timing", definition: "Planetary hour — each hour of the day is ruled by one of the seven classical planets in a fixed sequence. The first hour of the day (from sunrise) is ruled by the planet of that weekday. Hora is used in electional astrology to fine-tune timing within a day." },

  // ── Chart ─────────────────────────────────────────────────────────────────
  { term: "Lagna", category: "Chart", definition: "The Ascendant — the zodiac sign rising on the eastern horizon at the moment of birth. The Lagna is the most personal point in the chart, representing the body, self, and overall direction of life. In Jyotish, the Lagna determines the house assignments for all other signs." },
  { term: "Rashi", category: "Chart", definition: "Zodiac sign — one of 12 equal divisions of the ecliptic, each spanning 30°. In Jyotish, the sidereal zodiac is used (Niryana), which differs from the tropical zodiac used in Western astrology by approximately 23–24° (the ayanamsa). The twelve signs are defined under Signs (Rashis) below." },
  { term: "Navamsha", category: "Chart", definition: "The 9th harmonic divisional chart (D-9) — considered the most important of the varga (divisional) charts. Each sign is divided into 9 equal parts of 3°20'. The navamsha shows the deeper soul-level condition of planets and is especially important for marriage and spiritual development." },
  { term: "Ayanamsa", category: "Chart", definition: "The difference between the tropical and sidereal zodiacs, currently approximately 23–24°. Jyotish uses the sidereal zodiac, so all planetary positions are adjusted by subtracting the ayanamsa from tropical positions. The most commonly used ayanamsa is Lahiri (Chitrapaksha)." },
  { term: "Midheaven (MC)", category: "Chart", definition: "The Medium Coeli — the highest point of the ecliptic at your birth, the top of the meridian axis. It's the sign of vocation, public standing, and dharma — your outer voice: what you're called to build and be seen doing. Vedic whole-sign charts don't use the MC degree, but Velea reads it in the sidereal zodiac (by the real sign behind it). A planet transiting your MC colors the larger narrative of a life-chapter for as long as it sits there — and how it activates depends on the planet, its dignity in that sign, and the natal house it carries from." },
  { term: "Imum Coeli (IC)", category: "Chart", definition: "The 'bottom of the sky' — the point exactly opposite the Midheaven, the base of the meridian axis. It governs roots, home, ancestry, and your private foundation — the inner voice you speak from. Because the MC and IC are one axis, a transit to either rebalances both: the outer calling and the inner ground in dialogue." },
  { term: "The Meridian (dharma axis)", category: "Chart", definition: "The MC–IC axis read as one line: your Midheaven — how you appear on the world's stage (career, life-calling, dharma, the outer voice that carries it) — balanced by your Imum Coeli — your roots and private ground (home, foundation, the inner voice you speak from). Velea reads it in the real sidereal sign, which Western misses." },
  { term: "Dharma", category: "Concepts", definition: "Your right work, purpose, or path — what you're here to do and be, lived rightly. Not a fixed job but the through-line of a life's calling. In the chart it centers on the Midheaven (the world's-stage point) and the 9th/10th houses. When a planet activates your Meridian, it's this — your dharma — that the chapter is speaking to." },
  { term: "Pancha Pakshi", category: "Concepts", definition: "A South-Indian (Tamil) 'five birds' timing system that scores every stretch of the day as favorable or unfavorable. Your birth star assigns you one of five birds; then the weekday, the moon's fortnight (paksha), and the time of day set which bird is active and in what state — an hour-by-hour good/bad map. In Velea this powers Time Master." },
  { term: "The Five Birds", category: "Concepts", definition: "The five birds of Pancha Pakshi: Vulture, Owl, Crow, Cock, and Peacock. Everyone is assigned one from their birth nakshatra. At any moment the birds stand as friends or enemies to one another, and that relationship — together with each bird's current state — decides whether the moment favors you." },
  { term: "Bird states (Pancha Pakshi)", category: "Concepts", definition: "At any moment each bird is in one of five states, most to least auspicious: Ruling (strongest — act now), Eating (nourishing — good), Walking (neutral, active), Sleeping (low — rest), and Dying (weakest — avoid). Your bird's state, and its relationship to the ruling bird, is what makes a window golden or red." },
  { term: "Meridian chapter", category: "Chart", definition: "When a slow planet (Jupiter, Saturn, Rahu or Ketu) transits your Meridian, it opens a chapter — the larger narrative of a stretch of life while it sits there. The read is: which planet, on which pole (outer or inner voice), its dignity in the sidereal sign, and the natal house it carries in. A chapter truly opens and closes at the planet's stations and shadow-clearance — not the rough orb — and the antardasha running underneath sets the stage, carries the karma, and shows the lesson. Optionally, while a chapter is live, the pole's life-areas gently rise in your day: vocation for the outer voice, home & roots for the inner." },
  { term: "Sidereal Zodiac", category: "Chart", definition: "The zodiac fixed to the actual star constellations, as used in Jyotish. Differs from the tropical zodiac (used in Western astrology) by the ayanamsa — currently about 23–24°. A planet at 10° Aries in the tropical zodiac would be at approximately 16–17° Pisces in the sidereal zodiac." },
  { term: "Bhava", category: "Chart", definition: "House — one of 12 divisions of the chart representing different areas of life. In Jyotish's whole-sign house system, each bhava corresponds exactly to one rashi (sign). The 1st bhava begins with the Lagna sign." },

  // ── Planets ───────────────────────────────────────────────────────────────
  { term: "Graha", category: "Planets", definition: "Planet — literally 'that which grasps.' In Jyotish, the nine grahas are: Sun (Surya), Moon (Chandra), Mars (Mangala), Mercury (Budha), Jupiter (Guru/Brihaspati), Venus (Shukra), Saturn (Shani), Rahu (North Node), and Ketu (South Node). Each graha has specific significations, rulerships, and behavioral qualities." },
  { term: "Sun (Surya)", category: "Planets", definition: "The soul (atma), ego, vitality, father, and authority — the king of the grahas. The Sun governs self-expression, leadership, confidence, and life force. Rules Leo; exalted in Aries, debilitated in Libra. A natural malefic by its scorching nature, yet the source of light and consciousness in the chart." },
  { term: "Moon (Chandra)", category: "Planets", definition: "The mind (manas), emotions, mother, and receptivity — after the Lagna, the most important factor for daily life. The Moon governs feeling, memory, nourishment, comfort, and the public. Rules Cancer; exalted in Taurus, debilitated in Scorpio. Benefic when waxing and bright, weaker when waning or dark." },
  { term: "Mars (Mangala)", category: "Planets", definition: "Energy, courage, drive, and conflict — the warrior and army-commander (senapati). Mars governs action, ambition, discipline, competition, siblings, and physical strength. Rules Aries and Scorpio; exalted in Capricorn, debilitated in Cancer. A natural malefic; its placement shows where you assert and where you fight." },
  { term: "Mercury (Budha)", category: "Planets", definition: "Intellect, communication, analysis, and commerce — the prince and messenger. Mercury governs speech, learning, logic, trade, skill, and writing. Rules Gemini and Virgo; exalted in Virgo, debilitated in Pisces. Neutral by nature, it takes on the qualities of whatever planets it joins." },
  { term: "Jupiter (Guru / Brihaspati)", category: "Planets", definition: "Wisdom, expansion, dharma, and grace — the great benefic and teacher of the gods. Jupiter governs knowledge, ethics, children, wealth, optimism, and faith. Rules Sagittarius and Pisces; exalted in Cancer, debilitated in Capricorn. Its aspect protects and blesses whatever it touches." },
  { term: "Venus (Shukra)", category: "Planets", definition: "Love, beauty, pleasure, and relationship — the benefic teacher of the asuras. Venus governs romance, art, luxury, vehicles, comfort, and refinement. Rules Taurus and Libra; exalted in Pisces, debilitated in Virgo. It reveals what you value and how you experience harmony and desire." },
  { term: "Saturn (Shani)", category: "Planets", definition: "Discipline, time, limitation, and karma — the great malefic and lord of justice. Saturn governs structure, endurance, hard work, delay, longevity, and the lessons of restriction. Rules Capricorn and Aquarius; exalted in Libra, debilitated in Aries. Slow but fair, it rewards patience and sustained effort." },
  { term: "Rahu", category: "Planets", definition: "The North Node of the Moon — a mathematical point where the Moon's orbit crosses the ecliptic going northward. In Jyotish, Rahu is considered a shadow planet (chaya graha) with the nature of Saturn. It amplifies and obsesses over whatever it touches, representing worldly desire, ambition, and the direction of growth in this lifetime." },
  { term: "Ketu", category: "Planets", definition: "The South Node of the Moon — the point opposite Rahu. Ketu has the nature of Mars and represents past-life accumulation, spiritual depth, and liberation. Where Rahu grasps, Ketu releases. It can give spiritual insight and detachment but also confusion and loss in the areas it touches." },
  { term: "Exaltation (Uccha)", category: "Planets", definition: "The sign where a planet is most powerfully expressed. Sun in Aries, Moon in Taurus, Mars in Capricorn, Mercury in Virgo, Jupiter in Cancer, Venus in Pisces, Saturn in Libra. An exalted planet gives strong, clear results related to its significations." },
  { term: "Debilitation (Neecha)", category: "Planets", definition: "The sign opposite to exaltation, where a planet is weakest. Sun in Libra, Moon in Scorpio, Mars in Cancer, Mercury in Pisces, Jupiter in Capricorn, Venus in Virgo, Saturn in Aries. A debilitated planet may struggle to express its significations clearly, though neecha bhanga (cancellation) can transform this." },
  { term: "Atmakaraka", category: "Planets", definition: "The planet with the highest degree in the natal chart (ignoring minutes and seconds). In Jyotish, the atmakaraka represents the soul's primary lesson and desire for this lifetime. It is the most personal of the chara karakas (variable significators) and its condition in the navamsha is especially revealing." },
  { term: "Retrograde (Vakri)", category: "Planets", definition: "When a planet appears to move backward through the zodiac from Earth's vantage point. In Jyotish a retrograde planet is considered unusually strong, and it turns its significations inward — repetition, review, revisiting, and unfinished matters from the past. The Sun and Moon are never retrograde; Rahu and Ketu are always retrograde. Marked 'Rx' or 'R' in the chart." },

  // ── Signs (Rashis) ──────────────────────────────────────────────────────────
  { term: "Aries (Mesha)", category: "Signs", definition: "1st sign. Fire, cardinal (movable). Ruled by Mars; the Sun is exalted here. Pioneering, assertive, courageous, impulsive. The initiating spark — associated with new beginnings, leadership, and direct action." },
  { term: "Taurus (Vrishabha)", category: "Signs", definition: "2nd sign. Earth, fixed. Ruled by Venus; the Moon is exalted here. Stable, sensual, patient, resourceful. Associated with material security, beauty, food, and steady accumulation." },
  { term: "Gemini (Mithuna)", category: "Signs", definition: "3rd sign. Air, mutable (dual). Ruled by Mercury. Curious, communicative, versatile, restless. Associated with learning, exchange, writing, and quick adaptability." },
  { term: "Cancer (Karka)", category: "Signs", definition: "4th sign. Water, cardinal. Ruled by the Moon; Jupiter is exalted here. Nurturing, emotional, protective, home-oriented. Associated with roots, family, memory, and inner security." },
  { term: "Leo (Simha)", category: "Signs", definition: "5th sign. Fire, fixed. Ruled by the Sun. Regal, creative, confident, generous. Associated with self-expression, performance, leadership, and the desire to be seen." },
  { term: "Virgo (Kanya)", category: "Signs", definition: "6th sign. Earth, mutable. Ruled by Mercury, which is also exalted here. Analytical, precise, service-oriented, discerning. Associated with health, work, skill, and refinement of detail." },
  { term: "Libra (Tula)", category: "Signs", definition: "7th sign. Air, cardinal. Ruled by Venus; Saturn is exalted here. Relational, balanced, aesthetic, diplomatic. Associated with partnership, fairness, harmony, and exchange." },
  { term: "Scorpio (Vrishchika)", category: "Signs", definition: "8th sign. Water, fixed. Ruled by Mars (and Ketu as co-ruler in some systems). Intense, secretive, transformative, penetrating. Associated with depth, crisis, regeneration, and hidden power." },
  { term: "Sagittarius (Dhanu)", category: "Signs", definition: "9th sign. Fire, mutable. Ruled by Jupiter. Philosophical, optimistic, expansive, freedom-loving. Associated with higher learning, dharma, travel, and the search for meaning." },
  { term: "Capricorn (Makara)", category: "Signs", definition: "10th sign. Earth, cardinal. Ruled by Saturn; Mars is exalted here. Ambitious, disciplined, pragmatic, enduring. Associated with career, authority, structure, and long-term achievement." },
  { term: "Aquarius (Kumbha)", category: "Signs", definition: "11th sign. Air, fixed. Ruled by Saturn (and Rahu as co-ruler in some systems). Independent, humanitarian, unconventional, systemic. Associated with networks, ideals, innovation, and collective gains." },
  { term: "Pisces (Meena)", category: "Signs", definition: "12th sign. Water, mutable. Ruled by Jupiter; Venus is exalted here. Compassionate, imaginative, spiritual, dissolving. Associated with surrender, intuition, art, and transcendence." },

  // ── Houses ────────────────────────────────────────────────────────────────
  { term: "1st House (Lagna)", category: "Houses", definition: "Lagna / Tanu Bhava — and the West's House of Self. The sign on the exact eastern horizon at the moment of birth: the lens through which you and the world interact — how you are perceived and received. The soul, the light of the sun, in ACTIVE form: body, voice, and every means a human uses to project themselves into the world. Vedic: the only house that is Kendra and Trikona at once — the most auspicious house of self; the physical body, vitality, appearance, longevity; the true self and psychological foundation; the general direction, struggles, and successes of the life path; rules the head, brain, and face — so the nervous system enters here. Western: the persona — the mask, outward personality, social conditioning; first impressions and physical style; self-awareness, boundaries, identity — self-possession, or the lack of it; how you begin — initiating projects, taking action, meeting life's challenges. Naturally Mars's, naturally Aries. The Lagna lord's condition is one of the most important factors in the entire chart." },
  { term: "2nd House", category: "Houses", definition: "Dhana Bhava — and the West's House of Value. Personal security: what you own, what you value, and how you sustain yourself. Right after the 1st house of self, it holds the immediate material resources, family foundation, and talents you survive on — the house of wealth, how you earn it, and your relationship to money as shaped by family and upbringing; your self-worth too. Vedic: an Artha (wealth) house and a Maraka house; accumulated assets — savings, jewelry, inherited property, fixed holdings; the family of birth, the early childhood environment, lineage; speech and the face — the voice, truthfulness, teeth, the right eye; food, diet, and nourishment. Western: earning capacity, spending habits, disposable income, possessions; self-esteem and how much you value your own talents; core values — morals, ethics, what you prioritize; the material and emotional safety nets built through your own effort. Naturally Venus's, naturally Taurus." },
  { term: "3rd House", category: "Houses", definition: "Sahaja Bhava — and the West's House of Communication. Vedic: an Upachaya (growing) house, whose results improve over time through personal effort; initiative, courage, boldness, the willingness to risk; self-made success through independent work; siblings — including chosen family, not only blood; skills of the hands and voice — writing, crafts, manual arts — what the hands and voice create as an outward piece of communication; short journeys, which may be internal. Western: the mechanics of the mind — logic, curiosity, how you process information; everyday speech, writing, messages, social media; early schooling and technical skill-building; neighbors, the neighborhood, commuting — your immediate circles; peers, cousins, childhood friends. Naturally Mercury's, naturally Gemini." },
  { term: "4th House", category: "Houses", definition: "Matru Bhava / Sukha Bhava — and the West's House of Home and Family, seated at the Imum Coeli, the lowest point of the chart. The private world: emotional security, the home environment, the psychological roots; life behind closed doors. Vedic: a Kendra and a Moksha house — happiness itself; the mother and maternal figures — her health, her influence, and the native as mother, if they are one; Sukha — inner peace, emotional contentment, comfort at home; land, houses, buildings, farms, vehicles; early formal schooling and foundational degrees; rules the chest, lungs, and heart. Western: home as sanctuary — the living space and how you make a safe haven; ancestry and roots — family conditioning, psychological DNA, upbringing, heritage; the emotional foundation — the deepest vulnerabilities, coping mechanisms, the private self; the end of life — the final chapters and how things come to a close; the nurturing parent — traditionally the mother, modernly whichever parent nurtured most. Naturally the Moon's, naturally Cancer." },
  { term: "5th House", category: "Houses", definition: "Putra Bhava / Purva Punya Bhava — and the West's House of Creativity and Pleasure. The creative spark: self-expression and the things you bring into the world out of joy — how you celebrate life, take risks, express your talents, and channel love into projects, children, and romance. Vedic: a highly auspicious Trikona; Purva Punya — good fortune, talents, and blessings carried over from past lives; children — conception, their well-being, the relationship with them; a child as a pure expression of the soul until touched by the world; high intelligence, logic, discretion — the spiritual intellect; speculation — gains through smart risk, markets, lotteries; rules the stomach and upper digestion. Western: artistic talent in every medium, hobbies, original projects; romance and courtship — flirting, dating, the thrill (distinct from marriage); pleasure and play — games, sport, entertainment, inner-child healing; children as creative offspring — the biological and the made; risk-taking — the creative or emotional leap. Naturally the Sun's, naturally Leo." },
  { term: "6th House", category: "Houses", definition: "Shatru Bhava — and the West's House of Health and Service. The daily grind: health management, the obstacles overcome to keep life running, practical repetitive tasks, and how you handle adversity and bodily well-being. Vedic: Artha, Dusthana, AND Upachaya at once — it brings real challenges, and you overcome them over time through discipline and effort; a house of transformation. The three pillars of difficulty: Roga (disease), Rina (debts), Shatru (enemies and legal battles); daily disputes, litigation, rivalries; service and labor — hard work, employees, jobs that solve problems or fight for others; maternal relatives; rules the intestines and lower digestion. Western: the daily routine — schedule, chores, habits, the work environment; physical health — diet, exercise, prevention, how the body answers daily stress; acts of service — the connection to the village, the community, coworkers; pets — small animals, and the joy of caring for them: children, family members; skill mastery — craftsmanship, attention to detail, pattern recognition, seeing what can be improved. Naturally Mercury's, naturally Virgo." },
  { term: "7th House", category: "Houses", definition: "Yuvati Bhava — and the West's House of Partnerships, seated at the Descendant, directly across from the 1st house of self. The other half: the mirrors, contracts, and serious partnerships that define life outside yourself. Vedic: a Kendra, a Kama (desire) house, and a Maraka — the energy spent on others can physically drain the self; marriage and the spouse — their character, attributes, background; business partnerships — co-founders, legal agreements, long-term associates; foreign travel and trade — commerce with distant places; the public — the masses, the open marketplace; rules the internal reproductive organs and urinary tract. Western: committed relationships and serious bonds; the shadow self — the traits you repress and then seek, consciously or not, in a partner: the mirror; open enemies — known rivals, lawsuits, divorces, direct opponents (unlike the 12th's hidden ones); contracts — treaties and binding promises, written or spoken; equality — balancing your needs with another's to find harmony. Naturally Venus's, naturally Libra." },
  { term: "8th House", category: "Houses", definition: "Randhra Bhava — and the West's House of Transformation. The most mysterious sector of the chart, directly after the 7th of relationships: the deep, unearned resources and psychological transformations that occur when your life merges intensely with others. Vedic: a Dusthana and a Moksha house at once; longevity and the nature of death; sudden events — windfalls, losses, accidents, crises out of nowhere; unearned wealth — inheritance, alimony, joint finances, the spouse's money; the occult — secret knowledge, astrology itself, mysticism, deep research, hidden treasures; chronic issues — long illnesses, secrets, taboos, psychological vulnerabilities. Western: intimacy and sex — deep bonding, sexual energy, vulnerability with a partner; shared resources — joint accounts, taxes, debts, loans, corporate money; psychology and shadow work — the subconscious, trauma healing, uncovering what is buried; metamorphosis — psychological death and rebirth, reinvention through crisis; power dynamics — control, manipulation, and learning to surrender or reclaim your power. Mars's traditionally, Pluto's modernly; naturally Scorpio." },
  { term: "9th House", category: "Houses", definition: "Dharma Bhava, the House of Righteousness — and the West's House of Philosophy. Vedic: soul purpose and duty; the merit and fortune earned from past-life karma; divine grace and luck; the father and his lineage; gurus and spiritual mentors (being one or having one); religion, scripture, devotion; pilgrimages — long journeys taken for meaning. Western: personal worldview and belief systems; higher learning — which needs no institution, it can happen alone and self-guided in life; publishing, writing, broadcasting — the outer voice; global travel and foreign cultures, where the journey may be inner and expansive rather than physical; law and abstract justice; optimism, risk, and the lifelong search for meaning. A Trikona house, naturally Jupiter's, naturally Sagittarius." },
  { term: "10th House", category: "Houses", definition: "Karma Bhava — and the West's House of Career and Public Status, its cusp the Midheaven (MC): the very top of the wheel, the highest point of visibility in the chart. Career, worldly achievement, public reputation, the mark left on society — dharma enacted as karma, duty performed in the world. Vedic: the most powerful Kendra and a vital Artha house; the actions taken in the physical world; profession, livelihood, status, authority — the outward expression that holds value for the collective; fame and honor — recognition, titles, respect from society or the state; the destined work of this lifetime, the societal duty; authority figures — public leaders, and sometimes the father as the influence that shaped ambition; rules the knees, bones, and joints. Western: vocation and calling — the long trajectory and ultimate goals; the public persona — reputation, visibility beyond the home; ambition — drive for leadership and mastery of the chosen field; the structuring parent — traditionally the father, modernly whichever parent set the rules and expectations; legacy — what remains after you are gone. Naturally Saturn's, naturally Capricorn. Tied to the 1st: this is where the self becomes exalted — the persona raised to its highest visible point." },
  { term: "11th House", category: "Houses", definition: "Labha Bhava, the House of Gains — and the West's House of Hopes and Wishes. The rewards of the work: social circles, networks, long-term hopes; right after the 10th of career, it holds the financial gains OF the profession — the exchange of money for your particular output. Vedic: an Artha house and an Upachaya (growing) house — its prosperity increases over time; regular income, cash flow, profits, sudden accumulations; Kama — the fulfillment of material wishes, ambitions, life goals; the network — influential connections, and the power of the group to support the individual: sometimes one powerful person, sometimes many people without real power, whose backing together lifts the native; siblings blood and chosen — the closest friends, the inner circle; rules the shins, calves, and ankles. Western: alliances and tribes — the village: clubs, associations, like-minded people; humanitarianism — activism, community service, the collective good; hopes and visions — dreams, aspirations, the ideal future; peer support; technology — internet networks, social platforms, the modern tools that connect the village. Saturn's traditionally, Uranus's modernly; naturally Aquarius." },
  { term: "12th House", category: "Houses", definition: "Vyaya Bhava, the House of Expenditure — and the West's House of the Unconscious. The final sector of the wheel, positioned directly behind the 1st house of self: everything hidden from public view, the solitary, the internal environment. Vedic: a Moksha house and a Dusthana — but not merely losses and suffering; transformation and transmutation tied to loss and over-exertion. Expenses, drain of energy, material loss; liberation and freedom from the cycle; sleep, foreign lands, and isolation as the Hermit — a place of rest, reflection, and refinement, the stopping place before the 1st house: the top of the mountain, gathering what was experienced there; dreams and inner psychology, the same arena. Western: the unconscious — memory, shadow work, the collective; self-undoing, hidden enemies, unseen limits; escapism — fantasy, addiction, and creative transcendence (art, music); oneness — boundaries dissolving, empathy, mysticism; behind-the-scenes work and hidden charity. Jupiter's traditionally, Neptune's modernly; naturally Pisces." },
  { term: "Kendra", category: "Houses", definition: "The angular houses: 1st, 4th, 7th, and 10th. Planets in kendras are considered powerful and able to produce tangible results in the material world. The kendras are the pillars of the chart." },
  { term: "Trikona", category: "Houses", definition: "The trine houses: 1st, 5th, and 9th. Considered the most auspicious houses — associated with dharma, past-life merit, and spiritual grace. Planets in trikonas give blessings and support the native's overall wellbeing." },
  { term: "Dusthana", category: "Houses", definition: "The difficult houses: 6th, 8th, and 12th. Associated with challenges, hidden matters, and transformation. Planets in dusthanas can cause difficulties related to their significations, but can also give strength in overcoming obstacles (especially the 6th) or depth of insight (especially the 8th and 12th)." },
  { term: "Upachaya", category: "Houses", definition: "The houses of growth: 3rd, 6th, 10th, and 11th. Planets in upachaya houses improve over time — they may start with challenges but grow stronger as the native matures. Malefic planets (Mars, Saturn, Rahu) are particularly effective in upachaya houses." },

  // ── System ────────────────────────────────────────────────────────────────
  { term: "Jyotish", category: "System", definition: "The Vedic science of light — the traditional astrology of India. 'Jyoti' means light, 'isha' means lord or master. Jyotish uses the sidereal zodiac, the Vimshottari Dasha timing system, and a whole-sign house system. It is one of the six Vedangas (limbs of the Vedas) and is considered a tool for understanding karma and dharma." },
  { term: "Whole Sign Houses", category: "System", definition: "The house system used in Jyotish where each house corresponds exactly to one sign. The sign of the Ascendant becomes the entire 1st house, the next sign becomes the entire 2nd house, and so on. This differs from quadrant house systems (Placidus, Koch) used in Western astrology." },
  { term: "Parashari Jyotish", category: "System", definition: "The dominant school of Vedic astrology, based on the teachings of the sage Parashara as recorded in the Brihat Parashara Hora Shastra. Most modern Jyotish practice follows Parashari principles, including the Vimshottari Dasha system and the standard approach to house and planetary significations." },
  { term: "Nadi Astrology", category: "System", definition: "A branch of Jyotish based on ancient palm leaf manuscripts said to have been written by sages who foresaw individual destinies. Nadi readings are highly specific and predictive, often revealing precise life events. The manuscripts are organized by thumb print patterns and stored in libraries across South India." },
  { term: "Yogas", category: "System", definition: "Specific planetary combinations in the natal chart that produce particular results. There are hundreds of named yogas in Jyotish — some highly auspicious (Raj Yoga: planets in kendra-trikona relationship), some challenging (Kemadruma Yoga: Moon with no planets in adjacent signs). Yogas modify and color the overall chart reading." },
  { term: "Raj Yoga", category: "System", definition: "A royal combination — formed when the lord of a kendra (angular house) and the lord of a trikona (trine house) are connected by conjunction, mutual aspect, or exchange. Raj Yogas indicate periods of power, recognition, and achievement, especially when activated by the relevant dasha periods." },
  { term: "Neecha Bhanga", category: "System", definition: "Cancellation of debilitation — specific conditions that cancel or mitigate a planet's debilitation, often turning weakness into a form of strength. A debilitated planet can produce powerful results when neecha bhanga applies, sometimes even more powerfully than an exalted planet." },
];


// ── Rulership table (moved here from the Time Lord page — reference, not reading) ──
const RULERSHIP: { planet: string; glyph: string; signs: string[] }[] = [
  { planet: "Sun", glyph: "\u2609", signs: ["Leo"] },
  { planet: "Moon", glyph: "\u263D", signs: ["Cancer"] },
  { planet: "Mercury", glyph: "\u263F", signs: ["Gemini", "Virgo"] },
  { planet: "Venus", glyph: "\u2640", signs: ["Taurus", "Libra"] },
  { planet: "Mars", glyph: "\u2642", signs: ["Aries", "Scorpio"] },
  { planet: "Jupiter", glyph: "\u2643", signs: ["Sagittarius", "Pisces"] },
  { planet: "Saturn", glyph: "\u2644", signs: ["Capricorn", "Aquarius"] },
];
const RULE_SIGN_COLOR: Record<string, string> = {
  Aries: "#E23B4E", Scorpio: "#8E1E3A", Taurus: "#F4A9C2", Libra: "#B23A78",
  Gemini: "#7FD4B8", Virgo: "#2E9C7C", Cancer: "#A9B4C2", Leo: "#EE9A2E",
  Sagittarius: "#E6C24A", Pisces: "#B0851F", Capricorn: "#6E7BD4", Aquarius: "#313E8C",
};
const RULE_SIGN_GLYPH: Record<string, string> = {
  Aries: "\u2648\uFE0E", Taurus: "\u2649\uFE0E", Gemini: "\u264A\uFE0E", Cancer: "\u264B\uFE0E",
  Leo: "\u264C\uFE0E", Virgo: "\u264D\uFE0E", Libra: "\u264E\uFE0E", Scorpio: "\u264F\uFE0E",
  Sagittarius: "\u2650\uFE0E", Capricorn: "\u2651\uFE0E", Aquarius: "\u2652\uFE0E", Pisces: "\u2653\uFE0E",
};

const CATEGORIES = ["All", "Modes", "Panchang", "Nakshatra", "Timing", "Chart", "Planets", "Signs", "Houses", "System"];

const CATEGORY_COLORS: Record<string, string> = {
  Modes:     "oklch(0.70 0.13 50)",
  Panchang:  "oklch(0.72 0.10 200)",
  Nakshatra: "oklch(0.65 0.12 280)",
  Timing:    "oklch(0.65 0.08 85)",
  Chart:     "oklch(0.68 0.10 145)",
  Planets:   "oklch(0.65 0.12 15)",
  Signs:     "oklch(0.66 0.13 255)",
  Houses:    "oklch(0.65 0.10 320)",
  System:    "oklch(0.65 0.06 80)",
};

/** Convert a term string to a URL-safe slug */
export function termToSlug(term: string): string {
  return term.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Find the best matching glossary term for a given value (e.g. nakshatra name) */
export function findGlossaryTerm(value: string): GlossaryTerm | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase().trim();
  // Exact match first
  const exact = GLOSSARY.find((g) => g.term.toLowerCase() === v);
  if (exact) return exact;
  // Partial match — term starts with value or value starts with term
  return GLOSSARY.find(
    (g) => g.term.toLowerCase().startsWith(v) || v.startsWith(g.term.toLowerCase())
  );
}

export default function Glossary() {
  const { settings, saveSettings } = useSettingsContext();
  const tooltipsOn = settings.glossaryTooltips;
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [highlightedTerm, setHighlightedTerm] = useState<string | null>(null);
  // Definitions ship COLLAPSED — tap a term to open it. A live search or a ?term= deep-link
  // auto-expands matches so the answer is never a tap away when you're actually looking for it.
  const [openTerms, setOpenTerms] = useState<Set<string>>(new Set());
  const toggleTerm = (term: string) =>
    setOpenTerms((prev) => { const n = new Set(prev); if (n.has(term)) n.delete(term); else n.add(term); return n; });
  const termRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Read ?term= query param on mount and auto-scroll/highlight
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const termParam = params.get("term");
    if (!termParam) return;

    // Find the matching glossary entry
    const slug = termParam.toLowerCase();
    const match = GLOSSARY.find((g) => termToSlug(g.term) === slug || g.term.toLowerCase() === slug);
    if (!match) return;

    setHighlightedTerm(match.term);
    setActiveCategory("All");
    setSearch("");

    // Scroll after a short delay to allow render
    setTimeout(() => {
      const el = termRefs.current[match.term];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);
  }, []);

  const filtered = useMemo(() => {
    let list = GLOSSARY;
    if (activeCategory !== "All") list = list.filter((g) => g.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.term.toLowerCase().includes(q) || g.definition.toLowerCase().includes(q));
    }
    return list;
  }, [search, activeCategory]);

  const modeColor = useDayModeColor();

  return (
    <div className="container py-6 space-y-5">
      <AppHeader pageTitle="Glossary" />

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-muted-foreground)" }} />
        <input
          className="w-full pl-8 pr-8 py-2.5 rounded-xl text-sm"
          style={{
            background: "var(--color-secondary)",
            border: "1px solid var(--color-border)",
            color: "var(--color-foreground)",
            outline: "none",
            fontSize: "16px",
          }}
          placeholder="Search terms…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")} style={{ color: "var(--color-muted-foreground)" }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat;
          const color = CATEGORY_COLORS[cat] ?? "var(--foreground)";
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all"
              style={{
                background: active ? `color-mix(in oklch, ${color} 20%, transparent)` : "var(--color-secondary)",
                color: active ? color : "var(--color-muted-foreground)",
                border: `1px solid ${active ? `color-mix(in oklch, ${color} 40%, transparent)` : "var(--color-border)"}`,
              }}
              onMouseEnter={(e) => {
                if (active) return;
                e.currentTarget.style.background = `color-mix(in oklch, ${color} 16%, transparent)`;
                e.currentTarget.style.color = color;
                e.currentTarget.style.borderColor = `color-mix(in oklch, ${color} 40%, transparent)`;
              }}
              onMouseLeave={(e) => {
                if (active) return;
                e.currentTarget.style.background = "var(--color-secondary)";
                e.currentTarget.style.color = "var(--color-muted-foreground)";
                e.currentTarget.style.borderColor = "var(--color-border)";
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Inline-tooltips toggle — below the search/filter (the primary controls), not above them. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", padding: "0.75rem 0.9rem", borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)" }}>
        <span style={{ fontSize: "0.82rem", color: "var(--foreground)", lineHeight: 1.45 }}>
          Explain terms inline
          <span style={{ display: "block", fontSize: "0.72rem", color: "var(--color-muted-foreground)", marginTop: 2 }}>
            Underline glossary words across the app and define them on tap.
          </span>
        </span>
        <button
          onClick={() => saveSettings({ ...settings, glossaryTooltips: !tooltipsOn })}
          aria-pressed={tooltipsOn}
          style={{ flexShrink: 0, fontSize: "0.75rem", fontWeight: 700, padding: "0.3rem 0.8rem", borderRadius: 999, cursor: "pointer",
            border: `1px solid ${tooltipsOn ? "var(--brand-gold)" : "var(--color-border)"}`,
            background: tooltipsOn ? "color-mix(in srgb, var(--brand-gold) 18%, transparent)" : "transparent",
            color: tooltipsOn ? "var(--brand-gold)" : "var(--color-muted-foreground)" }}
        >
          {tooltipsOn ? "On" : "Off"}
        </button>
      </div>


      {/* Planets & the signs they rule — reference card (lives here, not on the Time Lord page) */}
      {(activeCategory === "All" || activeCategory === "Planets" || activeCategory === "Signs") && !search.trim() && (
        <div className="rounded-2xl p-4" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          <p className="text-xs font-bold uppercase mb-3" style={{ letterSpacing: "0.1em", color: "var(--color-muted-foreground)" }}>
            Planets &amp; the signs they rule
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", rowGap: "0.55rem", columnGap: "1.25rem", fontSize: "0.9rem", alignItems: "baseline" }}>
            {RULERSHIP.map(({ planet, glyph, signs }) => (
              <div key={planet} style={{ display: "contents" }}>
                <span style={{ color: "var(--foreground)", fontWeight: 600, whiteSpace: "nowrap" }}>{glyph} {planet}</span>
                <span style={{ display: "flex", gap: "1.1rem", flexWrap: "wrap" }}>
                  {signs.map((s) => (
                    <span key={s} style={{ color: RULE_SIGN_COLOR[s], fontWeight: 600, whiteSpace: "nowrap" }}>{RULE_SIGN_GLYPH[s]} {s}</span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Count */}
      <p className="text-sm font-bold uppercase" style={{ color: "var(--color-muted-foreground)" }}>
        {filtered.length} {filtered.length === 1 ? "term" : "terms"}
      </p>

      {/* Terms */}
      <div className="space-y-3 pb-24">
        {filtered.map((item) => {
          const catColor = CATEGORY_COLORS[item.category] ?? "oklch(0.65 0.02 80)";
          const isHighlighted = highlightedTerm === item.term;
          const searching = search.trim().length > 0;
          const expanded = searching || isHighlighted || openTerms.has(item.term);
          return (
            <div
              key={item.term}
              ref={(el) => { termRefs.current[item.term] = el; }}
              className="rounded-lg p-4 transition-all duration-500"
              style={{
                border: isHighlighted ? `2px solid ${catColor}` : `1.5px solid color-mix(in oklch, ${catColor} 55%, transparent)`,
                background: `color-mix(in oklch, ${catColor} 12%, var(--background))`,
                boxShadow: isHighlighted ? `0 0 0 3px color-mix(in oklch, ${catColor} 15%, transparent)` : "none",
              }}
            >
              <button
                type="button"
                onClick={() => { if (!searching) toggleTerm(item.term); }}
                aria-expanded={expanded}
                className="flex items-start justify-between gap-2 w-full text-left"
                style={{ background: "transparent", border: "none", padding: 0, cursor: searching ? "default" : "pointer" }}
              >
                <h3
                  className="text-sm leading-snug font-semibold"
                  style={{ color: "var(--color-foreground)", fontWeight: 600 }}
                >
                  {item.term}
                </h3>
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className="text-[12px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full"
                    style={{
                      background: `color-mix(in oklch, ${catColor} 15%, transparent)`,
                      color: catColor,
                      letterSpacing: "0.04em",
                      border: `1px solid color-mix(in oklch, ${catColor} 30%, transparent)`,
                    }}
                  >
                    {item.category}
                  </span>
                  {!searching && (
                    <ChevronDown size={14} style={{ color: catColor, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 200ms ease" }} />
                  )}
                </span>
              </button>
              {expanded && (
                <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted-foreground)", marginTop: "0.5rem" }}>
                  {item.definition}
                </p>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-lg p-5 text-center" style={{ border: `1.5px solid ${modeColor}`, background: `color-mix(in srgb, ${modeColor} 14%, var(--background))` }}>
            <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>No terms found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
