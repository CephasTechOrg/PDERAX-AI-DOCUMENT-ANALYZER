# Navigation & Feature Guide - PDERAX Next.js Frontend

**Last Updated:** Current Session

---

## Website Navigation Map

### Public Pages (No Authentication Required)

#### 1. **Landing Page** (`/`)

- **Purpose:** Introduction and marketing
- **Features:**
  - Hero section with value proposition
  - Features showcase
  - How it works explanation
  - Call-to-action buttons
- **Navigation to:** `/login`, `/signup`, Features page

#### 2. **Login Page** (`/login`)

- **Purpose:** User authentication
- **Features:**
  - Email and password input
  - Remember me option
  - Password reset link
  - Sign up link
- **Navigation to:** Dashboard, Password reset

#### 3. **Signup Page** (`/signup`)

- **Purpose:** New user registration
- **Features:**
  - Name, email, password input
  - Password strength indicator
  - Terms agreement checkbox
  - Login link
- **Navigation to:** Login, Dashboard

#### 4. **Reset Password** (`/reset-password`)

- **Purpose:** Password recovery
- **Features:**
  - Email entry
  - Reset code verification
  - New password entry
- **Navigation to:** Login

---

### Protected Pages (Authentication Required)

#### **Dashboard** (`/dashboard`)

- **Purpose:** User home page
- **Features:**
  - Welcome message with user name
  - Quick stats (documents, flashcards, study time)
  - Recent documents list
  - Quick action buttons
- **Navigation to:** All dashboard pages

#### **Documents** (`/documents`)

- **Purpose:** Manage uploaded documents
- **Features:**
  - List of all documents
  - Document search and filter
  - Upload button
  - Document status indicators
  - Delete and edit options
- **Navigation to:** Document details, Upload

#### **Document Detail** (`/documents/:id`)

- **Purpose:** View single document
- **Features:**
  - Document content preview
  - Flashcard list for document
  - Document info (size, date, status)
  - Export option
  - Delete option
- **Navigation to:** Flashcards, Edit, Export

#### **Flashcards** (`/flashcards`)

- **Purpose:** View and study flashcards
- **Features:**
  - All flashcards list
  - Filter by document
  - Difficulty level display
  - Study button for each card
  - Edit and delete options
- **Navigation to:** Study mode, Create flashcard

#### **Study Mode** (`/study/:id`)

- **Purpose:** Interactive card studying
- **Features:**
  - Flashcard display (question/answer flip)
  - Mark as correct/incorrect
  - Progress bar
  - Next/previous navigation
  - Quiz mode option
- **Navigation to:** Flashcards, Quiz mode

#### **Quiz Mode** (`/quiz/:documentId`)

- **Purpose:** Test knowledge on document
- **Features:**
  - Multiple choice questions
  - Immediate feedback
  - Score calculation
  - Results summary
  - Retry option
- **Navigation to:** Study, Results

#### **History** (`/history`)

- **Purpose:** View past study sessions
- **Features:**
  - Document history list
  - Study session statistics
  - Filter by date range
  - Export history
  - Archive old sessions
- **Navigation to:** Document details, Study

#### **AI Assistant** (`/ai-assistant`) - Phase 4

- **Purpose:** Chat with AI about documents
- **Features:**
  - Sidebar with chat sessions
  - Main chat area
  - Real-time message display
  - Create new session
  - Delete sessions
  - Message history pagination
- **Navigation to:** Profile, Analytics, Export

#### **Profile Settings** (`/profile`) - Phase 4

- **Purpose:** Manage user account and preferences
- **Features:**
  - Edit profile information (name, bio)
  - Timezone and language settings
  - Theme preference (light/dark)
  - Notification preferences
  - Email digest frequency
  - Change password
  - Two-factor authentication setup
  - Account deletion
- **Navigation to:** AI Assistant, Analytics, Export

#### **Analytics** (`/analytics`) - Phase 4

