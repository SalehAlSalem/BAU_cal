/**
 * Students calendar endpoint - filtered events relevant to students only
 * @module api/calendar-students
 */
const { fetchEvents, generateICS } = require("./lib/calendar-fetcher");

module.exports = async (req, res) => {
  try {
    const SOURCE_URL = process.env.SOURCE_URL;
    
    if (!SOURCE_URL) {
      res.statusCode = 500;
      return res.end("Missing SOURCE_URL environment variable");
    }

    const allEvents = await fetchEvents(SOURCE_URL);
    const studentEvents = allEvents.filter(ev => ev.isStudentRelated);

    const icsContent = generateICS(
      studentEvents,
      "تقويم الطلاب - BAU",
      true
    );

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
    res.setHeader("Content-Disposition", 'inline; filename="bau-calendar-students.ics"');
    res.statusCode = 200;
    res.end(icsContent);
  } catch (err) {
    console.error("Calendar generation error:", err);
    res.statusCode = 500;
    res.end(`Error: ${err.message}`);
  }
};
