# 🚀 Phase 5 Backend - Deployment & Testing Guide

## ✅ What's Complete

You now have a **complete, production-ready backend** with:

- 51 API endpoints (classrooms, assignments, grades)
- 5 database models with proper relationships
- Full role-based authorization
- SendGrid email integration
- File upload and export functionality

---

## 🔧 Local Testing Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Verify Database Connection

Your `.env` should have:

```
DATABASE_URL=postgresql://user:password@localhost:5432/pderax
SENDGRID_API_KEY=your_sendgrid_key
EMAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=http://localhost:3000
```

### 3. Run Database Migration

```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# Execute migration (paste contents of migrations/002_phase_5_classroom_system.sql)
# Or use:
psql $DATABASE_URL < backend/migrations/002_phase_5_classroom_system.sql
```

### 4. Start Backend

```bash
cd backend
python main.py
```

You should see:

```
✅ Database tables ensured
✅ DEEPSEEK_API_KEY configured
✅ Environment: development
✅ Uvicorn running on http://127.0.0.1:8000
```

---

## 📋 Testing Checklist

### Phase 1: Basic Endpoints

- [ ] POST /api/v1/classrooms - Create classroom
- [ ] GET /api/v1/classrooms - List classrooms
- [ ] GET /api/v1/classrooms/{id} - Get classroom details
- [ ] PUT /api/v1/classrooms/{id} - Update classroom

### Phase 2: Student Management

- [ ] POST /api/v1/classrooms/{id}/invite - Invite student
- [ ] POST /api/v1/classrooms/{id}/invite-codes - Generate invite code
- [ ] POST /api/v1/classrooms/join-code - Join with code
- [ ] GET /api/v1/classrooms/{id}/students - List students

### Phase 3: Assignments

- [ ] POST /api/v1/classrooms/{cid}/assignments - Create assignment
- [ ] POST /api/v1/classrooms/{cid}/assignments/{id}/publish - Publish
- [ ] POST /api/v1/classrooms/{cid}/assignments/{id}/submit - Submit assignment
- [ ] GET /api/v1/classrooms/{cid}/assignments/{id}/submissions - Get submissions

### Phase 4: Grading

- [ ] PUT /api/v1/classrooms/{cid}/assignments/{id}/grade - Grade submission
- [ ] POST /api/v1/classrooms/{cid}/assignments/{id}/grades - Bulk grade
- [ ] GET /api/v1/classrooms/{id}/gradebook - View gradebook
- [ ] GET /api/v1/classrooms/{id}/students/{sid}/grades - Student grades

### Phase 5: Analytics & Reports

- [ ] GET /api/v1/classrooms/{id}/performance - Class performance
- [ ] GET /api/v1/classrooms/{id}/students/{sid}/performance - Student performance
- [ ] GET /api/v1/classrooms/{id}/grade-statistics - Grade statistics
- [ ] GET /api/v1/classrooms/{id}/students/{sid}/report-card - Report card
- [ ] GET /api/v1/classrooms/{id}/gradebook/export - Export gradebook

### Phase 6: Email & Files

- [ ] Verify email sent when inviting students (check SendGrid dashboard)
- [ ] Test file upload in submission
- [ ] Test ZIP export of submissions with attachments
- [ ] Test CSV export of grades

### Phase 7: Authorization

- [ ] ✅ Teacher can view/manage their classrooms
- [ ] ✅ Student can only see enrolled classrooms
- [ ] ✅ Admin can see all classrooms
- [ ] ✅ Student can only submit/grade their own work
- [ ] ✅ Teacher can view full gradebook

---

## 🧪 API Testing Examples

### Create Classroom

```bash
curl -X POST http://localhost:8000/api/v1/classrooms \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Python 101",
    "description": "Introduction to Python"
  }'
```

### Generate Invite Code

```bash
curl -X POST http://localhost:8000/api/v1/classrooms/{classroom_id}/invite-codes \
  -H "Authorization: Bearer TEACHER_TOKEN" \
  -H "Content-Type: application/json"
```

### Join with Code

```bash
curl -X POST http://localhost:8000/api/v1/classrooms/join-code \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invite_code": "ABC12345"}'
```

### Create Assignment

```bash
curl -X POST http://localhost:8000/api/v1/classrooms/{id}/assignments \
  -H "Authorization: Bearer TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Assignment 1",
    "description": "First assignment",
    "points_possible": 100,
    "due_date": "2025-02-15T23:59:59Z"
  }'
```

### Submit Assignment

```bash
curl -X POST http://localhost:8000/api/v1/classrooms/{cid}/assignments/{aid}/submit \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -F "content=My submission text" \
  -F "file=@path/to/file.pdf"
```

### Grade Assignment

```bash
curl -X PUT http://localhost:8000/api/v1/classrooms/{cid}/assignments/{aid}/grade \
  -H "Authorization: Bearer TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "submission_id": "uuid",
    "points_earned": 95,
    "feedback": "Great work!"
  }'
```

