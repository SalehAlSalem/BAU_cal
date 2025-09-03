const cheerio = require("cheerio");
const fetch = require("node-fetch");
const SOURCE_URL = process.env.SOURCE_URL;

// Validate date format YYYY/MM/DD
function isValidDateFormat(dateStr) {
  return /^\d{4}\/\d{2}\/\d{2}$/.test(dateStr);
}

// Escape per RFC5545 (basic)
function icsEscape(s = "") {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Deterministic UID from content (simple hash)
function uidFor(title, start, end) {
  const s = `${title}|${start}|${end}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `${h}@uni-calendar`;
}

function parseDateRange(text) {
  if (!text) return null;
  // Find YYYY/MM/DD patterns; handles single or pair (order-agnostic)
  const dates = (text.match(/\d{4}\/\d{2}\/\d{2}/g) || []).map(d => {
    if (!isValidDateFormat(d)) return null;
    // new Date('YYYY/MM/DD') is parsed as UTC in Node; acceptable for all-day
    return new Date(d);
  }).filter(d => d !== null);

  if (dates.length === 0) return null;
  dates.sort((a, b) => a - b);
  const start = dates[0];
  const endExclusive = new Date((dates[1] || dates[0]).getTime());
  // ICS all-day DTEND is exclusive → add 1 day
  endExclusive.setDate(endExclusive.getDate() + 1);
  const fmt = d => d.toISOString().slice(0, 10).replace(/-/g, "");
  return { dtStart: fmt(start), dtEnd: fmt(endExclusive) };
}

module.exports = async (req, res) => {
  try {
    // Validate environment variables
    if (!SOURCE_URL) {
      res.statusCode = 500;
      return res.end("Missing SOURCE_URL environment variable");
    }

    // Fetch the page with proper error handling
    const page = await fetch(SOURCE_URL, {
      headers: {
        "Accept-Language": "ar,en;q=0.8",
        "User-Agent": "University-Calendar-Bot/1.0"
      },
      timeout: 10000
    });

    if (!page.ok) {
      throw new Error(`Failed to fetch calendar: HTTP ${page.status} ${page.statusText}`);
    }

    const html = await page.text();
    const $ = cheerio.load(html, { decodeEntities: true });

    // Find the table that contains the calendar data
    const table = $("table").filter((_, table) => {
      const headerText = $(table).find("tr:first").text();
      return /التاريخ|اليوم|الحدث/.test(headerText);
    }).first();

    if (!table.length) {
      throw new Error("Could not find calendar table");
    }

    const rows = table.find("tr");
    const events = [];

    rows.each((_, tr) => {
      const tds = $(tr).find("td, th");
      if (tds.length < 3) {
        return; // Skip rows with insufficient columns
      }

      const dateText = $(tds[0]).text().trim();
      const title = $(tds[2]).text().trim(); // assuming: date | day | event

      // Skip header rows and empty rows
      if (!dateText || !title || /التاريخ|اليوم|الحدث/.test(title)) {
        return;
      }

      const rng = parseDateRange(dateText);
      if (!rng) {
        console.warn(`Skipping row with invalid date format: ${dateText}`);
        return;
      }

      events.push({
        title: title.replace(/\s+/g, " ").trim(),
        ...rng
      });
    });

    if (events.length === 0) {
      // Return an empty calendar rather than a 500 so clients can still consume
      const emptyCal = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TriNova//University Calendar Sync//AR",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:التقويم الجامعي",
        "X-WR-TIMEZONE:UTC",
        "END:VCALENDAR"
      ];
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
      res.statusCode = 200;
      return res.end(emptyCal.join("\r\n"));
    }

    const nowUTC = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//TriNova//University Calendar Sync//AR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:التقويم الجامعي",
      "X-WR-TIMEZONE:UTC"
    ];

    for (const ev of events) {
      lines.push(
        "BEGIN:VEVENT",
        `UID:${uidFor(ev.title, ev.dtStart, ev.dtEnd)}`,
        `DTSTAMP:${nowUTC}`,
        `SUMMARY:${icsEscape(ev.title)}`,
        `DTSTART;VALUE=DATE:${ev.dtStart}`,
        `DTEND;VALUE=DATE:${ev.dtEnd}`,
        "END:VEVENT"
      );
    }

    lines.push("END:VCALENDAR");

    // Cache on Vercel's CDN so clients don't hammer origin
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
    res.statusCode = 200;
    res.end(lines.join("\r\n"));
  } catch (err) {
    console.error("Calendar generation error:", err);
    res.statusCode = 500;
    res.end(`Error: ${err.message}`);
  }
};