- **Purpose:** View comprehensive study statistics
- **Features:**
  - Key metrics (sessions, cards, accuracy, streak)
  - Study time summary
  - Most studied documents ranking
  - Progress distribution charts
  - Export report button
  - Quick action buttons
- **Navigation to:** AI Assistant, Export, Profile

#### **Export & Download** (`/export`) - Phase 4

- **Purpose:** Download study materials in multiple formats
- **Features:**
  - Format selection (PDF, CSV, JSON)
  - Document multi-select
  - Flashcard export
  - Progress report export
  - Export history with download links
  - Status tracking (completed, failed, processing)
- **Navigation to:** Analytics, Profile, AI Assistant

---

## Feature Quick Reference

### Document Management

| Feature          | Location         | Keyboard Shortcut | Status    |
| ---------------- | ---------------- | ----------------- | --------- |
| Upload Document  | `/documents`     | None              | ✅ Active |
| List Documents   | `/documents`     | None              | ✅ Active |
| View Document    | `/documents/:id` | None              | ✅ Active |
| Delete Document  | `/documents/:id` | None              | ✅ Active |
| Search Documents | `/history`       | Ctrl+F            | ✅ Active |
| Filter by Date   | `/history`       | None              | ✅ Active |
| Export Document  | `/export`        | None              | ✅ Active |

### Study Tools

| Feature         | Location      | Keyboard Shortcut          | Status    |
| --------------- | ------------- | -------------------------- | --------- |
| View Flashcards | `/flashcards` | None                       | ✅ Active |
| Study Mode      | `/study/:id`  | Space=Flip, Arrow=Next     | ✅ Active |
| Quiz Mode       | `/quiz/:id`   | Space=Select, Enter=Submit | ✅ Active |
| Track Progress  | `/analytics`  | None                       | ✅ Active |
| View Streak     | `/analytics`  | None                       | ✅ Active |

### AI & Automation

| Feature            | Location        | Keyboard Shortcut                    | Status    |
| ------------------ | --------------- | ------------------------------------ | --------- |
| Chat with AI       | `/ai-assistant` | Ctrl+Enter=Send, Shift+Enter=Newline | ✅ Active |
| Create Session     | `/ai-assistant` | None                                 | ✅ Active |
| Ask About Document | `/ai-assistant` | None                                 | ✅ Active |
| Generate Summary   | `/ai-assistant` | None                                 | ✅ Active |

### Account Management

| Feature         | Location   | Keyboard Shortcut | Status    |
| --------------- | ---------- | ----------------- | --------- |
| View Profile    | `/profile` | None              | ✅ Active |
| Edit Profile    | `/profile` | None              | ✅ Active |
| Change Theme    | `/profile` | None              | ✅ Active |
| Enable 2FA      | `/profile` | None              | ✅ Active |
| Change Password | `/profile` | None              | ✅ Active |
| Delete Account  | `/profile` | None              | ✅ Active |

### Analytics & Reporting

| Feature             | Location     | Keyboard Shortcut | Status    |
| ------------------- | ------------ | ----------------- | --------- |
| View Stats          | `/analytics` | None              | ✅ Active |
| Export Report       | `/analytics` | None              | ✅ Active |
| Export Flashcards   | `/export`    | None              | ✅ Active |
| View Export History | `/export`    | None              | ✅ Active |

---

## User Workflows

### Workflow 1: New User Registration

```
1. Visit home page (/)
2. Click "Sign Up"
3. Fill in name, email, password
4. Accept terms
5. Click "Create Account"
6. → Redirected to /dashboard
```

### Workflow 2: Upload and Study

```
1. Go to /documents
2. Click "Upload Document"
3. Select PDF/image file
4. Wait for processing
5. Go to /flashcards (auto-generated)
6. Click "Study" on a flashcard
7. → Study mode opens
8. Answer questions and track progress
```

### Workflow 3: Track Learning Progress

```
1. Go to /analytics
2. Review key metrics
3. Check most studied documents
4. View progress bars
5. Click "Export Report" (optional)
6. → Download PDF/CSV report
```

