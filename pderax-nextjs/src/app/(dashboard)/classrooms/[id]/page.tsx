/**
 * Classroom Details Page
 * Full collaboration: Announcements, Attendance, Documents, Group Chat
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Copy, UserPlus, Users, Trash2, ArrowLeft, Loader2,
  Settings, BookOpen, ChevronLeft, ChevronRight,
  Eye, EyeOff, Upload, Send, MessageSquare,
  CheckCircle, XCircle, Clock, AlertCircle,
} from 'lucide-react';
import classroomService, {
  Classroom, StudentInClassroom, ClassroomSettings, ClassroomDocument,
} from '@/services/classroom_service';
import announcementService, { Announcement, Comment } from '@/services/announcement_service';
import attendanceService, { ClassSession, AttendanceRecord, AttendanceUpdate } from '@/services/attendance_service';
import aiService, { ChatMessage } from '@/services/ai_service';
import styles from './page.module.css';

type Tab = 'overview' | 'students' | 'announcements' | 'attendance' | 'documents' | 'chat' | 'settings';

const STATUS_COLORS: Record<string, string> = {
  present: '#16a34a',
  absent: '#dc2626',
  late: '#d97706',
  excused: '#6366f1',
};

function statusIcon(s: string) {
  if (s === 'present') return <CheckCircle size={14} color={STATUS_COLORS.present} />;
  if (s === 'late') return <Clock size={14} color={STATUS_COLORS.late} />;
  if (s === 'excused') return <AlertCircle size={14} color={STATUS_COLORS.excused} />;
  return <XCircle size={14} color={STATUS_COLORS.absent} />;
}

export default function ClassroomDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;
  const { user, isLoading: authLoading } = useAuth();

  // Core state
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<StudentInClassroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [settings, setSettings] = useState<ClassroomSettings | null>(null);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [copied, setCopied] = useState(false);

  const isTeacher = !!(classroom && user && classroom.teacher_id === user.id);
  const allowUploads = (classroom?.settings as any)?.allow_student_uploads !== false;

  // ── Announcements state ────────────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annLoading, setAnnLoading] = useState(false);
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [postingAnn, setPostingAnn] = useState(false);
  const [expandedAnn, setExpandedAnn] = useState<string | null>(null);
  const [annComments, setAnnComments] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [postingComment, setPostingComment] = useState<string | null>(null);

  // ── Attendance state ───────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionAttendance, setSessionAttendance] = useState<Record<string, AttendanceRecord[]>>({});
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, Record<string, AttendanceUpdate['status']>>>({});
  const [savingAttendance, setSavingAttendance] = useState<string | null>(null);
  const [closingSession, setClosingSession] = useState<string | null>(null);

  // ── Documents state ────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState<ClassroomDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Chat state ─────────────────────────────────────────────────────────────
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Core load ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading) loadClassroom();
  }, [authLoading]);

  useEffect(() => {
    if (classroom) loadStudents();
  }, [classroom, currentPage]);

  useEffect(() => {
    if (activeTab === 'announcements') loadAnnouncements();
    if (activeTab === 'attendance') loadSessions();
    if (activeTab === 'documents') loadDocuments();
    if (activeTab === 'chat') initChatSession();
    return () => {
      if (activeTab !== 'chat' && chatPollRef.current) {
        clearInterval(chatPollRef.current);
        chatPollRef.current = null;
      }
    };
  }, [activeTab]);

  useEffect(() => {
    if (expandedAnn && !annComments[expandedAnn]) {
      announcementService.getComments(classroomId, expandedAnn).then((data) => {
        setAnnComments((prev) => ({ ...prev, [expandedAnn]: data }));
      });
    }
  }, [expandedAnn]);

  useEffect(() => {
    if (expandedSession && !sessionAttendance[expandedSession]) {
      attendanceService.getAttendance(classroomId, expandedSession).then((data) => {
        setSessionAttendance((prev) => ({ ...prev, [expandedSession]: data }));
      });
    }
  }, [expandedSession]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── Data loaders ───────────────────────────────────────────────────────────

  const loadClassroom = async () => {
    try {
      setIsLoading(true);
      const data = await classroomService.getClassroom(classroomId);
      setClassroom(data);
      setSettings(data.settings ?? null);
      const codes = await classroomService.getInviteCodes(classroomId);
      if (codes.length > 0) setInviteCode(codes[0].invite_code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load classroom');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudents = async () => {
    if (!classroom) return;
    try {
      const data = await classroomService.getClassroomStudents(classroomId, currentPage, 15);
      setStudents(data.items);
      setTotalPages(Math.ceil(data.total / data.per_page));
    } catch { /* silent */ }
  };

  const loadAnnouncements = async () => {
    setAnnLoading(true);
    try {
      const data = await announcementService.getAnnouncements(classroomId);
      setAnnouncements(data);
    } catch { /* silent */ } finally {
      setAnnLoading(false);
    }
  };

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const data = await attendanceService.getSessions(classroomId);
      setSessions(data);
    } catch { /* silent */ } finally {
      setSessionsLoading(false);
    }
  };

  const loadDocuments = async () => {
    setDocsLoading(true);
    try {
      const data = await classroomService.getDocuments(classroomId);
      setDocuments(data);
    } catch { /* silent */ } finally {
      setDocsLoading(false);
    }
  };

  const initChatSession = async () => {
    setChatLoading(true);
    try {
      const { session_id } = await classroomService.getClassroomChatSession(classroomId);
      setChatSessionId(session_id);
      const detail = await aiService.getSession(session_id);
      setChatMessages(detail.messages);
      // Poll for new messages every 10s
      if (chatPollRef.current) clearInterval(chatPollRef.current);
      chatPollRef.current = setInterval(async () => {
        try {
          const updated = await aiService.getSession(session_id);
          setChatMessages(updated.messages);
        } catch { /* ignore */ }
      }, 10000);
    } catch { /* silent */ } finally {
      setChatLoading(false);
    }
  };

  // Cleanup poll on unmount
  useEffect(() => {
    return () => { if (chatPollRef.current) clearInterval(chatPollRef.current); };
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleUpdateSettings = async () => {
    if (!settings) return;
    try {
      setIsSavingSettings(true);
      await classroomService.updateClassroomSettings(classroomId, settings);
      setIsEditingSettings(false);
      loadClassroom();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleInviteStudent = async () => {
    if (!inviteEmail.trim()) { setError('Email is required'); return; }
    try {
      setIsInviting(true);
      await classroomService.inviteStudent(classroomId, inviteEmail);
      setInviteEmail('');
      setShowInviteModal(false);
      loadStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite student');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Remove this student?')) return;
    try {
      await classroomService.removeStudent(classroomId, studentId);
      loadStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove student');
    }
  };

  const handleCopyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Announcements
  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;
    setPostingAnn(true);
    try {
      const ann = await announcementService.createAnnouncement(classroomId, newAnnTitle, newAnnContent);
      setAnnouncements((prev) => [ann, ...prev]);
      setNewAnnTitle('');
      setNewAnnContent('');
      setShowAnnForm(false);
    } catch { /* silent */ } finally {
      setPostingAnn(false);
    }
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await announcementService.deleteAnnouncement(classroomId, annId);
      setAnnouncements((prev) => prev.filter((a) => a.id !== annId));
    } catch { /* silent */ }
  };

  const handlePostComment = async (annId: string) => {
    const text = commentInputs[annId]?.trim();
    if (!text) return;
    setPostingComment(annId);
    try {
      const comment = await announcementService.addComment(classroomId, annId, text);
      setAnnComments((prev) => ({ ...prev, [annId]: [...(prev[annId] || []), comment] }));
      setCommentInputs((prev) => ({ ...prev, [annId]: '' }));
      setAnnouncements((prev) =>
        prev.map((a) => a.id === annId ? { ...a, comment_count: a.comment_count + 1 } : a)
      );
    } catch { /* silent */ } finally {
      setPostingComment(null);
    }
  };

  const handleDeleteComment = async (annId: string, commentId: string) => {
    try {
      await announcementService.deleteComment(classroomId, annId, commentId);
      setAnnComments((prev) => ({ ...prev, [annId]: prev[annId].filter((c) => c.id !== commentId) }));
    } catch { /* silent */ }
  };

  // Attendance
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTitle.trim()) return;
    setCreatingSession(true);
    try {
      const session = await attendanceService.createSession(classroomId, sessionTitle);
      setSessions((prev) => [session, ...prev]);
      setSessionTitle('');
      setShowSessionForm(false);
    } catch { /* silent */ } finally {
      setCreatingSession(false);
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    setClosingSession(sessionId);
    try {
      const updated = await attendanceService.closeSession(classroomId, sessionId);
      setSessions((prev) => prev.map((s) => s.id === sessionId ? updated : s));
    } catch { /* silent */ } finally {
      setClosingSession(null);
    }
  };

  const handleToggleAttendance = (sessionId: string, studentId: string, status: AttendanceUpdate['status']) => {
    setPendingUpdates((prev) => ({
      ...prev,
      [sessionId]: { ...(prev[sessionId] || {}), [studentId]: status },
    }));
  };

  const handleSaveAttendance = async (sessionId: string) => {
    const updates = pendingUpdates[sessionId];
    if (!updates || Object.keys(updates).length === 0) return;
    setSavingAttendance(sessionId);
    try {
      const records: AttendanceUpdate[] = Object.entries(updates).map(([student_id, status]) => ({
        student_id,
        status,
      }));
      const saved = await attendanceService.updateAttendance(classroomId, sessionId, records);
      setSessionAttendance((prev) => ({ ...prev, [sessionId]: saved }));
      setPendingUpdates((prev) => { const n = { ...prev }; delete n[sessionId]; return n; });
    } catch { /* silent */ } finally {
      setSavingAttendance(null);
    }
  };

  // Documents
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploadingDoc(true);
    try {
      const doc = await classroomService.uploadDocument(classroomId, file);
      setDocuments((prev) => [doc, ...prev]);
    } catch { /* silent */ } finally {
      setUploadingDoc(false);
    }
  };

  const handleToggleDocVisibility = async (docId: string, current: boolean) => {
    try {
      const updated = await classroomService.toggleDocumentVisibility(classroomId, docId, !current);
      setDocuments((prev) => prev.map((d) => d.id === docId ? updated : d));
    } catch { /* silent */ }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await classroomService.deleteDocument(classroomId, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch { /* silent */ }
  };

  // Chat
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatSessionId || !chatInput.trim() || isSendingChat) return;
    const text = chatInput.trim();
    setChatInput('');
    setIsSendingChat(true);
    // Optimistically add user message
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      sender_name: user?.full_name || user?.email?.split('@')[0] || 'You',
      created_at: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, tempMsg]);
    try {
      const reply = await aiService.sendMessage(chatSessionId, text);
      // Reload full session to get proper messages with sender names
      const updated = await aiService.getSession(chatSessionId);
      setChatMessages(updated.messages);
    } catch { /* silent */ } finally {
      setIsSendingChat(false);
    }
  };

  // ── Render guards ──────────────────────────────────────────────────────────

  if (authLoading || isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Loader2 size={36} className={styles.spinner} />
          <p>Loading classroom...</p>
        </div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Classroom not found</div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <button className={styles.backLink} onClick={() => router.push('/classrooms')}>
            <ArrowLeft size={14} /> Back to Classrooms
          </button>
          <h1 className={styles.title}>{classroom.name}</h1>
          <p className={styles.subtitle}>{classroom.description}</p>
        </div>
      </header>

      {error && (
        <div className={styles.errorMessage}>
          {error}
          <button className={styles.errorClose} onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Tabs */}
      <nav className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`} onClick={() => setActiveTab('overview')}>
          <BookOpen size={14} /> Overview
        </button>
        <button className={`${styles.tab} ${activeTab === 'students' ? styles.active : ''}`} onClick={() => setActiveTab('students')}>
          <Users size={14} /> Students ({classroom.student_count})
        </button>
        <button className={`${styles.tab} ${activeTab === 'announcements' ? styles.active : ''}`} onClick={() => setActiveTab('announcements')}>
          📢 Announcements
        </button>
        <button className={`${styles.tab} ${activeTab === 'attendance' ? styles.active : ''}`} onClick={() => setActiveTab('attendance')}>
          ✅ Attendance
        </button>
        <button className={`${styles.tab} ${activeTab === 'documents' ? styles.active : ''}`} onClick={() => setActiveTab('documents')}>
          📄 Documents
        </button>
        <button className={`${styles.tab} ${activeTab === 'chat' ? styles.active : ''}`} onClick={() => setActiveTab('chat')}>
          <MessageSquare size={14} /> Group Chat
        </button>
        {isTeacher && (
          <button className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings size={14} /> Settings
          </button>
        )}
      </nav>

      {/* ── Overview Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className={styles.tabContent}>
          <div className={styles.grid}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Classroom Information</h2>
              <div className={styles.infoGrid}>
                {[
                  ['Subject', classroom.subject],
                  ['Grade Level', classroom.grade_level],
                  ['Total Students', String(classroom.student_count)],
                  ['Created', new Date(classroom.created_at).toLocaleDateString()],
                ].map(([label, value]) => (
                  <div key={label} className={styles.infoItem}>
                    <span className={styles.label}>{label}</span>
                    <span className={styles.value}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Invite Code</h2>
              <div className={styles.inviteCodeContainer}>
                <div className={styles.inviteCodeDisplay}>
                  <code>{inviteCode || 'No invite code'}</code>
                  {inviteCode && (
                    <button className={styles.copyBtn} onClick={handleCopyInviteCode}>
                      <Copy size={14} /> {copied ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>
                <p className={styles.helperText}>Share this code with students to join</p>
              </div>
            </div>

            {isTeacher && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Quick Actions</h2>
                <div className={styles.actionButtons}>
                  <button className={styles.actionBtn} onClick={() => setShowInviteModal(true)}>
                    <UserPlus size={16} /> Invite Student
                  </button>
                  <button className={`${styles.actionBtn} ${styles.actionBtnSecondary}`} onClick={() => setActiveTab('students')}>
                    <Users size={16} /> Manage Students
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Students Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'students' && (
        <div className={styles.tabContent}>
          <div className={styles.studentsHeader}>
            <h2>Students ({classroom.student_count})</h2>
            {isTeacher && (
              <button className={styles.actionBtn} onClick={() => setShowInviteModal(true)}>
                <UserPlus size={15} /> Invite Student
              </button>
            )}
          </div>

          {students.length === 0 ? (
            <div className={styles.emptyState}><p>No students yet</p></div>
          ) : (
            <div className={styles.studentsList}>
              {students.map((student) => (
                <div key={student.id} className={styles.studentItem}>
                  <div className={styles.studentInfo}>
                    <div className={styles.studentAvatar}>{student.name.charAt(0).toUpperCase()}</div>
                    <div className={styles.studentDetails}>
                      <div className={styles.studentName}>{student.name}</div>
                      <div className={styles.studentEmail}>{student.email}</div>
                    </div>
                  </div>
                  <span className={`${styles.badge} ${styles[`badge-${student.status}`]}`}>{student.status}</span>
                  {isTeacher && (
                    <button className={styles.removeButton} onClick={() => handleRemoveStudent(student.id)} title="Remove">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button className={styles.pageBtn} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft size={16} /> Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button className={styles.pageBtn} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Announcements Tab ─────────────────────────────────────────────── */}
      {activeTab === 'announcements' && (
        <div className={styles.tabContent}>
          <div className={styles.annHeader}>
            <h2 className={styles.sectionTitle}>Announcements</h2>
            {isTeacher && (
              <button className={styles.actionBtn} onClick={() => setShowAnnForm((v) => !v)}>
                {showAnnForm ? 'Cancel' : '+ Post Announcement'}
              </button>
            )}
          </div>

          {showAnnForm && (
            <form className={styles.annForm} onSubmit={handlePostAnnouncement}>
              <input
                className={styles.annInput}
                placeholder="Title"
                value={newAnnTitle}
                onChange={(e) => setNewAnnTitle(e.target.value)}
                required
              />
              <textarea
                className={styles.annTextarea}
                placeholder="Write your announcement..."
                value={newAnnContent}
                onChange={(e) => setNewAnnContent(e.target.value)}
                rows={4}
                required
              />
              <button type="submit" className={styles.actionBtn} disabled={postingAnn}>
                {postingAnn ? <Loader2 size={14} className={styles.spinIcon} /> : null} Post
              </button>
            </form>
          )}

          {annLoading ? (
            <div className={styles.loadingInline}><Loader2 size={20} className={styles.spinIcon} /></div>
          ) : announcements.length === 0 ? (
            <div className={styles.emptyState}><p>No announcements yet.</p></div>
          ) : (
            <div className={styles.annList}>
              {announcements.map((ann) => (
                <div key={ann.id} className={styles.annCard}>
                  <div className={styles.annCardHeader}>
                    <div className={styles.annMeta}>
                      <div className={styles.annAvatar}>{ann.author_name.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className={styles.annAuthor}>{ann.author_name}</div>
                        <div className={styles.annDate}>{new Date(ann.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className={styles.annActions}>
                      <button className={styles.annCommentBadge} onClick={() => setExpandedAnn(expandedAnn === ann.id ? null : ann.id)}>
                        💬 {ann.comment_count}
                      </button>
                      {isTeacher && (
                        <button className={styles.deleteIconBtn} onClick={() => handleDeleteAnnouncement(ann.id)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 className={styles.annTitle}>{ann.title}</h3>
                  <p className={styles.annContent}>{ann.content}</p>

                  {expandedAnn === ann.id && (
                    <div className={styles.annComments}>
                      <div className={styles.commentList}>
                        {(annComments[ann.id] || []).map((c) => (
                          <div key={c.id} className={styles.commentItem}>
                            <div className={styles.commentMeta}>
                              <strong>{c.author_name}</strong>
                              <span>{new Date(c.created_at).toLocaleString()}</span>
                            </div>
                            <p className={styles.commentText}>{c.content}</p>
                            {(isTeacher || c.author_id === user?.id) && (
                              <button className={styles.deleteIconBtn} onClick={() => handleDeleteComment(ann.id, c.id)}>
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className={styles.commentInputRow}>
                        <input
                          className={styles.commentInput}
                          placeholder="Add a comment..."
                          value={commentInputs[ann.id] || ''}
                          onChange={(e) => setCommentInputs((prev) => ({ ...prev, [ann.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment(ann.id); }}
                        />
                        <button
                          className={styles.sendBtn}
                          onClick={() => handlePostComment(ann.id)}
                          disabled={postingComment === ann.id}
                        >
                          {postingComment === ann.id ? <Loader2 size={14} className={styles.spinIcon} /> : <Send size={14} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Attendance Tab ────────────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className={styles.tabContent}>
          {isTeacher ? (
            <>
              <div className={styles.annHeader}>
                <h2 className={styles.sectionTitle}>Sessions</h2>
                <button className={styles.actionBtn} onClick={() => setShowSessionForm((v) => !v)}>
                  {showSessionForm ? 'Cancel' : '+ Open Session'}
                </button>
              </div>
              {showSessionForm && (
                <form className={styles.sessionForm} onSubmit={handleCreateSession}>
                  <input
                    className={styles.annInput}
                    placeholder="Session title (e.g. Week 3 Lecture)"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    required
                  />
                  <button type="submit" className={styles.actionBtn} disabled={creatingSession}>
                    {creatingSession ? <Loader2 size={14} className={styles.spinIcon} /> : null} Create
                  </button>
                </form>
              )}
            </>
          ) : (
            <h2 className={styles.sectionTitle}>Your Attendance</h2>
          )}

          {sessionsLoading ? (
            <div className={styles.loadingInline}><Loader2 size={20} className={styles.spinIcon} /></div>
          ) : sessions.length === 0 ? (
            <div className={styles.emptyState}><p>No sessions yet.</p></div>
          ) : (
            <div className={styles.sessionList}>
              {sessions.map((session) => {
                const isExpanded = expandedSession === session.id;
                const attendance = sessionAttendance[session.id] || [];
                const pending = pendingUpdates[session.id] || {};

                return (
                  <div key={session.id} className={styles.sessionCard}>
                    <div className={styles.sessionHeader} onClick={() => setExpandedSession(isExpanded ? null : session.id)}>
                      <div>
                        <div className={styles.sessionTitle}>{session.title}</div>
                        <div className={styles.sessionDate}>{new Date(session.session_date).toLocaleString()}</div>
                      </div>
                      <div className={styles.sessionRight}>
                        <span className={`${styles.sessionBadge} ${session.status === 'open' ? styles.sessionBadgeOpen : styles.sessionBadgeClosed}`}>
                          {session.status}
                        </span>
                        {isTeacher && session.status === 'open' && (
                          <button
                            className={`${styles.actionBtn} ${styles.actionBtnSm} ${styles.actionBtnSecondary}`}
                            onClick={(e) => { e.stopPropagation(); handleCloseSession(session.id); }}
                            disabled={closingSession === session.id}
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className={styles.attendanceTable}>
                        {attendance.length === 0 ? (
                          <p className={styles.emptyInline}>No attendance records.</p>
                        ) : (
                          <>
                            <table className={styles.attTable}>
                              <thead>
                                <tr>
                                  <th>Student</th>
                                  {isTeacher ? (
                                    <>
                                      <th>Present</th><th>Late</th><th>Absent</th><th>Excused</th>
                                    </>
                                  ) : <th>Status</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {attendance.map((rec) => {
                                  const curStatus = pending[rec.student_id] ?? rec.status;
                                  return (
                                    <tr key={rec.student_id}>
                                      <td className={styles.attStudentName}>{rec.student_name}</td>
                                      {isTeacher ? (
                                        (['present', 'late', 'absent', 'excused'] as const).map((s) => (
                                          <td key={s}>
                                            <input
                                              type="radio"
                                              name={`att-${session.id}-${rec.student_id}`}
                                              checked={curStatus === s}
                                              onChange={() => handleToggleAttendance(session.id, rec.student_id, s)}
                                            />
                                          </td>
                                        ))
                                      ) : (
                                        <td>
                                          <span className={styles.statusPill} style={{ background: STATUS_COLORS[rec.status] + '22', color: STATUS_COLORS[rec.status] }}>
                                            {statusIcon(rec.status)} {rec.status}
                                          </span>
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            {isTeacher && Object.keys(pending).length > 0 && (
                              <button
                                className={styles.actionBtn}
                                onClick={() => handleSaveAttendance(session.id)}
                                disabled={savingAttendance === session.id}
                              >
                                {savingAttendance === session.id ? <Loader2 size={14} className={styles.spinIcon} /> : null}
                                Save Attendance
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Documents Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'documents' && (
        <div className={styles.tabContent}>
          <div className={styles.annHeader}>
            <h2 className={styles.sectionTitle}>Class Documents</h2>
            {(isTeacher || allowUploads) && (
              <>
                <button className={styles.actionBtn} onClick={() => fileInputRef.current?.click()} disabled={uploadingDoc}>
                  {uploadingDoc ? <Loader2 size={14} className={styles.spinIcon} /> : <Upload size={14} />}
                  {uploadingDoc ? 'Uploading...' : 'Upload Document'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.txt"
                  style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }}
                />
              </>
            )}
          </div>

          {docsLoading ? (
            <div className={styles.loadingInline}><Loader2 size={20} className={styles.spinIcon} /></div>
          ) : documents.length === 0 ? (
            <div className={styles.emptyState}><p>No documents uploaded yet.</p></div>
          ) : (
            <div className={styles.docList}>
              {documents.map((doc) => (
                <div key={doc.id} className={styles.docCard}>
                  <div className={styles.docInfo}>
                    <span className={styles.docIcon}>📄</span>
                    <div>
                      <div className={styles.docName}>{doc.filename}</div>
                      <div className={styles.docMeta}>
                        Uploaded by {doc.uploader_name} · {new Date(doc.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className={styles.docActions}>
                    {doc.analysis_id && (
                      <a
                        className={`${styles.actionBtn} ${styles.actionBtnSm} ${styles.actionBtnSecondary}`}
                        href={`/history?analysis_id=${doc.analysis_id}`}
                      >
                        View Analysis
                      </a>
                    )}
                    {isTeacher && (
                      <button
                        className={`${styles.iconBtn} ${doc.is_visible_to_students ? styles.iconBtnActive : ''}`}
                        onClick={() => handleToggleDocVisibility(doc.id, doc.is_visible_to_students)}
                        title={doc.is_visible_to_students ? 'Hide from students' : 'Show to students'}
                      >
                        {doc.is_visible_to_students ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    )}
                    {(isTeacher || doc.uploader_id === user?.id) && (
                      <button className={styles.deleteIconBtn} onClick={() => handleDeleteDoc(doc.id)} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Group Chat Tab ────────────────────────────────────────────────── */}
      {activeTab === 'chat' && (
        <div className={styles.chatTabContent}>
          {chatLoading ? (
            <div className={styles.loadingInline}><Loader2 size={24} className={styles.spinIcon} /></div>
          ) : (
            <>
              <div className={styles.chatMessages}>
                {chatMessages.length === 0 && (
                  <div className={styles.chatEmpty}>
                    <MessageSquare size={40} strokeWidth={1.2} />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                )}
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`${styles.chatMsg} ${msg.role === 'user' ? styles.chatMsgUser : styles.chatMsgAI}`}>
                    {msg.role === 'user' && (
                      <div className={styles.chatSender}>{msg.sender_name || 'Student'}</div>
                    )}
                    {msg.role === 'assistant' && (
                      <div className={styles.chatSender}>🤖 AI Study Assistant</div>
                    )}
                    <div className={styles.chatBubble}>{msg.content}</div>
                    <div className={styles.chatTime}>{new Date(msg.created_at).toLocaleTimeString()}</div>
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>
              <form className={styles.chatInputRow} onSubmit={handleSendChatMessage}>
                <input
                  className={styles.chatInput}
                  placeholder="Ask the AI assistant anything..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isSendingChat}
                />
                <button type="submit" className={styles.sendBtn} disabled={isSendingChat || !chatInput.trim()}>
                  {isSendingChat ? <Loader2 size={16} className={styles.spinIcon} /> : <Send size={16} />}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* ── Settings Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'settings' && isTeacher && settings && (
        <div className={styles.tabContent}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Classroom Settings</h2>
              {!isEditingSettings && (
                <button className={`${styles.actionBtn} ${styles.actionBtnSecondary} ${styles.actionBtnSm}`} onClick={() => setIsEditingSettings(true)}>
                  Edit
                </button>
              )}
            </div>

            {isEditingSettings ? (
              <form className={styles.settingsForm} onSubmit={(e) => { e.preventDefault(); handleUpdateSettings(); }}>
                {[
                  { key: 'allow_student_uploads', label: 'Allow students to upload documents' },
                  { key: 'allow_peer_review', label: 'Enable peer review' },
                  { key: 'anonymous_feedback', label: 'Allow anonymous feedback' },
                  { key: 'email_notifications', label: 'Send email notifications' },
                  { key: 'auto_grading_enabled', label: 'Enable automatic grading' },
                ].map(({ key, label }) => (
                  <div key={key} className={styles.settingItem}>
                    <label className={styles.settingLabel}>
                      <input
                        type="checkbox"
                        checked={(settings as any)[key]}
                        onChange={(e) => setSettings((prev) => prev ? { ...prev, [key]: e.target.checked } : null)}
                      />
                      <span>{label}</span>
                    </label>
                  </div>
                ))}
                <div className={styles.formActions}>
                  <button type="button" className={`${styles.actionBtn} ${styles.actionBtnSecondary}`} onClick={() => { setIsEditingSettings(false); loadClassroom(); }}>Cancel</button>
                  <button type="submit" className={styles.actionBtn} disabled={isSavingSettings}>
                    {isSavingSettings ? <Loader2 size={14} className={styles.spinIcon} /> : null} Save Settings
                  </button>
                </div>
              </form>
            ) : (
              <div className={styles.settingsList}>
                {[
                  { key: 'allow_student_uploads', label: 'Allow students to upload documents' },
                  { key: 'allow_peer_review', label: 'Enable peer review' },
                  { key: 'anonymous_feedback', label: 'Allow anonymous feedback' },
                  { key: 'email_notifications', label: 'Send email notifications' },
                  { key: 'auto_grading_enabled', label: 'Enable automatic grading' },
                ].map(({ key, label }) => (
                  <div key={key} className={styles.settingItem}>
                    <span>{label}</span>
                    <input type="checkbox" checked={(settings as any)[key]} disabled />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Invite Modal ───────────────────────────────────────────────────── */}
      {showInviteModal && (
        <div className={styles.modal} onClick={(e) => { if (e.target === e.currentTarget) setShowInviteModal(false); }}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Invite Student</h2>
              <button className={styles.closeButton} onClick={() => setShowInviteModal(false)}>✕</button>
            </div>
            <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleInviteStudent(); }}>
              <div className={styles.formGroup}>
                <label>Student Email *</label>
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="student@example.com" />
              </div>
              <div className={styles.formActions}>
                <button type="button" className={`${styles.actionBtn} ${styles.actionBtnSecondary}`} onClick={() => setShowInviteModal(false)}>Cancel</button>
                <button type="submit" className={styles.actionBtn} disabled={isInviting}>
                  {isInviting ? <><Loader2 size={14} className={styles.spinIcon} /> Sending...</> : <><UserPlus size={14} /> Send Invite</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
