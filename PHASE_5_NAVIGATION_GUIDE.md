# PDERAX Phase 5 Navigation Guide

## Quick Access Routes

### Classroom Management

- **All Classrooms:** `/classrooms`
  - View all classrooms in grid layout
  - Create new classrooms
  - Join existing classrooms with invite code
- **Classroom Detail:** `/classrooms/[id]`
  - Overview: Classroom info, invite codes, quick actions
  - Students: Roster management, student removal
  - Settings: 5 configurable classroom settings

### Assignment Management

- **All Assignments:** `/classrooms/[id]/assignments`
  - List assignments with status filter (draft, published, closed)
  - Create new assignments
  - View grading progress
- **Assignment Detail:** `/classrooms/[id]/assignments/[assignment]`
  - Student view: Submit assignments, view feedback, track grades
  - Teacher view: View submissions, grade assignments, add feedback

### Grading & Performance

- **Gradebook:** `/classrooms/[id]/grades`
  - View all student grades by assignment
  - Filter by assignment or student
  - Sort by name, grade, or average
  - Bulk grade operations
  - Export grades (CSV/JSON)
- **Analytics:** `/classrooms/[id]/analytics`
  - Overview: Class average, median, grade distribution, insights
  - Student Performance: Individual student progress, trends, predictions
  - Trends: Performance trends over time, recommendations

---

## Navigation Hierarchy

```
Dashboard
├── Classrooms
│   ├── List (/classrooms)
│   │   ├── Create Classroom Modal
│   │   └── Join Classroom Modal
│   │
│   └── Detail (/classrooms/[id])
│       ├── Overview Tab
│       │   ├── Classroom Info
│       │   ├── Invite Codes
│       │   └── Quick Actions
│       │
│       ├── Students Tab
│       │   ├── Student Roster
│       │   ├── Student Management
│       │   └── Add Student Modal
│       │
│       ├── Settings Tab
│       │   └── Configurable Settings
│       │
│       ├── Assignments (/classrooms/[id]/assignments)
│       │   ├── List (/assignments)
│       │   │   ├── Filter by Status
│       │   │   ├── Create Assignment Modal
│       │   │   └── Assignment Cards
│       │   │
│       │   └── Detail (/assignments/[assignment])
│       │       ├── Overview
│       │       ├── Student Submission
│       │       │   ├── Submit Form
│       │       │   ├── Grade Display
│       │       │   └── Feedback
│       │       │
│       │       └── Teacher Submissions
│       │           ├── Submission List
│       │           └── Grading Panel
│       │
│       ├── Grades (/classrooms/[id]/grades)
│       │   ├── Gradebook Table
│       │   ├── Filter Controls
│       │   ├── Sort Options
│       │   ├── Bulk Edit Panel
│       │   └── Export Controls
│       │
│       └── Analytics (/classrooms/[id]/analytics)
│           ├── Overview Tab
│           │   ├── Key Metrics
│           │   ├── Grade Distribution
│           │   └── Class Insights
│           │
│           ├── Student Performance Tab
│           │   ├── Student List
│           │   ├── Sort Controls
│           │   └── Student Detail Panel
│           │
│           └── Trends Tab
│               ├── Performance Trends
│               └── Trend Summary
```

---

## Feature Access by Role

### Teacher Features

✅ Create and manage classrooms  
✅ Invite and manage students  
✅ Create assignments  
✅ View all submissions  
✅ Grade assignments with feedback  
✅ View and export gradebook  
✅ Access performance analytics  
✅ Manage classroom settings  
✅ Export rosters and grades

### Student Features

✅ Join classrooms with invite code  
✅ View assigned assignments  
✅ Submit assignments  
✅ View submission status and feedback  
✅ View personal grades  
✅ View personal performance trends  
✅ Access personal analytics

### Admin Features

✅ Full platform access  
✅ All teacher features  
✅ All student features  
✅ System-wide analytics  
✅ User management

---

## Common Workflows

### Creating a Classroom

1. Navigate to `/classrooms`
2. Click "New Classroom" button
3. Fill in classroom details
4. Click "Create Classroom"
5. View classroom at `/classrooms/[id]`

### Inviting Students

1. Go to classroom detail page
2. Click "Overview" tab
3. Click "Invite Student" or copy invite code
4. Share code with students
5. Students use code to join at `/classrooms` → "Join Classroom"

### Creating an Assignment

