const cheerio = require("cheerio");

const SOURCE_URL = process.env.SOURCE_URL; // ← set in Vercel

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
  const dates = (text.match(/\d{4}\/\d{2}\/\d{2}/g) || []).map(d => new Date(d));
  if (dates.length === 0) return null;
  dates.sort((a, b) => a - b);
  const start = dates[0];
  const endExclusive = new Date((dates[1] || dates[0]).getTime());
  // ICS all-day DTEND is exclusive → add 1 day
  endExclusive.setDate(endExclusive.getDate() + 1);
  const fmt = d =>
    d.toISOString().slice(0, 10).replace(/-/g, "");
  return { dtStart: fmt(start), dtEnd: fmt(endExclusive) };
}

module.exports = async (req, res) => {
  try {
    if (!SOURCE_URL) {
      res.statusCode = 500;
      return res.end("Missing SOURCE_URL env var");
    }

    const page = await fetch(SOURCE_URL, { headers: { "Accept-Language": "ar,en;q=0.8" }});
    if (!page.ok) throw new Error(`Fetch failed: ${page.status}`);
    const html = await page.text();
    const $ = cheerio.load(html);

    // Heuristic: use the first table on the page
    const rows = $("table").first().find("tr");
    const events = [];

    rows.each((_, tr) => {
      const tds = $(tr).find("td, th"); // include headers but we’ll skip by content
      if (tds.length < 3) return;

      const dateText = $(tds[0]).text().trim();
      const title = $(tds[2]).text().trim(); // assuming: date | day | event
      if (!dateText || !title || /التاريخ|اليوم|الحدث/.test(title)) return;

      const rng = parseDateRange(dateText);
      if (!rng) return;

      events.push({
        title: title.replace(/\s+/g, " ").trim(),
        ...rng
      });
    });

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

    // Cache on Vercel’s CDN so Apple Calendar isn’t hitting origin constantly
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
    res.statusCode = 200;
    res.end(lines.join("\r\n"));
  } catch (err) {
    res.statusCode = 500;
    res.end("Error: " + err.message);
  }
};