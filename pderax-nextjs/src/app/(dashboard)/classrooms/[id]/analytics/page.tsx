/**
 * Performance Analytics Page
 * View class performance, student analytics, and learning insights
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/forms/Button';
import gradeService from '@/services/grade_service';
import styles from './page.module.css';

type AnalyticsTab = 'overview' | 'students' | 'trends';

interface StudentAnalytics {
  student_id: string;
  student_name: string;
  average: number;
  trend: number;
  strengths: string[];
  improvements: string[];
  predicted_grade: number;
}

export default function PerformanceAnalyticsPage() {
  const params = useParams();
  const classroomId = params.id as string;
  const { isLoading: authLoading } = useAuth();

  const [classPerformance, setClassPerformance] = useState<any | null>(null);
  const [studentAnalytics, setStudentAnalytics] = useState<StudentAnalytics[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [sortBy, setSortBy] = useState<'average' | 'trend' | 'name'>(
    'average'
  );
  const [selectedStudent, setSelectedStudent] =
    useState<StudentAnalytics | null>(null);

  useEffect(() => {
    if (!authLoading) {
      loadAnalytics();
    }
  }, [authLoading]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const classData = await gradeService.getClassPerformance(classroomId);
      const normalizedClassData = {
        ...classData,
        average: (classData as any).average ?? classData.class_average ?? 0,
        median: (classData as any).median ?? classData.class_average ?? 0,
        highest: (classData as any).highest ?? classData.highest_score ?? 0,
        lowest: (classData as any).lowest ?? classData.lowest_score ?? 0,
        std_dev: (classData as any).std_dev ?? 0,
        grade_distribution:
          (classData as any).grade_distribution ??
          (classData as any).score_distribution ??
          { a: 0, b: 0, c: 0, d: 0, f: 0 },
        trend_data: (classData as any).trend_data ?? [],
      };
      setClassPerformance(normalizedClassData);

      // Get individual student analytics
      const studentsRaw = await gradeService.getStudentsByPerformance(
        classroomId,
        'average',
        100
      );
      const students: StudentAnalytics[] = studentsRaw.map((student) => ({
        student_id: student.student_id,
        student_name: student.student_name,
        average: student.class_average ?? 0,
        trend: student.trend ?? 0,
        strengths: [],
        improvements: [],
        predicted_grade: student.class_average ?? 0,
      }));
      setStudentAnalytics(students);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load analytics';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getSortedStudents = () => {
    return [...studentAnalytics].sort((a, b) => {
      switch (sortBy) {
        case 'average':
          return b.average - a.average;
        case 'trend':
          return b.trend - a.trend;
        case 'name':
          return a.student_name.localeCompare(b.student_name);
        default:
          return 0;
      }
    });
  };

  const getGradeDistribution = () => {
    if (!classPerformance?.grade_distribution) return [];

    const distribution = classPerformance.grade_distribution;
    return [
      { range: 'A (90-100)', count: distribution.a, color: '#10b981' },
      { range: 'B (80-89)', count: distribution.b, color: '#3b82f6' },
      { range: 'C (70-79)', count: distribution.c, color: '#f59e0b' },
      { range: 'D (60-69)', count: distribution.d, color: '#ef4444' },
      { range: 'F (0-59)', count: distribution.f, color: '#6b7280' },
    ];
  };

  const getStatusColor = (value: number) => {
    if (value >= 85) return '#10b981'; // Green
    if (value >= 75) return '#3b82f6'; // Blue
    if (value >= 65) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const getTrendIndicator = (trend: number) => {
    if (trend > 5) return '📈';
    if (trend < -5) return '📉';
    return '→';
  };

  if (authLoading || isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  const sortedStudents = getSortedStudents();
  const gradeDistribution = getGradeDistribution();
  const maxCount = Math.max(...gradeDistribution.map((d) => d.count || 0), 1);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <a href={`/classrooms/${classroomId}`} className={styles.backLink}>
            ← Back to Classroom
          </a>
          <h1 className={styles.title}>Performance Analytics</h1>
        </div>
      </header>

      {error && <div className={styles.errorMessage}>{error}</div>}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'students' ? styles.active : ''}`}
          onClick={() => setActiveTab('students')}
        >
          Student Performance
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'trends' ? styles.active : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          Trends
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {/* Overview Tab */}
        {activeTab === 'overview' && classPerformance && (
          <div className={styles.overviewTab}>
            {/* Key Metrics */}
            <div className={styles.metricsGrid}>
              <div className={styles.metric}>
                <div className={styles.metricLabel}>Class Average</div>
                <div
                  className={styles.metricValue}
                  style={{ color: getStatusColor(classPerformance.average) }}
                >
                  {classPerformance.average.toFixed(1)}%
                </div>
              </div>

              <div className={styles.metric}>
                <div className={styles.metricLabel}>Median Score</div>
                <div
                  className={styles.metricValue}
                  style={{ color: getStatusColor(classPerformance.median) }}
                >
                  {classPerformance.median.toFixed(1)}%
                </div>
              </div>

              <div className={styles.metric}>
                <div className={styles.metricLabel}>Highest Score</div>
                <div className={styles.metricValue}>
                  {classPerformance.highest.toFixed(1)}%
                </div>
              </div>

              <div className={styles.metric}>
                <div className={styles.metricLabel}>Lowest Score</div>
                <div className={styles.metricValue}>
                  {classPerformance.lowest.toFixed(1)}%
                </div>
              </div>

              <div className={styles.metric}>
                <div className={styles.metricLabel}>Standard Deviation</div>
                <div className={styles.metricValue}>
                  {classPerformance.std_dev.toFixed(1)}
                </div>
              </div>

              <div className={styles.metric}>
                <div className={styles.metricLabel}>Students</div>
                <div className={styles.metricValue}>
                  {classPerformance.total_students}
                </div>
              </div>
            </div>

            {/* Grade Distribution */}
            <div className={styles.card}>
              <h2>Grade Distribution</h2>
              <div className={styles.distributionGrid}>
                {gradeDistribution.map((item, idx) => (
                  <div key={idx} className={styles.distributionItem}>
                    <div className={styles.distributionLabel}>{item.range}</div>
                    <div className={styles.distributionBar}>
                      <div
                        className={styles.distributionFill}
                        style={{
                          width: `${(item.count / maxCount) * 100}%`,
                          backgroundColor: item.color,
                        }}
                      ></div>
                    </div>
                    <div className={styles.distributionCount}>{item.count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights */}
            <div className={styles.card}>
              <h2>Class Insights</h2>
              <div className={styles.insightsList}>
                {classPerformance.average >= 80 ? (
                  <div className={styles.insight}>
                    <span className={styles.insightIcon}>✓</span>
                    <span>
                      Class average is {classPerformance.average.toFixed(1)}%,
                      indicating strong overall performance
                    </span>
                  </div>
                ) : (
                  <div className={styles.insight}>
                    <span className={styles.insightIcon}>!</span>
                    <span>
                      Class average is{' '}
                      {classPerformance.average.toFixed(1)}%, consider additional
                      review sessions
                    </span>
                  </div>
                )}

                {classPerformance.std_dev < 15 ? (
                  <div className={styles.insight}>
                    <span className={styles.insightIcon}>✓</span>
                    <span>
                      Low standard deviation suggests consistent student
                      performance
                    </span>
                  </div>
                ) : (
                  <div className={styles.insight}>
                    <span className={styles.insightIcon}>!</span>
                    <span>
                      High variation in performance may require differentiated
                      instruction
                    </span>
                  </div>
                )}

                {gradeDistribution[3].count + gradeDistribution[4].count > 0 && (
                  <div className={styles.insight}>
                    <span className={styles.insightIcon}>⚠</span>
                    <span>
                      {gradeDistribution[3].count + gradeDistribution[4].count}{' '}
                      students scoring below 70% - consider intervention
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Student Performance Tab */}
        {activeTab === 'students' && (
          <div className={styles.studentsTab}>
            <div className={styles.sortControls}>
              <label>Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as 'average' | 'trend' | 'name')
                }
                className={styles.sortSelect}
              >
                <option value="average">Average Score</option>
                <option value="trend">Performance Trend</option>
                <option value="name">Name</option>
              </select>
            </div>

            <div className={styles.studentsList}>
              {sortedStudents.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No student data available</p>
                </div>
              ) : (
                sortedStudents.map((student) => (
                  <div
                    key={student.student_id}
                    className={styles.studentCard}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div className={styles.cardTop}>
                      <div className={styles.studentBasic}>
                        <h3>{student.student_name}</h3>
                        <div className={styles.avgGrade}>
                          Average:{' '}
                          <span
                            style={{
                              color: getStatusColor(student.average),
                              fontWeight: 600,
                            }}
                          >
                            {student.average.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className={styles.trendBadge}>
                        <span className={styles.trendIcon}>
                          {getTrendIndicator(student.trend)}
                        </span>
                        <span>{Math.abs(student.trend).toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{
                          width: `${Math.min(student.average, 100)}%`,
                          backgroundColor: getStatusColor(student.average),
                        }}
                      ></div>
                    </div>

                    <div className={styles.predicted}>
                      <span className={styles.predictedLabel}>
                        Predicted Final Grade:
                      </span>
                      <span
                        className={styles.predictedValue}
                        style={{
                          color: getStatusColor(student.predicted_grade),
                        }}
                      >
                        {student.predicted_grade.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Student Detail Panel */}
            {selectedStudent && (
              <div className={styles.detailPanel}>
                <button
                  className={styles.closeButton}
                  onClick={() => setSelectedStudent(null)}
                >
                  ✕
                </button>

                <h3>{selectedStudent.student_name}</h3>

                <div className={styles.detailMetrics}>
                  <div className={styles.detailMetric}>
                    <span>Current Average</span>
                    <span
                      style={{
                        color: getStatusColor(selectedStudent.average),
                        fontWeight: 600,
                      }}
                    >
                      {selectedStudent.average.toFixed(1)}%
                    </span>
                  </div>
                  <div className={styles.detailMetric}>
                    <span>Trend</span>
                    <span>
                      {getTrendIndicator(selectedStudent.trend)}{' '}
                      {selectedStudent.trend > 0 ? '+' : ''}
                      {selectedStudent.trend.toFixed(1)}%
                    </span>
                  </div>
                  <div className={styles.detailMetric}>
                    <span>Predicted Grade</span>
                    <span
                      style={{
                        color: getStatusColor(selectedStudent.predicted_grade),
                        fontWeight: 600,
                      }}
                    >
                      {selectedStudent.predicted_grade.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {selectedStudent.strengths.length > 0 && (
                  <div className={styles.detailSection}>
                    <h4>Strengths</h4>
                    <ul className={styles.skillList}>
                      {selectedStudent.strengths.map((skill, idx) => (
                        <li key={idx}>
                          <span className={styles.skillIcon}>✓</span>
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedStudent.improvements.length > 0 && (
                  <div className={styles.detailSection}>
                    <h4>Areas for Improvement</h4>
                    <ul className={styles.skillList}>
                      {selectedStudent.improvements.map((skill, idx) => (
                        <li key={idx}>
                          <span className={styles.skillIcon}>!</span>
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && classPerformance?.trend_data && (
          <div className={styles.trendsTab}>
            <div className={styles.card}>
              <h2>Performance Trends</h2>
              <div className={styles.trendsList}>
                {classPerformance.trend_data.map((trend: any, idx: number) => (
                  <div key={idx} className={styles.trendItem}>
                    <div className={styles.trendLabel}>{trend.period}</div>
                    <div className={styles.trendBar}>
                      <div
                        className={styles.trendFill}
                        style={{ width: `${trend.average}%` }}
                      ></div>
                    </div>
                    <div className={styles.trendValue}>
                      {trend.average.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.card}>
              <h2>Trend Summary</h2>
              <p className={styles.trendSummary}>
                {classPerformance.trend_data[
                  classPerformance.trend_data.length - 1
                ]?.average >
                classPerformance.trend_data[0]?.average
                  ? 'Class performance is improving'
                  : 'Class performance has declined'}
                . Track these metrics to identify areas needing intervention.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