### Workflow 4: Get AI Help

```
1. Go to /ai-assistant
2. Click "New Session"
3. Type question or comment
4. Send (Ctrl+Enter or click Send)
5. View AI response
6. Continue conversation
7. View all sessions in sidebar
```

### Workflow 5: Account Customization

```
1. Go to /profile
2. Click "Edit" to enable form
3. Update name, bio, timezone, language
4. Toggle theme preference
5. Set notification preferences
6. Click "Save Changes"
7. → Changes applied immediately
```

---

## Page Loading Order (Recommended)

### First Visit

1. `/login` - Login page
2. `/` - Landing page (if not logged in)
3. `/dashboard` - Main dashboard
4. `/documents` - View documents

### Regular Usage

1. `/dashboard` - Start here
2. `/documents` - Manage uploads
3. `/study/:id` - Study sessions
4. `/analytics` - Track progress
5. `/ai-assistant` - Get help
6. `/profile` - Update settings

---

## Mobile Navigation

### Mobile-Specific Features

- **Hamburger Menu:** Navigation drawer on mobile
- **Bottom Navigation:** Quick access to main sections (optional enhancement)
- **Touch-Friendly:** All buttons 44px+ for easy tapping
- **Responsive Layout:** Single column on mobile, multi-column on desktop

### Mobile Optimizations

- Sidebar hidden on screens < 768px width
- Chat messages stack properly on small screens
- Forms resize for mobile keyboards
- Export history single-column layout

---

## Accessibility Features

### Keyboard Navigation

- **Tab:** Navigate through focusable elements
- **Enter:** Activate buttons and links
- **Space:** Toggle checkboxes and select options
- **Escape:** Close modals and dropdowns
- **Arrow Keys:** Navigate between items in lists

### Screen Reader Support

- All images have alt text
- Form labels properly associated
- Semantic HTML used throughout
- ARIA labels where needed

### Color Contrast

- All text meets WCAG AA standards
- Color not sole indicator of status
- High contrast mode supported

---

## Browser Support

### Desktop Browsers (Recommended)

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Mobile Browsers

- ✅ Chrome Mobile
- ✅ Safari iOS
- ✅ Firefox Mobile
- ✅ Samsung Internet

---

## Performance Tips

### For Best Experience

1. **Clear Browser Cache** - If CSS/JS changes not appearing
2. **Check Internet Connection** - APIs need connectivity
3. **Use Modern Browser** - Old browsers may not support all features
4. **Enable JavaScript** - Required for interactive features
5. **Allow Local Storage** - Session data stored locally

### Keyboard Shortcuts Reference

| Shortcut    | Action         | Location     |
| ----------- | -------------- | ------------ |
| Ctrl+Enter  | Send message   | AI Assistant |
| Shift+Enter | New line       | Chat input   |
| Space       | Flip flashcard | Study mode   |
| Arrow Left  | Previous card  | Study mode   |
| Arrow Right | Next card      | Study mode   |
| Ctrl+F      | Search         | History page |

---

## Troubleshooting Navigation

### Can't Login?

- Check email and password
- Try password reset (/reset-password)
- Clear browser cache and cookies
- Try different browser

### Can't Find a Page?

- Use main navigation from header
- Check dashboard for links
- Try typing URL directly
- Check authentication status

### Sidebar Not Showing?

- Expand window width (sidebar hidden on mobile)
- Check if CSS loaded properly
- Refresh page (Ctrl+R)
- Check browser console for errors

### Links Not Working?

- Check internet connection
- Refresh page
- Clear browser cache
- Try different browser

---

## Site Statistics

| Metric          | Count |
| --------------- | ----- |
| Total Pages     | 12    |
| Protected Pages | 10    |
| Public Pages    | 2     |
| Components      | 25+   |
| Services        | 8     |
| Total Routes    | 20+   |

---

**End of Navigation Guide**

For questions or issues, see [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) or [PHASE_4_COMPLETION_REPORT.md](PHASE_4_COMPLETION_REPORT.md)
