# Student Calendar Filtering Guide

## How Student Filtering Works

The student calendar (`/api/calendar-students`) automatically filters events from the full university calendar to show only events relevant to students.

## Filtering Logic

An event is considered **student-relevant** if its title contains ANY of these Arabic keywords:

### Registration & Enrollment
- `تسجيل` - Registration
- `حذف` - Drop
- `إضافة` - Add
- `انسحاب` - Withdrawal

### Academic Events
- `امتحان` - Exam
- `اختبار` - Test/Quiz
- `دراسة` - Study
- `فصل دراسي` - Semester
- `محاضرة` - Lecture
- `دوام` - Classes/Attendance

### Results & Grades
- `نتائج` - Results
- `درجات` - Grades

### Breaks & Holidays
- `إجازة` - Vacation
- `عطلة` - Holiday

### Semester Dates
- `بداية` - Beginning/Start
- `نهاية` - End

### Student References
- `الطلاب` - Students (the)
- `طالب` - Student

## Examples

**Will appear in student calendar:**
- "بداية التسجيل للفصل الدراسي" ✅
- "امتحانات نهاية الفصل" ✅
- "إجازة منتصف الفصل" ✅
- "نتائج الامتحانات النهائية" ✅

**Will NOT appear in student calendar:**
- "اجتماع مجلس الجامعة" ❌
- "عطاء شراء معدات" ❌
- "ورشة عمل للموظفين" ❌

## Customizing Keywords

To add or modify keywords, edit the `isStudentEvent` function in:
```
api/lib/calendar-fetcher.js
```

```javascript
function isStudentEvent(title) {
  const studentKeywords = [
    'تسجيل', 'امتحان', 'اختبار', 'دراسة', 'فصل دراسي', 'إجازة',
    'عطلة', 'بداية', 'نهاية', 'الطلاب', 'طالب', 'حذف', 'إضافة',
    'انسحاب', 'نتائج', 'درجات', 'محاضرة', 'دوام'
    // Add your custom keywords here
  ];
  return studentKeywords.some(kw => title.includes(kw));
}
```

## Alert Configuration

**Current Setting:** 1 alert notification

- ⏰ **When:** 1 day before the event
- 🕐 **Time:** 9:00 AM (15 hours before midnight of event day)

This timing ensures you get reminded during work/study hours, not at midnight.

### Technical Details
- Trigger: `-P1DT15H` (Period: 1 Day minus 15 Hours)
- Format: RFC5545 VALARM specification
- Action: DISPLAY (shows notification on device)

To change alert timing, modify in `api/lib/calendar-fetcher.js`:
```javascript
if (includeAlerts) {
  lines.push(
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(ev.title)}`,
    "TRIGGER:-P1DT15H",  // Change this line
    "END:VALARM"
  );
}
```
