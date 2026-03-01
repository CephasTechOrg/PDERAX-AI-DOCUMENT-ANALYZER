/**
 * Core TypeScript Type Definitions
 * Used throughout the application for type safety
 */

// User and Authentication
export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_at: number;
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
  document_id: string;
  question: string;
  answer: string;
  difficulty: CardDifficulty;
  created_at: string;
  updated_at: string;
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

// Request/Response DTOs
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  name: string;
  password: string;
  password_confirm: string;
}

export interface UploadDocumentRequest {
  file: File;
  document_type?: string;
}

// Classroom (Future)
export type ClassroomRole = 'instructor' | 'student' | 'teaching_assistant';

export interface Classroom {
  id: string;
  name: string;
  description?: string;
  code: string;
  instructor_id: string;
  created_at: string;
  member_count: number;
}

export interface ClassMember {
  id: string;
  classroom_id: string;
  user_id: string;
  role: ClassroomRole;
  joined_at: string;
}

export interface Assignment {
  id: string;
  classroom_id: string;
  title: string;
  description: string;
  document_id?: string;
  due_date: string;
  created_at: string;
}
