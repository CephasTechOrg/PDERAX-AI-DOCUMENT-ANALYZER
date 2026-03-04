/**
 * Core TypeScript Type Definitions
 * Used throughout the application for type safety
 */

// User and Authentication
export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
  role: UserRole;
  is_verified: boolean;
  is_active: boolean;
  created_via: string;
  university?: string | null;
  field_of_study?: string | null;
  academic_level?: string | null;
}

export interface AuthSession {
  user: User;
  access_token: string;
  refresh_token: string;
  /** Seconds until expiry (as returned by backend TokenResponse) */
  expires_in: number;
  /** Optional: computed absolute expiry timestamp (ms) stored locally */
  expires_at?: number;
}

// Documents
export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Document {
  id: string;
  user_id: string;
  filename: string;
  file_size: number;
  file_type: string;
  pages?: number;
  content_summary?: string;
  status: DocumentStatus;
  uploaded_at: string;
  processed_at?: string;
  error_message?: string;
}

// Flashcards
export type CardDifficulty = 'easy' | 'medium' | 'hard';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category?: string;
}

export interface FlashcardSet {
  id: string;
  user_id: string;
  analysis_id?: string | null;
  title?: string | null;
  difficulty: CardDifficulty;
  cards: Flashcard[];
  card_count: number;
  created_at: string;
}

export interface StudyProgress {
  flashcard_id: string;
  correct_count: number;
  incorrect_count: number;
  last_studied: string;
}

// API Response and Error Handling
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── Analysis (from POST /api/v1/upload) ─────────────────────────────────────
export interface QAPair {
  question: string;
  answer: string;
}

export interface WordCountInfo {
  original_word_count?: number;
  processed_word_count?: number;
  was_truncated?: boolean;
  word_limit?: number;
  original?: number;
  processed?: number;
  limit?: number;
}

export interface AnalysisWarning {
  type: string;
  message: string;
  original_words?: number;
  processed_words?: number;
  limit?: number;
}

export interface AnalysisData {
  summary: string;
  insights: string[];
  questions_answers: QAPair[];
  word_count_info?: WordCountInfo;
}

export interface AnalysisResponse {
  filename: string;
  extracted_text_length: number;
  analysis: AnalysisData;
  export_files: Record<string, string>;
  status: 'success' | 'error';
  word_count_info: WordCountInfo;
  analysis_id?: string;
  warnings?: AnalysisWarning[];
  error?: string;
  extracted_text?: string;
}

export interface AnalysisHistoryItem {
  id: string;
  filename: string;
  file_type: string | null;
  analysis: AnalysisData;
  word_count: number | null;
  created_at: string;
}

// ── Quiz ─────────────────────────────────────────────────────────────────────
export interface QuizOption {
  label: string;
  text: string;
}

export interface QuizQuestion {
  question: string;
  options: QuizOption[];
  correct_answer: string;
  explanation: string;
  category?: string;
}

export interface QuizGenerateResponse {
  questions: QuizQuestion[];
  source_summary: string;
  total_count: number;
  difficulty: string;
  generated_at: string;
}

export interface QuizHistoryItem {
  id: string;
  analysis_id: string | null;
  title: string | null;
  difficulty: string;
  questions: QuizQuestion[];
  question_count: number;
  created_at: string;
}

// ── Flashcard generation response ────────────────────────────────────────────
export interface FlashcardGenerateResponse {
  flashcards: Array<{ front: string; back: string; category?: string }>;
  source_summary: string;
  total_count: number;
  generated_at: string;
}

// Request/Response DTOs
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  full_name: string;
  password: string;
  password_confirm: string;
  user_type?: 'student' | 'teacher';
}

export interface UploadDocumentRequest {
  file: File;
  document_type?: string;
}

// Classroom
export type ClassroomRole = 'teacher' | 'student' | 'assistant';
export type AssignmentStatus = 'draft' | 'published' | 'closed' | 'archived';
export type SubmissionStatus = 'not_submitted' | 'submitted' | 'graded' | 'returned';

export interface Classroom {
  id: string;
  teacher_id: string;
  name: string;
  description?: string | null;
  subject: string;
  grade_level: string;
  invite_code: string;
  is_archived: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  student_count?: number;
}

export interface ClassroomEnrollment {
  id: string;
  classroom_id: string;
  student_id: string;
  role: string;
  status: string;
  joined_at: string;
}

export interface Assignment {
  id: string;
  classroom_id: string;
  title: string;
  description?: string | null;
  points_possible: number;
  due_date?: string | null;
  status: AssignmentStatus;
  settings: Record<string, unknown>;
  rubric?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  content?: string | null;
  attachments: string[];
  submitted_at: string;
  status: SubmissionStatus;
  revision_count: number;
}

export interface Grade {
  id: string;
  submission_id: string;
  assignment_id: string;
  student_id: string;
  classroom_id: string;
  points_earned: number;
  points_possible: number;
  percentage?: number | null;
  letter_grade?: string | null;
  feedback?: string | null;
  rubric_scores?: Record<string, unknown> | null;
  graded_by?: string | null;
  graded_at: string;
}