1. Go to `/classrooms/[id]/assignments`
2. Click "New Assignment" button
3. Fill assignment details (title, description, due date, points)
4. Click "Create Assignment"
5. Assignment appears in draft status
6. Click assignment to view details and publish

### Grading Submissions

1. Navigate to assignment detail page
2. Switch to "Submissions" tab (teacher view)
3. Click on student submission
4. View student answer in panel
5. Enter points and feedback
6. Click "Save Grade"
7. Grade appears in gradebook

### Viewing Gradebook

1. Go to `/classrooms/[id]/grades`
2. Use filters to find specific assignments or students
3. Sort by name, grade, or average
4. Click export to download grades
5. Or select students and use bulk edit

### Analyzing Performance

1. Navigate to `/classrooms/[id]/analytics`
2. Review "Overview" for class statistics
3. Click "Student Performance" to see individual students
4. Click on student to view details, strengths, and improvements
5. Check "Trends" tab for performance over time

---

## UI Component Reference

### Buttons

- **Primary Button:** Main actions (Create, Save, Submit)
- **Secondary Button:** Alternative actions (Cancel, Back)
- **Icon Buttons:** Quick actions with tooltips

### Forms

- **Input Fields:** Text with validation feedback
- **Text Areas:** Multi-line text for descriptions
- **Select Dropdowns:** For filtering and selection
- **Date/Time Pickers:** For due dates and scheduling
- **File Uploads:** For assignment submissions

### Tables

- **Sortable Columns:** Click to sort ascending/descending
- **Checkboxes:** For bulk operations
- **Status Badges:** Color-coded status indicators
- **Grade Display:** Color-coded by letter grade

### Modals

- **Create/Edit Forms:** Full-screen on mobile
- **Confirmations:** Inline with action buttons
- **Detail Panels:** Sticky on desktop, full-width on mobile

### Indicators

- **Progress Bars:** Submission and grading progress
- **Status Badges:** Draft, Published, Closed, Graded
- **Trend Icons:** 📈 Improving, 📉 Declining, → Stable
- **Color Coding:** Green (A), Blue (B), Yellow (C), Red (D/F)

---

## Responsive Design

### Desktop (1024px+)

- Multi-column layouts
- Sticky sidebars and panels
- Horizontal tabs
- Full table views

### Tablet (768px - 1023px)

- 2-column layouts
- Scrollable sidebars
- Tab navigation with overflow scroll
- Simplified table views

### Mobile (< 768px)

- Single column layouts
- Collapsible sections
- Full-width modals
- Vertical tabs
- Hidden secondary columns

---

## Keyboard Navigation

### Global

- **Tab:** Move focus between elements
- **Enter:** Activate buttons and links
- **Escape:** Close modals and menus
- **Space:** Toggle checkboxes

### Form Navigation

- **Tab:** Move to next field
- **Shift+Tab:** Move to previous field
- **Enter:** Submit form

### Table Navigation

- **Arrow Keys:** Move focus between cells
- **Ctrl/Cmd+A:** Select all rows
- **Space:** Toggle row selection

---

## Troubleshooting

### Classroom Not Found

- Ensure you have invite code if joining someone else's class
- Check that classroom ID in URL is correct
- Verify you have access to this classroom

### Assignment Submission Error

- Check file size (if uploading)
- Verify you're submitting to correct assignment
- Check assignment hasn't been closed

### Grade Not Showing

- Ensure assignment has been graded (status = "graded")
- Refresh page to see latest data
- Check that your classroom settings allow grade visibility

### Export Failed

- Verify internet connection
- Try different export format
- Clear browser cache and retry

---

## Performance Tips

1. **Gradebook:** Use filters to narrow down data before sorting
2. **Analytics:** View class performance first, then drill into students
3. **Submissions:** Use pagination when viewing many submissions
4. **Export:** Large exports may take time to download

---

## Accessibility

- All interactive elements are keyboard accessible
- Screen reader friendly with proper labels
- High contrast color scheme for visibility
- Clear focus indicators for keyboard navigation
- Form error messages clearly associated with inputs

---

## Getting Help

For issues or questions:

1. Check [PHASE_5_COMPLETION_REPORT.md](../PHASE_5_COMPLETION_REPORT.md) for detailed documentation
2. Review service method reference in completion report
3. Check browser console for error messages
4. Verify API endpoint connectivity
5. Contact development team with error details

---

**Last Updated:** 2024  
**Phase:** 5 (Classroom Management & Learning Analytics)
