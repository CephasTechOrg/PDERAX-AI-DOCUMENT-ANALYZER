"""
Grade Management and Analytics Routes
Handles gradebook, performance analytics, and reporting
"""
import csv
import math
from datetime import datetime, timedelta
from io import StringIO
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import func, and_
from sqlalchemy.orm import Session

from auth_dependencies import get_current_user
from dependencies import get_db
from models.db_models import Assignment, Classroom, ClassroomEnrollment, Grade, Submission, User
from schemas.grades import (
    ClassPerformanceOut,
    GradeDistributionOut,
    GradeOut,
    GradeStatisticsOut,
    GradeWeightingOut,
    PaginatedGrades,
    PerformanceAnalyticsOut,
    ReportCardOut,
    StudentGradesOut,
)
from schemas.classrooms import MessageResponse

grade_router = APIRouter(prefix="/classrooms", tags=["Grades"])


def calculate_letter_grade(percentage: float) -> str:
    """Calculate letter grade from percentage"""
    if percentage >= 97: return "A+"
    elif percentage >= 93: return "A"
    elif percentage >= 90: return "A-"
    elif percentage >= 87: return "B+"
    elif percentage >= 83: return "B"
    elif percentage >= 80: return "B-"
    elif percentage >= 77: return "C+"
    elif percentage >= 73: return "C"
    elif percentage >= 70: return "C-"
    elif percentage >= 60: return "D"
    else: return "F"


# ============================================================================
# GRADEBOOK
# ============================================================================


