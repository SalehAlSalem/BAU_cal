const cheerio = require("cheerio");
const fetch = require("node-fetch");

/**
 * Validate date format YYYY/MM/DD
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} True if valid format
 */
function isValidDateFormat(dateStr) {
  return /^\d{4}\/\d{2}\/\d{2}$/.test(dateStr);
}

/**
 * Escape special characters per RFC5545
 * @param {string} s - String to escape
 * @returns {string} Escaped string
 */
function icsEscape(s = "") {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Generate deterministic UID from event content
 * @param {string} title - Event title
 * @param {string} start - Start date
 * @param {string} end - End date
 * @returns {string} Unique identifier
 */
function uidFor(title, start, end) {
  const s = `${title}|${start}|${end}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `${h}@uni-calendar`;
}

/**
 * Parse date range from text using UTC to avoid timezone shifts
 * @param {string} text - Text containing date(s) in YYYY/MM/DD format
 * @returns {Object|null} Object with dtStart and dtEnd, or null if invalid
 */
function parseDateRange(text) {
  if (!text) return null;
  
  const dateStrings = text.match(/\d{4}\/\d{2}\/\d{2}/g) || [];
  const dates = dateStrings.map(d => {
    if (!isValidDateFormat(d)) return null;
    const [y, m, day] = d.split('/').map(Number);
    return new Date(Date.UTC(y, m - 1, day));
  }).filter(d => d !== null);

  if (dates.length === 0) return null;
  dates.sort((a, b) => a - b);
  const start = dates[0];
  const endExclusive = new Date((dates[1] || dates[0]).getTime());
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  const fmt = d => d.toISOString().slice(0, 10).replace(/-/g, "");
  return { dtStart: fmt(start), dtEnd: fmt(endExclusive) };
}

/**
 * Check if event is student-relevant based on keywords
 * Keywords include: registration, exam, test, study, semester, vacation, etc.
 * @param {string} title - Event title in Arabic
 * @returns {boolean} True if event is relevant to students
 */
function isStudentEvent(title) {
  const studentKeywords = [
    'تسجيل', 'امتحان', 'اختبار', 'دراسة', 'فصل دراسي', 'إجازة',
    'عطلة', 'بداية', 'نهاية', 'الطلاب', 'طالب', 'حذف', 'إضافة',
    'انسحاب', 'نتائج', 'درجات', 'محاضرة', 'دوام'
  ];
  return studentKeywords.some(kw => title.includes(kw));
}

/**
 * Fetch and parse events from university calendar page
 * @param {string} sourceUrl - URL of the calendar page
 * @returns {Promise<Array>} Array of event objects
 * @throws {Error} If fetch fails or calendar table not found
 */
async function fetchEvents(sourceUrl) {
  const page = await fetch(sourceUrl, {
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
      return;
    }

    const dateText = $(tds[0]).text().trim();
    const title = $(tds[2]).text().trim();

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
      isStudentRelated: isStudentEvent(title),
      ...rng
    });
  });

  return events;
}

/**
 * Generate ICS calendar content from events
 * @param {Array} events - Array of event objects
 * @param {string} calendarName - Name of the calendar
 * @param {boolean} includeAlerts - Whether to include alarm reminders
 * @returns {string} iCalendar formatted string
 */
function generateICS(events, calendarName, includeAlerts = true) {
  if (events.length === 0) {
    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//BAU//University Calendar Sync//AR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${calendarName}`,
      "X-WR-TIMEZONE:Asia/Riyadh",
      "END:VCALENDAR"
    ].join("\r\n");
  }

  const nowUTC = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BAU//University Calendar Sync//AR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calendarName}`,
    "X-WR-TIMEZONE:Asia/Riyadh"
  ];

  for (const ev of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uidFor(ev.title, ev.dtStart, ev.dtEnd)}`,
      `DTSTAMP:${nowUTC}`,
      `SUMMARY:${icsEscape(ev.title)}`,
      `DTSTART;VALUE=DATE:${ev.dtStart}`,
      `DTEND;VALUE=DATE:${ev.dtEnd}`,
      "TRANSP:TRANSPARENT",
      "STATUS:CONFIRMED"
    );

    if (includeAlerts) {
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${icsEscape(ev.title)}`,
        "TRIGGER:-P1DT15H",
        "END:VALARM"
      );
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

module.exports = {
  fetchEvents,
  generateICS,
  isStudentEvent
};
