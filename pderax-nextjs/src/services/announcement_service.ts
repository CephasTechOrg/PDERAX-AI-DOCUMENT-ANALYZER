/**
 * Announcement Service
 * Matches backend: /api/v1/classrooms/{id}/announcements endpoints
 */

import apiClient from './api';

export interface Announcement {
  id: string;
  classroom_id: string;
  author_id: string;
  author_name: string;
  title: string;
  content: string;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  announcement_id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

class AnnouncementService {
  async getAnnouncements(classroomId: string): Promise<Announcement[]> {
    const data = await apiClient.get(`/api/v1/classrooms/${classroomId}/announcements`);
    return Array.isArray(data) ? data : [];
  }

  async createAnnouncement(classroomId: string, title: string, content: string): Promise<Announcement> {
    return apiClient.post(`/api/v1/classrooms/${classroomId}/announcements`, { title, content });
  }

  async deleteAnnouncement(classroomId: string, annId: string): Promise<void> {
    await apiClient.delete(`/api/v1/classrooms/${classroomId}/announcements/${annId}`);
  }

  async getComments(classroomId: string, annId: string): Promise<Comment[]> {
    const data = await apiClient.get(`/api/v1/classrooms/${classroomId}/announcements/${annId}/comments`);
    return Array.isArray(data) ? data : [];
  }

  async addComment(classroomId: string, annId: string, content: string): Promise<Comment> {
    return apiClient.post(`/api/v1/classrooms/${classroomId}/announcements/${annId}/comments`, { content });
  }

  async deleteComment(classroomId: string, annId: string, commentId: string): Promise<void> {
    await apiClient.delete(`/api/v1/classrooms/${classroomId}/announcements/${annId}/comments/${commentId}`);
  }
}

export default new AnnouncementService();
