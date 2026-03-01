# 📋 Phase 5 API Endpoints Reference

## Quick Navigation

- **Classrooms** (17 endpoints)
- **Assignments** (18 endpoints)
- **Grades** (16 endpoints)
- **Total**: 51 endpoints

All endpoints are under the `/api/v1` prefix.

---

## 🏛️ CLASSROOM ENDPOINTS (17)

### CRUD Operations (6)

| Method | Endpoint                   | Description                                 | Auth                  |
| ------ | -------------------------- | ------------------------------------------- | --------------------- |
| POST   | `/classrooms`              | Create new classroom                        | Teacher               |
| GET    | `/classrooms`              | List all classrooms (teacher's or enrolled) | User                  |
| GET    | `/classrooms/{id}`         | Get classroom details                       | Teacher/Student/Admin |
| PUT    | `/classrooms/{id}`         | Update classroom                            | Teacher               |
| DELETE | `/classrooms/{id}`         | Delete classroom                            | Teacher               |
| POST   | `/classrooms/{id}/archive` | Archive classroom                           | Teacher               |

### Student Management (4)

| Method | Endpoint                                      | Description                 | Auth    |
| ------ | --------------------------------------------- | --------------------------- | ------- |
| GET    | `/classrooms/{id}/students`                   | List enrolled students      | Teacher |
| POST   | `/classrooms/{id}/invite`                     | Invite student to classroom | Teacher |
| DELETE | `/classrooms/{id}/students/{student_id}`      | Remove student              | Teacher |
| PUT    | `/classrooms/{id}/students/{student_id}/role` | Change student role         | Teacher |

### Invite Code Management (3)

| Method | Endpoint                        | Description                     | Auth    |
| ------ | ------------------------------- | ------------------------------- | ------- |
| POST   | `/classrooms/{id}/invite-codes` | Generate new invite code        | Teacher |
| GET    | `/classrooms/{id}/invite-codes` | List invite codes               | Teacher |
| POST   | `/classrooms/join-code`         | Join classroom with invite code | Student |

### Settings & Statistics (4)

| Method | Endpoint                    | Description                       | Auth    |
| ------ | --------------------------- | --------------------------------- | ------- |
| PUT    | `/classrooms/{id}/settings` | Update classroom settings         | Teacher |
| GET    | `/classrooms/{id}/stats`    | Get classroom statistics          | Teacher |
| GET    | `/students/classrooms`      | Get student's enrolled classrooms | Student |
| GET    | `/classrooms/{id}/export`   | Export classroom roster (CSV)     | Teacher |

---

## 📝 ASSIGNMENT ENDPOINTS (18)

### CRUD Operations (5)

| Method | Endpoint                             | Description                   | Auth            |
| ------ | ------------------------------------ | ----------------------------- | --------------- |
| POST   | `/classrooms/{cid}/assignments`      | Create assignment             | Teacher         |
| GET    | `/classrooms/{cid}/assignments`      | List assignments in classroom | Teacher/Student |
| GET    | `/classrooms/{cid}/assignments/{id}` | Get assignment details        | Teacher/Student |
| PUT    | `/classrooms/{cid}/assignments/{id}` | Update assignment             | Teacher         |
| DELETE | `/classrooms/{cid}/assignments/{id}` | Delete assignment             | Teacher         |

### Lifecycle Management (2)

| Method | Endpoint                                     | Description                            | Auth    |
| ------ | -------------------------------------------- | -------------------------------------- | ------- |
| POST   | `/classrooms/{cid}/assignments/{id}/publish` | Publish assignment for students        | Teacher |
| POST   | `/classrooms/{cid}/assignments/{id}/close`   | Close assignment (no late submissions) | Teacher |

### Submission Management (5)

| Method | Endpoint                                               | Description               | Auth                  |
| ------ | ------------------------------------------------------ | ------------------------- | --------------------- |
| GET    | `/classrooms/{cid}/assignments/{id}/submissions`       | List all submissions      | Teacher               |
| GET    | `/classrooms/{cid}/assignments/{id}/submissions/{sid}` | Get specific submission   | Teacher/Student (own) |
| POST   | `/classrooms/{cid}/assignments/{id}/submit`            | Submit assignment         | Student               |
| GET    | `/classrooms/{cid}/assignments/{id}/my`                | Get my submission         | Student               |
| GET    | `/students/{sid}/assignments`                          | Get student's assignments | Student/Teacher       |

### Grading (2)

| Method | Endpoint                                    | Description        | Auth    |
| ------ | ------------------------------------------- | ------------------ | ------- |
| PUT    | `/classrooms/{cid}/assignments/{id}/grade`  | Grade a submission | Teacher |
| POST   | `/classrooms/{cid}/assignments/{id}/grades` | Bulk update grades | Teacher |

### Rubric Management (2)

| Method | Endpoint                                    | Description               | Auth            |
| ------ | ------------------------------------------- | ------------------------- | --------------- |
| POST   | `/classrooms/{cid}/assignments/{id}/rubric` | Set rubric for assignment | Teacher         |
| GET    | `/classrooms/{cid}/assignments/{id}/rubric` | Get assignment rubric     | Teacher/Student |

### Analytics & Export (2)

| Method | Endpoint                                    | Description                     | Auth    |
| ------ | ------------------------------------------- | ------------------------------- | ------- |
| GET    | `/classrooms/{cid}/assignments/{id}/stats`  | Get assignment statistics       | Teacher |
| GET    | `/classrooms/{cid}/assignments/{id}/export` | Export submissions (CSV or ZIP) | Teacher |

---

## 📊 GRADE ENDPOINTS (16)

### Gradebook Access (4)

| Method | Endpoint                                    | Description              | Auth                  |
| ------ | ------------------------------------------- | ------------------------ | --------------------- |
| GET    | `/classrooms/{id}/gradebook`                | View full gradebook      | Teacher               |
| GET    | `/classrooms/{id}/students/{sid}/grades`    | Get student's grades     | Teacher/Student (own) |
| GET    | `/classrooms/{id}/grades/my`                | Get my grades            | Student               |
| GET    | `/classrooms/{id}/assignments/{aid}/grades` | Get grades by assignment | Teacher               |

### Performance Analytics (3)

| Method | Endpoint                                      | Description                        | Auth                  |
| ------ | --------------------------------------------- | ---------------------------------- | --------------------- |
| GET    | `/classrooms/{id}/students/{sid}/performance` | Get student performance analytics  | Teacher/Student (own) |
| GET    | `/classrooms/{id}/performance/my`             | Get my performance analytics       | Student               |
| GET    | `/classrooms/{id}/performance`                | Get class-wide performance metrics | Teacher               |

### Trends & Statistics (3)

| Method | Endpoint                            | Description                        | Auth                  |
| ------ | ----------------------------------- | ---------------------------------- | --------------------- |
| GET    | `/classrooms/{id}/grades/trends`    | Get grade trends over time         | Teacher/Student (own) |
| GET    | `/classrooms/{id}/grade-statistics` | Get statistical analysis of grades | Teacher               |
| POST   | `/classrooms/{id}/grade-weightings` | Set grade weightings               | Teacher               |

### Report Generation (3)

| Method | Endpoint                                      | Description                           | Auth                  |
| ------ | --------------------------------------------- | ------------------------------------- | --------------------- |
| GET    | `/classrooms/{id}/students/{sid}/report-card` | Generate student report card          | Teacher/Student (own) |
| GET    | `/classrooms/{id}/report-card/my`             | Get my report card                    | Student               |
| GET    | `/classrooms/{id}/progress-reports`           | Generate all student progress reports | Teacher               |

### Grade Weightings & Export (3)

| Method | Endpoint                            | Description                    | Auth    |
| ------ | ----------------------------------- | ------------------------------ | ------- |
| GET    | `/classrooms/{id}/grade-weightings` | Get grade weightings           | Teacher |
| GET    | `/classrooms/{id}/gradebook/export` | Export gradebook (CSV or JSON) | Teacher |

---

## 🔐 Authorization Levels

- **Teacher**: Can manage classrooms, assignments, and grades
- **Student**: Can submit work and view own grades
- **Admin**: Full access to everything
- **Assistant**: Can view but not grade

---

## 📤 Request/Response Formats

### Create Classroom

```json
POST /api/v1/classrooms
{
  "name": "Python 101",
  "description": "Introduction to Python"
}
```

### Create Assignment

```json
POST /api/v1/classrooms/{id}/assignments
{
  "title": "Assignment 1",
  "description": "First assignment",
  "points_possible": 100,
  "due_date": "2025-02-15T23:59:59Z"
}
```

### Submit Assignment

```
POST /api/v1/classrooms/{cid}/assignments/{id}/submit
Content-Type: multipart/form-data

content: "My submission text"
file: <binary file data>
```

### Grade Submission

```json
PUT /api/v1/classrooms/{cid}/assignments/{id}/grade
{
  "submission_id": "uuid",
  "points_earned": 95,
  "feedback": "Great work!",
  "rubric_scores": {
    "clarity": 20,
    "accuracy": 25,
    "completeness": 25,
    "presentation": 25
  }
}
```

### Bulk Grade

```json
POST /api/v1/classrooms/{cid}/assignments/{id}/grades
{
  "grades": [
    {
      "submission_id": "uuid1",
      "points_earned": 95
    },
    {
      "submission_id": "uuid2",
      "points_earned": 87
    }
  ]
}
```

### Join Classroom

```json
POST /api/v1/classrooms/join-code
{
  "invite_code": "ABC12345"
}
```

---

## 📊 Response Formats

### Classroom Response

```json
{
  "id": "uuid",
  "name": "Python 101",
  "description": "Introduction to Python",
  "teacher_id": "uuid",
  "invite_code": "ABC12345",
  "status": "active",
  "settings": {},
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

### Grade Response

```json
{
  "id": "uuid",
  "submission_id": "uuid",
  "assignment_id": "uuid",
  "student_id": "uuid",
  "points_earned": 95,
  "points_possible": 100,
  "percentage": 95.0,
  "letter_grade": "A",
  "feedback": "Great work!",
  "graded_by": "teacher_uuid",
  "graded_at": "2025-01-15T14:30:00Z"
}
```

### Gradebook Response

```json
{
  "assignments": [
    {
      "id": "uuid",
      "title": "Assignment 1",
      "points_possible": 100,
      "due_date": "2025-02-15T23:59:59Z",
      "status": "published"
    }
  ],
  "students": [
    {
      "student_id": "uuid",
      "student_name": "John Doe",
      "student_email": "john@example.com",
      "grades": [...],
      "overall_average": 92.5,
      "overall_letter_grade": "A"
    }
  ],
  "class_average": 88.3,
  "page": 1,
  "per_page": 50,
  "total_pages": 1,
  "total_students": 25
}
```

---

## ⚙️ Query Parameters

### Pagination

```
?page=1&limit=50
```

### Export Format

```
?format=csv
?format=json
?format=zip
```

### Filtering

```
?status=published
?role=student
```

---

## 🔄 Status Codes

| Code | Meaning      |
| ---- | ------------ |
| 200  | Success      |
| 201  | Created      |
| 400  | Bad Request  |
| 401  | Unauthorized |
| 403  | Forbidden    |
| 404  | Not Found    |
| 500  | Server Error |

---

## 🌟 Notable Features

✨ **Pagination**: All list endpoints support `page` and `limit` parameters  
✨ **Exports**: CSV and JSON formats for data analysis  
✨ **Attachments**: Support for file uploads on submissions  
✨ **Rubrics**: JSONB-based flexible rubric scoring  
✨ **Analytics**: Statistical analysis and trend detection  
✨ **Emails**: SendGrid integration for notifications  
✨ **Role-Based**: Granular access control throughout

---

**Total Endpoints**: 51  
**All endpoints under**: `/api/v1/`  
**All endpoints require**: JWT Authentication via Bearer token  
**Documentation**: OpenAPI/Swagger at `/docs`
