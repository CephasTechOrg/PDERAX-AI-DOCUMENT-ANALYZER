/**
 * Gradebook Page
 * View grades for a classroom with filtering and bulk operations
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Download, ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import gradeService from '@/services/grade_service';
import styles from './page.module.css';

type SortField = 'name' | 'grade' | 'average';
type SortOrder = 'asc' | 'desc';

interface StudentGradeRow {
  student_id: string;
  student_name: string;
  student_email: string;
  grades: Record<string, number | null>;
  average: number;
}

export default function GradesPage() {
  const params = useParams();
  const classroomId = params.id as string;
  const { isLoading: authLoading } = useAuth();

  const [gradebook, setGradebook] = useState<StudentGradeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterAssignment, setFilterAssignment] = useState<string>('all');
  const [assignments, setAssignments] = useState<Array<{ id: string; title: string }>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkGrade, setBulkGrade] = useState('');
  const [bulkFeedback, setBulkFeedback] = useState('');
  const [exportFormat] = useState<'csv' | 'json'>('csv');

  useEffect(() => {
    if (!authLoading) loadGradebook();
  }, [authLoading, sortField, sortOrder]);

  const loadGradebook = async () => {
    try {
      setIsLoading(true);
      const data = await gradeService.getGradebook(classroomId);
      const rows: StudentGradeRow[] = data.students.map((student) => {
        const gradeMap: Record<string, number | null> = {};
        student.grades.forEach((grade) => {
          gradeMap[grade.assignment_id] = grade.percentage ?? null;
        });
        return {
          student_id: student.student_id,
          student_name: student.student_name,
          student_email: student.student_email,
          grades: gradeMap,
          average: student.class_average ?? 0,
        };
      });
      setGradebook(rows);
      const uniqueAssignments = data.assignments.map((a) => ({
        id: a.assignment_id,
        title: a.assignment_title,
      }));
      setAssignments(uniqueAssignments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gradebook');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filterAndSortGradebook = () => {
    let filtered = [...gradebook];
    if (filterAssignment !== 'all') {
      filtered = filtered.filter((entry) => filterAssignment in (entry.grades || {}));
    }
    filtered.sort((a, b) => {
      let compareValue = 0;
      if (sortField === 'name') {
        compareValue = a.student_name.localeCompare(b.student_name);
      } else if (sortField === 'grade') {
        const aGrade = filterAssignment !== 'all' ? (a.grades?.[filterAssignment] ?? 0) : (a.average ?? 0);
        const bGrade = filterAssignment !== 'all' ? (b.grades?.[filterAssignment] ?? 0) : (b.average ?? 0);
        compareValue = aGrade - bGrade;
      } else if (sortField === 'average') {
        compareValue = (a.average ?? 0) - (b.average ?? 0);
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
    return filtered;
  };

  const handleSelectStudent = (studentId: string) => {
    const updated = new Set(selectedStudents);
    if (updated.has(studentId)) { updated.delete(studentId); } else { updated.add(studentId); }
    setSelectedStudents(updated);
  };

  const filteredGradebook = filterAndSortGradebook();

  const handleSelectAll = () => {
    if (selectedStudents.size === filteredGradebook.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredGradebook.map((e) => e.student_id)));
    }
  };

  const handleBulkExport = async () => {
    try {
      const data = await gradeService.exportGradebook(classroomId);
      const blob = new Blob([data], {
        type: exportFormat === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gradebook.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export gradebook');
    }
  };

  const paginatedGradebook = filteredGradebook.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredGradebook.length / itemsPerPage);

  if (authLoading || isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Loader2 size={36} className={styles.spinner} />
          <p>Loading gradebook...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <a href={`/classrooms/${classroomId}`} className={styles.backLink}>
            <ArrowLeft size={14} /> Back to Classroom
          </a>
          <h1 className={styles.title}>Gradebook</h1>
        </div>
        <button className={styles.exportBtn} onClick={handleBulkExport}>
          <Download size={15} /> Export
        </button>
      </header>

      {error && <div className={styles.errorMessage}>{error}</div>}

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.controlsLeft}>
          <select
            value={filterAssignment}
            onChange={(e) => { setFilterAssignment(e.target.value); setCurrentPage(1); }}
            className={styles.filterSelect}
          >
            <option value="all">All Assignments</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        </div>

        {selectedStudents.size > 0 && (
          <div className={styles.bulkActions}>
            <span className={styles.selectionInfo}>{selectedStudents.size} selected</span>
            <button
              className={styles.bulkBtn}
              onClick={() => setShowBulkEdit(!showBulkEdit)}
            >
              Bulk Edit
            </button>
          </div>
        )}
      </div>

      {/* Bulk Edit Panel */}
      {showBulkEdit && selectedStudents.size > 0 && (
        <div className={styles.bulkEditPanel}>
          <div className={styles.bulkEditContent}>
            <h3>Bulk Update Grades</h3>
            <div className={styles.bulkForm}>
              <div className={styles.formGroup}>
                <label>Add Points</label>
                <input
                  type="number"
                  value={bulkGrade}
                  onChange={(e) => setBulkGrade(e.target.value)}
                  placeholder="Points to add"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Feedback</label>
                <textarea
                  value={bulkFeedback}
                  onChange={(e) => setBulkFeedback(e.target.value)}
                  placeholder="Message for all students..."
                  rows={2}
                />
              </div>
              <div className={styles.bulkActions}>
                <button className={styles.cancelBtn} onClick={() => setShowBulkEdit(false)}>
                  Cancel
                </button>
                <button className={styles.exportBtn}>
                  Update {selectedStudents.size} Students
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gradebook Table */}
      {gradebook.length === 0 ? (
        <div className={styles.emptyState}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2>No grades</h2>
          <p>Grades will appear here as assignments are submitted and graded</p>
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.gradebookTable}>
              <thead>
                <tr>
                  <th className={styles.checkboxColumn}>
                    <input
                      type="checkbox"
                      checked={selectedStudents.size > 0 && selectedStudents.size === paginatedGradebook.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className={styles.sortableHeader} onClick={() => handleSort('name')}>
                    <div className={styles.headerContent}>
                      Student Name
                      {sortField === 'name' && <span className={styles.sortIcon}>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                  </th>
                  {filterAssignment === 'all' && assignments.map((a) => (
                    <th key={a.id} className={styles.gradeHeader}>{a.title.slice(0, 15)}</th>
                  ))}
                  <th className={`${styles.sortableHeader} ${styles.averageHeader}`} onClick={() => handleSort('average')}>
                    <div className={styles.headerContent}>
                      Average
                      {sortField === 'average' && <span className={styles.sortIcon}>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedGradebook.map((entry) => (
                  <tr key={entry.student_id}>
                    <td className={styles.checkboxColumn}>
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(entry.student_id)}
                        onChange={() => handleSelectStudent(entry.student_id)}
                      />
                    </td>
                    <td className={styles.nameCell}>
                      <div className={styles.studentInfo}>
                        <div className={styles.studentName}>{entry.student_name}</div>
                        <div className={styles.studentEmail}>{entry.student_email}</div>
                      </div>
                    </td>
                    {filterAssignment === 'all' && assignments.map((a) => (
                      <td key={a.id} className={styles.gradeCell}>
                        <GradeDisplay grade={entry.grades?.[a.id]} />
                      </td>
                    ))}
                    <td className={styles.averageCell}>
                      <GradeDisplay grade={entry.average} isAverage />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={15} /> Previous
              </button>
              <span className={styles.pageInfo}>Page {currentPage} of {totalPages}</span>
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GradeDisplay({ grade, isAverage = false }: { grade?: number | null; isAverage?: boolean }) {
  if (grade === null || grade === undefined) {
    return <span className={styles.gradeEmpty}>—</span>;
  }
  return (
    <span
      className={`${styles.grade} ${isAverage ? styles.boldGrade : ''}`}
      style={{ color: getGradeColor(grade) }}
    >
      {grade.toFixed(1)}%
    </span>
  );
}

function getGradeColor(grade: number): string {
  if (grade >= 90) return '#10b981';
  if (grade >= 80) return '#3b82f6';
  if (grade >= 70) return '#f59e0b';
  if (grade >= 60) return '#ef4444';
  return '#6b7280';
}
