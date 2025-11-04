/**
 * Full calendar endpoint - all university events with alerts
 * @module api/calendar-full
 */
const { fetchEvents, generateICS } = require("./lib/calendar-fetcher");

module.exports = async (req, res) => {
  try {
    const SOURCE_URL = process.env.SOURCE_URL;
    
    if (!SOURCE_URL) {
      res.statusCode = 500;
      return res.end("Missing SOURCE_URL environment variable");
    }

    const events = await fetchEvents(SOURCE_URL);

    const icsContent = generateICS(
      events,
      "التقويم الجامعي الكامل - BAU",
      true
    );

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
    res.setHeader("Content-Disposition", 'inline; filename="bau-calendar-full.ics"');
    res.statusCode = 200;
    res.end(icsContent);
  } catch (err) {
    console.error("Calendar generation error:", err);
    res.statusCode = 500;
    res.end(`Error: ${err.message}`);
  }
};