@grade_router.get("/{classroom_id}/gradebook", response_model=dict)
async def get_gradebook(
    classroom_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get full gradebook for a classroom"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Only teacher or admin can view full gradebook
    if classroom.teacher_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Get all assignments (published and closed)
    assignments = db.query(Assignment).filter(
        Assignment.classroom_id == classroom_id,
        Assignment.status.in_(["published", "closed"])
    ).order_by(Assignment.created_at).all()
    
    # Get all enrolled students
    students_query = db.query(User).join(
        ClassroomEnrollment,
        ClassroomEnrollment.student_id == User.id
    ).filter(
        ClassroomEnrollment.classroom_id == classroom_id,
        ClassroomEnrollment.status == "active"
    )
    
    total_students = students_query.count()
    total_pages = math.ceil(total_students / limit)
    offset = (page - 1) * limit
    
    students = students_query.order_by(User.full_name).offset(offset).limit(limit).all()
    
    # Build gradebook
    class_total_points = 0
    class_total_earned = 0
    class_count = 0
    
    student_grades_list = []
    
    for student in students:
        student_total_earned = 0
        student_total_points = 0
        student_grades = []
        
        for assignment in assignments:
            grade = db.query(Grade).filter(
                Grade.assignment_id == assignment.id,
                Grade.student_id == student.id
            ).first()
            
            if grade:
                student_total_earned += grade.points_earned
                student_total_points += grade.points_possible
                class_total_earned += grade.points_earned
                class_total_points += grade.points_possible
                
                student_grades.append({
                    "assignment_id": assignment.id,
                    "assignment_title": assignment.title,
                    "points_earned": grade.points_earned,
                    "points_possible": grade.points_possible,
                    "percentage": grade.percentage,
                    "letter_grade": grade.letter_grade
                })
            else:
                student_grades.append({
                    "assignment_id": assignment.id,
                    "assignment_title": assignment.title,
                    "points_earned": None,
                    "points_possible": assignment.points_possible,
                    "percentage": None,
                    "letter_grade": None
                })
        
        # Calculate student average
        student_average = 0.0
        if student_total_points > 0:
            student_average = (student_total_earned / student_total_points) * 100
            class_count += 1
        
        student_grades_list.append(StudentGradesOut(
            student_id=student.id,
            student_name=student.full_name or student.email.split('@')[0],
            student_email=student.email,
            grades=student_grades,
            overall_average=round(student_average, 2),
            overall_letter_grade=calculate_letter_grade(student_average),
            total_points_earned=student_total_earned,
            total_points_possible=student_total_points
        ))
    
    # Calculate class average
    class_average = 0.0
    if class_total_points > 0:
        class_average = (class_total_earned / class_total_points) * 100
    
    return {
        "assignments": [
            {
                "id": a.id,
                "title": a.title,
                "points_possible": a.points_possible,
                "due_date": a.due_date,
                "status": a.status
            } for a in assignments
        ],
        "students": student_grades_list,
        "class_average": round(class_average, 2),
        "page": page,
        "per_page": limit,
        "total_pages": total_pages,
        "total_students": total_students
    }


@grade_router.get("/{classroom_id}/students/{student_id}/grades", response_model=StudentGradesOut)
async def get_student_grades(
    classroom_id: UUID,
    student_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get grades for a specific student"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Check access
    is_teacher = classroom.teacher_id == current_user.id
    is_student = student_id == current_user.id
    
    if not (is_teacher or is_student or current_user.is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    
    # Get all grades for student in classroom
    grades = db.query(Grade, Assignment).join(
        Assignment, Grade.assignment_id == Assignment.id
    ).filter(
        Grade.classroom_id == classroom_id,
        Grade.student_id == student_id
    ).all()
    
    total_earned = 0
    total_possible = 0
    grade_entries = []
    
    for grade, assignment in grades:
        total_earned += grade.points_earned
        total_possible += grade.points_possible
        
        grade_entries.append({
            "id": grade.id,
            "assignment_id": assignment.id,
            "assignment_title": assignment.title,
            "points_earned": grade.points_earned,
            "points_possible": grade.points_possible,
            "percentage": grade.percentage,
            "letter_grade": grade.letter_grade,
            "submitted_at": grade.submission_id,  # Would link to submission
            "graded_at": grade.graded_at
        })
    
    # Calculate overall
    overall_average = 0.0
    if total_possible > 0:
        overall_average = (total_earned / total_possible) * 100
    
    return StudentGradesOut(
        student_id=student_id,
        student_name=student.full_name or student.email.split('@')[0],
        student_email=student.email,
        grades=grade_entries,
        overall_average=round(overall_average, 2),
        overall_letter_grade=calculate_letter_grade(overall_average),
        total_points_earned=total_earned,
        total_points_possible=total_possible
    )


@grade_router.get("/{classroom_id}/grades/my", response_model=StudentGradesOut)
async def get_my_grades(
    classroom_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current student's grades"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Check enrollment
    enrollment = db.query(ClassroomEnrollment).filter(
        ClassroomEnrollment.classroom_id == classroom_id,
        ClassroomEnrollment.student_id == current_user.id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enrolled in classroom")
    
    # Get all grades
    grades = db.query(Grade, Assignment).join(
        Assignment, Grade.assignment_id == Assignment.id
    ).filter(
        Grade.classroom_id == classroom_id,
        Grade.student_id == current_user.id
    ).all()
    
    total_earned = 0
    total_possible = 0
    grade_entries = []
    
    for grade, assignment in grades:
        total_earned += grade.points_earned
        total_possible += grade.points_possible
        
        grade_entries.append({
            "id": grade.id,
            "assignment_id": assignment.id,
            "assignment_title": assignment.title,
            "points_earned": grade.points_earned,
            "points_possible": grade.points_possible,
            "percentage": grade.percentage,
            "letter_grade": grade.letter_grade,
            "graded_at": grade.graded_at
        })
    
    # Calculate overall
    overall_average = 0.0
    if total_possible > 0:
        overall_average = (total_earned / total_possible) * 100
    
    return StudentGradesOut(
        student_id=current_user.id,
        student_name=current_user.full_name or current_user.email.split('@')[0],
        student_email=current_user.email,
        grades=grade_entries,
        overall_average=round(overall_average, 2),
        overall_letter_grade=calculate_letter_grade(overall_average),
        total_points_earned=total_earned,
        total_points_possible=total_possible
    )


@grade_router.get("/{classroom_id}/assignments/{assignment_id}/grades", response_model=PaginatedGrades)
async def get_assignment_grades(
    classroom_id: UUID,
    assignment_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all grades for an assignment"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Only teacher or admin
    if classroom.teacher_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    query = db.query(Grade).filter(
        Grade.assignment_id == assignment_id,
        Grade.classroom_id == classroom_id
    )
    
    total = query.count()
    total_pages = math.ceil(total / limit)
    offset = (page - 1) * limit
    
    grades = query.order_by(Grade.graded_at.desc()).offset(offset).limit(limit).all()
    
    items = [
        GradeOut(
            id=g.id,
            submission_id=g.submission_id,
            assignment_id=g.assignment_id,
            student_id=g.student_id,
            classroom_id=g.classroom_id,
            points_earned=g.points_earned,
            points_possible=g.points_possible,
            percentage=g.percentage,
            letter_grade=g.letter_grade,
            feedback=g.feedback,
            rubric_scores=g.rubric_scores,
            graded_by=g.graded_by,
            graded_at=g.graded_at
        ) for g in grades
    ]
    
    return PaginatedGrades(
        items=items,
        total=total,
        page=page,
        per_page=limit,
        total_pages=total_pages
    )


# ============================================================================
# PERFORMANCE ANALYTICS
# ============================================================================


@grade_router.get("/{classroom_id}/students/{student_id}/performance", response_model=PerformanceAnalyticsOut)
async def get_student_performance(
    classroom_id: UUID,
    student_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get student performance analytics"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Check access
    is_teacher = classroom.teacher_id == current_user.id
    is_student = student_id == current_user.id
    
    if not (is_teacher or is_student or current_user.is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    
    # Get all assignments in classroom
    total_assignments = db.query(func.count(Assignment.id)).filter(
        Assignment.classroom_id == classroom_id,
        Assignment.status.in_(["published", "closed"])
    ).scalar() or 0
    
    # Get completed assignments (with grades)
    completed_assignments = db.query(func.count(Grade.id)).filter(
        Grade.student_id == student_id,
        Grade.classroom_id == classroom_id
    ).scalar() or 0
    
    completion_rate = 0.0
    if total_assignments > 0:
        completion_rate = (completed_assignments / total_assignments) * 100
    
    # Get overall average
    grades = db.query(Grade).filter(
        Grade.student_id == student_id,
        Grade.classroom_id == classroom_id
    ).order_by(Grade.graded_at).all()
    
    overall_average = 0.0
    if grades:
        valid_pcts = [g.percentage for g in grades if g.percentage is not None]
        if valid_pcts:
            overall_average = sum(valid_pcts) / len(valid_pcts)
    
    # Identify strengths and improvements (based on letter grades)
    strengths = []
    improvements = []
    
    a_grades = len([g for g in grades if g.letter_grade in ["A+", "A", "A-"]])
    d_or_f = len([g for g in grades if g.letter_grade in ["D", "F"]])
    
    if a_grades >= 2:
        strengths.append("Strong performance on most assignments")
    if len([g for g in grades if g.letter_grade in ["B+", "B", "B-"]]) >= 3:
        strengths.append("Consistent B-level performance")
    if d_or_f >= 1:
        improvements.append("Focus needed on weaker assignments")
    if completion_rate < 100:
        improvements.append(f"Complete remaining {total_assignments - completed_assignments} assignment(s)")
    
    # Simple trend prediction (grades already sorted by graded_at)
    trend = "stable"
    valid_grades = [g for g in grades if g.percentage is not None]
    if len(valid_grades) >= 3:
        recent = valid_grades[-3:]
        recent_avg = sum(g.percentage for g in recent) / len(recent)
        overall_avg = sum(g.percentage for g in valid_grades) / len(valid_grades)
        if recent_avg > overall_avg + 5:
            trend = "improving"
        elif recent_avg < overall_avg - 5:
            trend = "declining"
    
    # Predict final grade
    predicted_final = overall_average if overall_average > 0 else None
    
    return PerformanceAnalyticsOut(
        student_id=student_id,
        student_name=student.full_name or student.email.split('@')[0],
        overall_average=round(overall_average, 2),
        overall_letter_grade=calculate_letter_grade(overall_average),
        total_assignments=total_assignments,
        completed_assignments=completed_assignments,
        completion_rate=round(completion_rate, 2),
        strengths=strengths or ["On track"],
        areas_for_improvement=improvements or ["None identified"],
        trend=trend,
        predicted_final_grade=round(predicted_final, 2) if predicted_final else None
    )


@grade_router.get("/{classroom_id}/performance/my", response_model=PerformanceAnalyticsOut)
async def get_my_performance(
    classroom_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current student's performance analytics"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Check enrollment
    enrollment = db.query(ClassroomEnrollment).filter(
        ClassroomEnrollment.classroom_id == classroom_id,
        ClassroomEnrollment.student_id == current_user.id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enrolled in classroom")
    
    # Get all assignments
    total_assignments = db.query(func.count(Assignment.id)).filter(
        Assignment.classroom_id == classroom_id,
        Assignment.status.in_(["published", "closed"])
    ).scalar() or 0
    
    # Get completed
    completed_assignments = db.query(func.count(Grade.id)).filter(
        Grade.student_id == current_user.id,
        Grade.classroom_id == classroom_id
    ).scalar() or 0
    
    completion_rate = 0.0
    if total_assignments > 0:
        completion_rate = (completed_assignments / total_assignments) * 100
    
    # Get grades — ordered by graded_at for accurate trend
    grades = db.query(Grade).filter(
        Grade.student_id == current_user.id,
        Grade.classroom_id == classroom_id
    ).order_by(Grade.graded_at).all()
    
    overall_average = 0.0
    if grades:
        valid_pcts = [g.percentage for g in grades if g.percentage is not None]
        if valid_pcts:
            overall_average = sum(valid_pcts) / len(valid_pcts)
    
    strengths = []
    improvements = []
    
    if len([g for g in grades if g.percentage and g.percentage >= 90]) >= 2:
        strengths.append("Strong performance on most assignments")
    if len([g for g in grades if g.percentage and 80 <= g.percentage < 90]) >= 3:
        strengths.append("Consistent solid performance")
    if len([g for g in grades if g.percentage and g.percentage < 70]) >= 1:
        improvements.append("Work on improving lower scores")
    if completion_rate < 100:
        improvements.append(f"Complete remaining {total_assignments - completed_assignments} assignment(s)")
    
    trend = "stable"
    valid_grades = [g for g in grades if g.percentage is not None]
    if len(valid_grades) >= 3:
        recent = valid_grades[-3:]
        recent_avg = sum(g.percentage for g in recent) / len(recent)
        overall_avg = sum(g.percentage for g in valid_grades) / len(valid_grades)
        if recent_avg > overall_avg + 5:
            trend = "improving"
        elif recent_avg < overall_avg - 5:
            trend = "declining"
    
    return PerformanceAnalyticsOut(
        student_id=current_user.id,
        student_name=current_user.full_name or current_user.email.split('@')[0],
        overall_average=round(overall_average, 2),
        overall_letter_grade=calculate_letter_grade(overall_average),
        total_assignments=total_assignments,
        completed_assignments=completed_assignments,
        completion_rate=round(completion_rate, 2),
        strengths=strengths or ["On track"],
        areas_for_improvement=improvements or ["None identified"],
        trend=trend,
        predicted_final_grade=round(overall_average, 2) if overall_average > 0 else None
    )


@grade_router.get("/{classroom_id}/performance", response_model=ClassPerformanceOut)
async def get_class_performance(
    classroom_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get class-wide performance metrics"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Only teacher or admin
    if classroom.teacher_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Get all grades
    grades = db.query(Grade).filter(Grade.classroom_id == classroom_id).all()
    
    if not grades:
        return ClassPerformanceOut(
            classroom_id=classroom_id,
            total_students=0,
            average_score=0.0,
            median_score=0.0,
            std_deviation=0.0,
            grade_distribution=GradeDistributionOut(),
            top_performers=[],
            struggling_students=[]
        )
    
    # Calculate statistics
    percentages = [g.percentage for g in grades if g.percentage]
    percentages.sort()
    
    mean = sum(percentages) / len(percentages) if percentages else 0.0
    n = len(percentages)
    if n == 0:
        median = 0.0
    elif n % 2 == 1:
        median = percentages[n // 2]
    else:
        median = (percentages[n // 2 - 1] + percentages[n // 2]) / 2
    
    # Calculate standard deviation
    if len(percentages) > 1:
        variance = sum((x - mean) ** 2 for x in percentages) / len(percentages)
        std_dev = variance ** 0.5
    else:
        std_dev = 0.0
    
    # Grade distribution
    distribution = GradeDistributionOut()
    for grade in grades:
        if not grade.letter_grade:
            continue
        if grade.letter_grade == "A+": distribution.a_plus += 1
        elif grade.letter_grade == "A": distribution.a += 1
        elif grade.letter_grade == "A-": distribution.a_minus += 1
        elif grade.letter_grade == "B+": distribution.b_plus += 1
        elif grade.letter_grade == "B": distribution.b += 1
        elif grade.letter_grade == "B-": distribution.b_minus += 1
        elif grade.letter_grade == "C+": distribution.c_plus += 1
        elif grade.letter_grade == "C": distribution.c += 1
        elif grade.letter_grade == "C-": distribution.c_minus += 1
        elif grade.letter_grade == "D": distribution.d += 1
        elif grade.letter_grade == "F": distribution.f += 1
    
    # Top performers
    top_grades = sorted(grades, key=lambda g: g.percentage or 0, reverse=True)[:5]
    top_performers = [
        {
            "student_id": g.student_id,
            "average": round(g.percentage, 2),
            "letter_grade": g.letter_grade
        } for g in top_grades
    ]
    
    # Struggling students
    struggling_grades = sorted(grades, key=lambda g: g.percentage or 0)[:5]
    struggling = [
        {
            "student_id": g.student_id,
            "average": round(g.percentage, 2),
            "letter_grade": g.letter_grade
        } for g in struggling_grades if g.percentage and g.percentage < 70
    ]
    
    total_students = len(set(g.student_id for g in grades))
    
    return ClassPerformanceOut(
        classroom_id=classroom_id,
        total_students=total_students,
        average_score=round(mean, 2),
        median_score=round(median, 2),
        std_deviation=round(std_dev, 2),
        grade_distribution=distribution,
        top_performers=top_performers,
        struggling_students=struggling
    )


# ============================================================================
# TRENDS & STATISTICS
# ============================================================================


@grade_router.get("/{classroom_id}/grades/trends", response_model=dict)
async def get_grade_trends(
    classroom_id: UUID,
    student_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get grade trends over time"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # If student_id provided, check access
    if student_id:
        is_teacher = classroom.teacher_id == current_user.id
        is_student = student_id == current_user.id
        if not (is_teacher or is_student or current_user.is_admin):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    else:
        # Use current user as student
        student_id = current_user.id
    
    # Get grades ordered by time
    grades = db.query(Grade, Assignment).join(
        Assignment, Grade.assignment_id == Assignment.id
    ).filter(
        Grade.student_id == student_id,
        Grade.classroom_id == classroom_id
    ).order_by(Grade.graded_at).all()
    
    data_points = [
        {
            "date": g.graded_at,
            "score": g.percentage or 0,
            "assignment_title": a.title
        } for g, a in grades
    ]
    
    return {
        "student_id": student_id,
        "data_points": data_points,
        "trend": "improving" if len(data_points) > 1 and data_points[-1]["score"] > data_points[0]["score"] else "stable"
    }


@grade_router.get("/{classroom_id}/grade-statistics", response_model=GradeStatisticsOut)
async def get_grade_statistics(
    classroom_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get grade statistics for classroom"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Check access
    is_teacher = classroom.teacher_id == current_user.id
    if not (is_teacher or current_user.is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Get all grades
    grades = db.query(Grade).filter(Grade.classroom_id == classroom_id).all()
    percentages = [g.percentage for g in grades if g.percentage]
    
    if not percentages:
        return GradeStatisticsOut(
            mean=0.0, median=0.0, mode=None, std_dev=0.0, min=0.0, max=0.0, quartiles={}
        )
    
    percentages.sort()
    
    mean = sum(percentages) / len(percentages)
    n = len(percentages)
    if n % 2 == 1:
        median = percentages[n // 2]
    else:
        median = (percentages[n // 2 - 1] + percentages[n // 2]) / 2
    
    # Mode
    from collections import Counter
    counts = Counter(percentages)
    mode = counts.most_common(1)[0][0] if counts else None
    
    # Std dev
    variance = sum((x - mean) ** 2 for x in percentages) / len(percentages)
    std_dev = variance ** 0.5
    
    # Quartiles
    q1_idx = len(percentages) // 4
    q3_idx = (len(percentages) * 3) // 4
    
    return GradeStatisticsOut(
        mean=round(mean, 2),
        median=round(median, 2),
        mode=round(mode, 2) if mode else None,
        std_dev=round(std_dev, 2),
        min=round(min(percentages), 2),
        max=round(max(percentages), 2),
        quartiles={
            "q1": round(percentages[q1_idx], 2),
            "q3": round(percentages[q3_idx], 2)
        }
    )


# ============================================================================
# REPORTS
# ============================================================================


@grade_router.get("/{classroom_id}/students/{student_id}/report-card", response_model=ReportCardOut)
async def generate_report_card(
    classroom_id: UUID,
    student_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate student report card"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Check access
    is_teacher = classroom.teacher_id == current_user.id
    is_student = student_id == current_user.id
    if not (is_teacher or is_student or current_user.is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    
    # Get grades
    grades = db.query(Grade, Assignment).join(
        Assignment, Grade.assignment_id == Assignment.id
    ).filter(
        Grade.student_id == student_id,
        Grade.classroom_id == classroom_id
    ).all()
    
    total_earned = 0
    total_possible = 0
    grade_entries = []
    
    for grade, assignment in grades:
        total_earned += grade.points_earned
        total_possible += grade.points_possible
        
        grade_entries.append({
            "id": grade.id,
            "assignment_id": assignment.id,
            "assignment_title": assignment.title,
            "points_earned": grade.points_earned,
            "points_possible": grade.points_possible,
            "percentage": grade.percentage,
            "letter_grade": grade.letter_grade,
            "graded_at": grade.graded_at
        })
    
    overall_percentage = 0.0
    if total_possible > 0:
        overall_percentage = (total_earned / total_possible) * 100
    
    return ReportCardOut(
        student_id=student_id,
        student_name=student.full_name or student.email.split('@')[0],
        classroom_id=classroom_id,
        classroom_name=classroom.name,
        reporting_period=f"{classroom.created_at.strftime('%B %Y')} - Present",
        overall_grade=calculate_letter_grade(overall_percentage),
        overall_percentage=round(overall_percentage, 2),
        assignments=grade_entries,
        teacher_comments=None,
        generated_at=datetime.utcnow()
    )


@grade_router.get("/{classroom_id}/report-card/my", response_model=ReportCardOut)
async def get_my_report_card(
    classroom_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current student's report card"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Check enrollment
    enrollment = db.query(ClassroomEnrollment).filter(
        ClassroomEnrollment.classroom_id == classroom_id,
        ClassroomEnrollment.student_id == current_user.id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enrolled in classroom")
    
    # Get grades
    grades = db.query(Grade, Assignment).join(
        Assignment, Grade.assignment_id == Assignment.id
    ).filter(
        Grade.student_id == current_user.id,
        Grade.classroom_id == classroom_id
    ).all()
    
    total_earned = 0
    total_possible = 0
    grade_entries = []
    
    for grade, assignment in grades:
        total_earned += grade.points_earned
        total_possible += grade.points_possible
        
        grade_entries.append({
            "id": grade.id,
            "assignment_id": assignment.id,
            "assignment_title": assignment.title,
            "points_earned": grade.points_earned,
            "points_possible": grade.points_possible,
            "percentage": grade.percentage,
            "letter_grade": grade.letter_grade,
            "graded_at": grade.graded_at
        })
    
    overall_percentage = 0.0
    if total_possible > 0:
        overall_percentage = (total_earned / total_possible) * 100
    
    return ReportCardOut(
        student_id=current_user.id,
        student_name=current_user.full_name or current_user.email.split('@')[0],
        classroom_id=classroom_id,
        classroom_name=classroom.name,
        reporting_period=f"{classroom.created_at.strftime('%B %Y')} - Present",
        overall_grade=calculate_letter_grade(overall_percentage),
        overall_percentage=round(overall_percentage, 2),
        assignments=grade_entries,
        teacher_comments=None,
        generated_at=datetime.utcnow()
    )


@grade_router.get("/{classroom_id}/progress-reports", response_model=list[ReportCardOut])
async def generate_progress_reports(
    classroom_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate progress reports for all students in classroom"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Only teacher or admin
    if classroom.teacher_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Get all students
    students = db.query(User).join(
        ClassroomEnrollment, ClassroomEnrollment.student_id == User.id
    ).filter(
        ClassroomEnrollment.classroom_id == classroom_id,
        ClassroomEnrollment.status == "active"
    ).all()
    
    reports = []
    
    for student in students:
        grades = db.query(Grade).filter(
            Grade.student_id == student.id,
            Grade.classroom_id == classroom_id
        ).all()
        
        total_earned = sum(g.points_earned for g in grades)
        total_possible = sum(g.points_possible for g in grades)
        
        overall_percentage = 0.0
        if total_possible > 0:
            overall_percentage = (total_earned / total_possible) * 100
        
        grade_entries = [
            {
                "id": g.id,
                "assignment_id": g.assignment_id,
                "points_earned": g.points_earned,
                "points_possible": g.points_possible,
                "percentage": g.percentage,
                "letter_grade": g.letter_grade
            } for g in grades
        ]
        
        report = ReportCardOut(
            student_id=student.id,
            student_name=student.full_name or student.email.split('@')[0],
            classroom_id=classroom_id,
            classroom_name=classroom.name,
            reporting_period=f"{classroom.created_at.strftime('%B %Y')} - Present",
            overall_grade=calculate_letter_grade(overall_percentage),
            overall_percentage=round(overall_percentage, 2),
            assignments=grade_entries,
            generated_at=datetime.utcnow()
        )
        reports.append(report)
    
    return reports


@grade_router.post("/{classroom_id}/grade-weightings", response_model=GradeWeightingOut)
async def set_grade_weightings(
    classroom_id: UUID,
    weightings_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set grade weightings for classroom"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Only teacher
    if classroom.teacher_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Store weightings in classroom settings
    if not classroom.settings:
        classroom.settings = {}
    
    classroom.settings["grade_weightings"] = weightings_data.get("weightings", {})
    db.commit()
    db.refresh(classroom)
    
    return GradeWeightingOut(
        classroom_id=classroom_id,
        weightings=classroom.settings.get("grade_weightings", {}),
        updated_at=classroom.updated_at
    )


@grade_router.get("/{classroom_id}/grade-weightings", response_model=GradeWeightingOut)
async def get_grade_weightings(
    classroom_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get grade weightings for classroom"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Only teacher
    if classroom.teacher_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    return GradeWeightingOut(
        classroom_id=classroom_id,
        weightings=classroom.settings.get("grade_weightings", {}),
        updated_at=classroom.updated_at
    )


@grade_router.get("/{classroom_id}/gradebook/export")
async def export_gradebook(
    classroom_id: UUID,
    format: str = Query("csv", regex="^(csv|json)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export gradebook as CSV or JSON"""
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classroom not found")
    
    # Only teacher
    if classroom.teacher_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Get gradebook data
    grades = db.query(Grade, User, Assignment).join(
        User, Grade.student_id == User.id
    ).join(
        Assignment, Grade.assignment_id == Assignment.id
    ).filter(
        Grade.classroom_id == classroom_id
    ).all()
    
    if format == "csv":
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["Student", "Email", "Assignment", "Points", "Percentage", "Letter Grade", "Graded Date"])
        
        for grade, user, assignment in grades:
            writer.writerow([
                user.full_name or user.email.split('@')[0],
                user.email,
                assignment.title,
                f"{grade.points_earned}/{grade.points_possible}",
                f"{grade.percentage}%",
                grade.letter_grade,
                grade.graded_at.strftime("%Y-%m-%d") if grade.graded_at else ""
            ])
        
        csv_content = output.getvalue()
        
        import re as _re
        safe_name = _re.sub(r'[^\w\s-]', '', classroom.name).strip().replace(' ', '_')[:50]
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="gradebook_{safe_name}.csv"'
            }
        )
    
    else:  # json
        import json
        
        data = {
            "classroom_id": str(classroom_id),
            "classroom_name": classroom.name,
            "generated_at": datetime.utcnow().isoformat(),
            "grades": [
                {
                    "student": user.full_name or user.email.split('@')[0],
                    "email": user.email,
                    "assignment": assignment.title,
                    "points_earned": grade.points_earned,
                    "points_possible": grade.points_possible,
                    "percentage": grade.percentage,
                    "letter_grade": grade.letter_grade
                }
                for grade, user, assignment in grades
            ]
        }
        
        json_content = json.dumps(data, indent=2)
        
        import re as _re
        safe_name = _re.sub(r'[^\w\s-]', '', classroom.name).strip().replace(' ', '_')[:50]
        
        return Response(
            content=json_content,
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="gradebook_{safe_name}.json"'
            }
        )
