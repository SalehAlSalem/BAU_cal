# 📅 BAU Calendar - University Calendar iCalendar Converter

Convert university calendar from HTML page to subscribable iCalendar (.ics) format for Google Calendar, Apple Calendar, Outlook, and more.

## ✨ Features

- 🔄 **Auto-sync**: Fetches data from university website automatically
- 🔔 **Smart Alerts**: Reminder 1 day before events at 9 AM
- 📱 **Universal Compatibility**: Works with all major calendar apps
- ⚡ **Fast**: CDN caching for optimal performance
- 🎯 **Student Filter**: Separate calendar with student-relevant events only

### 📚 Student Calendar Filters

The students calendar shows only events that contain these keywords (in Arabic):
- Registration (تسجيل)
- Exams/Tests (امتحان، اختبار)
- Study/Semester (دراسة، فصل دراسي)
- Vacations/Holidays (إجازة، عطلة)
- Add/Drop period (حذف، إضافة)
- Withdrawal (انسحاب)
- Results/Grades (نتائج، درجات)
- Lectures/Classes (محاضرة، دوام)
- Semester start/end (بداية، نهاية)
- Students (الطلاب، طالب)

## 🚀 Usage

### Subscribe to Calendar

Visit: https://bau-cal.vercel.app

Choose your version:
- **Students Calendar** (filtered): Only student-relevant events
- **Full Calendar**: All university events

### Subscription Links (webcal protocol)

These links will open directly in your calendar app and auto-subscribe:

```
Students Calendar: webcal://bau-cal.vercel.app/api/calendar-students
Full Calendar: webcal://bau-cal.vercel.app/api/calendar-full
```

### Direct HTTP Links (for manual download)

```
Students Calendar: https://bau-cal.vercel.app/api/calendar-students
Full Calendar: https://bau-cal.vercel.app/api/calendar-full
```

## 🛠️ Local Development

```bash
# Clone the repository
git clone https://github.com/SalehAlSalem/BAU_cal.git
cd BAU_cal

# Install dependencies
npm install

# Create .env file
echo "SOURCE_URL=https://your-university-calendar-url" > .env

# Run locally with Vercel CLI
npm install -g vercel
vercel dev
```

## 📁 Project Structure

```
BAU_cal/
├── api/
│   ├── lib/
│   │   └── calendar-fetcher.js   # Shared library
│   ├── calendar.js                # Legacy API endpoint
│   ├── calendar-students.js       # Students calendar
│   └── calendar-full.js           # Full calendar
├── public/
│   └── index.html                 # Landing page
├── package.json
├── vercel.json                    # Vercel configuration
└── README.md
```

## 🔧 Configuration

### Environment Variables

Add the following variable in Vercel settings:

```
SOURCE_URL=https://example.com/calendar-page
```

### Customize Filtering

To modify filtering keywords, edit the `isStudentEvent` function in `api/lib/calendar-fetcher.js`:

```javascript
function isStudentEvent(title) {
  const studentKeywords = [
    'تسجيل', 'امتحان', 'اختبار', 'دراسة',
    // Add more keywords here
  ];
  return studentKeywords.some(kw => title.includes(kw));
}
```

## 🎨 Customize Alerts

Current configuration: **1 alert, 1 day before at 9 AM**

To modify alert timing, edit `api/lib/calendar-fetcher.js`:

```javascript
// Current: Alert 1 day before at 9 AM (15 hours before midnight)
"TRIGGER:-P1DT15H"

// Examples of other timings:
// "TRIGGER:-P1D" = 1 day before at midnight
// "TRIGGER:-PT12H" = 12 hours before
// "TRIGGER:-P3D" = 3 days before
```

## 📝 How It Works

1. **Fetch Data**: Reads HTML page from university website
2. **Extract Table**: Finds calendar table using cheerio
3. **Parse Dates**: Extracts dates and events
4. **Filter (Students)**: Filters events by keywords
5. **Generate ICS**: Creates iCalendar file in RFC5545 format
6. **Cache**: Stores result on CDN for 6 hours

## 🤝 Contributing

Contributions are welcome! You can:
- Open an issue to report a bug
- Submit a pull request to add a new feature
- Improve documentation

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 👨‍💻 Author

[@SalehAlSalem](https://github.com/SalehAlSalem)

## 🙏 Acknowledgments

- [Vercel](https://vercel.com) - Hosting
- [Cheerio](https://cheerio.js.org/) - HTML parsing
- [Node Fetch](https://github.com/node-fetch/node-fetch) - HTTP requests

---

<div align="center">
  <p>Made with ❤️ for students</p>
</div>