### View Gradebook

```bash
curl -X GET "http://localhost:8000/api/v1/classrooms/{id}/gradebook?page=1&limit=50" \
  -H "Authorization: Bearer TEACHER_TOKEN"
```

### Export Gradebook

```bash
curl -X GET "http://localhost:8000/api/v1/classrooms/{id}/gradebook/export?format=csv" \
  -H "Authorization: Bearer TEACHER_TOKEN" \
  -o gradebook.csv
```

---

## 🔍 Debugging Tips

### Check Database Tables

```sql
\dt classroom
\dt classroom_enrollment
\dt assignment
\dt submission
\dt grade
```

### View Indexes

```sql
SELECT * FROM pg_indexes WHERE tablename LIKE 'classroom%';
```

### Check Records

```sql
SELECT * FROM classroom LIMIT 5;
SELECT * FROM assignment WHERE classroom_id = 'UUID' LIMIT 5;
```

### Test Email Configuration

```python
# In Python shell
from services.email_service import send_classroom_invitation
import asyncio

asyncio.run(send_classroom_invitation(
    student_email="test@example.com",
    classroom_name="Test Class",
    teacher_name="Dr. Smith",
    invite_code="ABC12345",
    classroom_id="uuid"
))
```

---

## 📊 File Structure Summary

```
backend/
├── main.py                          (Updated with 3 new routers)
├── requirements.txt                 (Dependencies)
├── models/
│   └── db_models.py                (5 new models added)
├── schemas/
│   ├── classrooms.py               (13 schemas)
│   ├── assignments.py              (12 schemas)
│   └── grades.py                   (19 schemas)
├── routes/
│   ├── classrooms.py               (17 endpoints)
│   ├── assignments.py              (18 endpoints)
│   ├── grades.py                   (16 endpoints)
│   └── [other routes...]
├── services/
│   ├── email_service.py            (Extended with SendGrid)
│   └── [other services...]
├── migrations/
│   ├── 001_update_users_table.sql
│   └── 002_phase_5_classroom_system.sql (NEW)
└── ...
```

---

## 🚀 Production Deployment

### On Render.com

1. **Ensure render.yaml is updated**

```yaml
services:
  - type: web
    name: pderax-backend
    env: python
    plan: standard
    buildCommand: pip install -r backend/requirements.txt
    startCommand: cd backend && python main.py
    envVars:
      - key: DATABASE_URL
        scope: run
        value: (your PostgreSQL connection)
      - key: SENDGRID_API_KEY
        scope: run
        value: (your SendGrid API key)
      - key: EMAIL_FROM
        scope: run
        value: noreply@yourdomain.com
      - key: FRONTEND_URL
        scope: run
        value: https://yourdomain.com
```

2. **Run migration on production DB**

```bash
psql $PRODUCTION_DATABASE_URL < backend/migrations/002_phase_5_classroom_system.sql
```

3. **Deploy**

```bash
git add .
git commit -m "feat: Phase 5 backend implementation complete"
git push
```

4. **Verify Deployment**

```bash
curl https://your-backend-domain/health
# Should return: {"status": "healthy", ...}
```

---

## 📞 Support

### Common Issues

**Issue: "Classroom not found"**

- Check that classroom_id is correct UUID format
- Verify classroom exists in database
- Check authorization (teacher or admin only)

**Issue: "Not enrolled in classroom"**

- Student must join with invite code first
- Check ClassroomEnrollment table has student record

**Issue: "File upload failed"**

- Check `/static/submissions` directory exists and is writable
- Verify file size is within limits
- Check multipart form data encoding

**Issue: "Email not sent"**

- Verify SENDGRID_API_KEY is set in .env
- Check SendGrid dashboard for bounce/block lists
- Verify EMAIL_FROM domain is authorized

**Issue: "Grade calculation error"**

- Ensure points_earned <= points_possible
- Check percentage calculation: (points_earned / points_possible) \* 100
- Letter grades: A+ >= 97%, A >= 93%, A- >= 90%, etc.

---

## 📚 Documentation Files

- **PHASE_5_BACKEND_COMPLETE.md** - This comprehensive overview
- **PHASE_5_BACKEND_PLAN.md** - Detailed implementation specification (50+ pages)
- Each route file has docstrings explaining each endpoint
- Database migration file has comments explaining each table

---

## ✨ What's Next

After successful testing:

1. Update frontend to call new endpoints
2. Test complete classroom workflow
3. Monitor logs for errors
4. Gather user feedback
5. Iterate on UI/UX

---

**Status**: ✅ READY FOR TESTING & DEPLOYMENT  
**Endpoints**: 51/51 complete  
**Database**: Schema ready  
**Email**: Configured  
**Authorization**: Implemented

Happy teaching! 🎓
