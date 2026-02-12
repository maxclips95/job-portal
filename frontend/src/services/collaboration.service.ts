import axios from 'axios';

const API_BASE = '/api/collaboration';

export const collaborationService = {
  // === TEAM MANAGEMENT ===
  async createTeam(name: string, description?: string, avatarUrl?: string) {
    const { data } = await axios.post(`${API_BASE}/teams`, { name, description, avatarUrl });
    return data;
  },

  async getTeam(teamId: string) {
    const { data } = await axios.get(`${API_BASE}/teams/${teamId}`);
    return data;
  },

  async getUserTeams() {
    const { data } = await axios.get(`${API_BASE}/teams`);
    return data;
  },

  async updateTeam(teamId: string, updates: any) {
    const { data } = await axios.patch(`${API_BASE}/teams/${teamId}`, updates);
    return data;
  },

  async deleteTeam(teamId: string) {
    await axios.delete(`${API_BASE}/teams/${teamId}`);
  },

  // === TEAM MEMBERS ===
  async addTeamMember(teamId: string, email: string, role: string) {
    const { data } = await axios.post(`${API_BASE}/teams/${teamId}/members`, { email, role });
    return data;
  },

  async getTeamMembers(teamId: string) {
    const { data } = await axios.get(`${API_BASE}/teams/${teamId}/members`);
    return data;
  },

  async updateTeamMember(teamId: string, userId: string, updates: any) {
    const { data } = await axios.patch(`${API_BASE}/teams/${teamId}/members/${userId}`, updates);
    return data;
  },

  async removeTeamMember(teamId: string, userId: string) {
    await axios.delete(`${API_BASE}/teams/${teamId}/members/${userId}`);
  },

  // === CHANNELS ===
  async createChannel(teamId: string, name: string, channelType: string, description?: string) {
    const { data } = await axios.post(`${API_BASE}/teams/${teamId}/channels`, {
      name,
      channelType,
      description,
    });
    return data;
  },

  async getTeamChannels(teamId: string) {
    const { data } = await axios.get(`${API_BASE}/teams/${teamId}/channels`);
    return data;
  },

  async getChannel(channelId: string) {
    const { data } = await axios.get(`${API_BASE}/channels/${channelId}`);
    return data;
  },

  async updateChannel(channelId: string, updates: any) {
    const { data } = await axios.patch(`${API_BASE}/channels/${channelId}`, updates);
    return data;
  },

  // === MESSAGING ===
  async sendMessage(channelId: string, content: string, messageType?: string, attachments?: any[]) {
    const { data } = await axios.post(`${API_BASE}/channels/${channelId}/messages`, {
      content,
      messageType: messageType || 'text',
      attachments,
    });
    return data;
  },

  async getChannelMessages(channelId: string, limit?: number, offset?: number) {
    const { data } = await axios.get(`${API_BASE}/channels/${channelId}/messages`, {
      params: { limit: limit || 50, offset: offset || 0 },
    });
    return data;
  },

  async editMessage(messageId: string, content: string) {
    const { data } = await axios.patch(`${API_BASE}/messages/${messageId}`, { content });
    return data;
  },

  async deleteMessage(messageId: string) {
    await axios.delete(`${API_BASE}/messages/${messageId}`);
  },

  async addReaction(messageId: string, emoji: string) {
    const { data } = await axios.post(`${API_BASE}/messages/${messageId}/reactions`, { emoji });
    return data;
  },

  async searchMessages(channelId: string, query: string) {
    const { data } = await axios.get(`${API_BASE}/channels/${channelId}/messages/search`, {
      params: { query },
    });
    return data;
  },

  // === PROJECTS ===
  async createProject(teamId: string, name: string, description?: string, status?: string) {
    const { data } = await axios.post(`${API_BASE}/teams/${teamId}/projects`, {
      name,
      description,
      status,
    });
    return data;
  },

  async getTeamProjects(teamId: string) {
    const { data } = await axios.get(`${API_BASE}/teams/${teamId}/projects`);
    return data;
  },

  async getProject(projectId: string) {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}`);
    return data;
  },

  async updateProject(projectId: string, updates: any) {
    const { data } = await axios.patch(`${API_BASE}/projects/${projectId}`, updates);
    return data;
  },

  async deleteProject(projectId: string) {
    await axios.delete(`${API_BASE}/projects/${projectId}`);
  },

  async getProjectBoard(projectId: string) {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/board`);
    return data;
  },

  // === TASKS ===
  async createTask(
    projectId: string,
    title: string,
    description?: string,
    priority?: string,
    assigneeId?: string,
    dueDate?: string
  ) {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/tasks`, {
      title,
      description,
      priority,
      assigneeId,
      dueDate,
    });
    return data;
  },

  async getProjectTasks(projectId: string, status?: string, priority?: string) {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/tasks`, {
      params: { status, priority },
    });
    return data;
  },

  async getTask(taskId: string) {
    const { data } = await axios.get(`${API_BASE}/tasks/${taskId}`);
    return data;
  },

  async updateTask(taskId: string, updates: any) {
    const { data } = await axios.patch(`${API_BASE}/tasks/${taskId}`, updates);
    return data;
  },

  async assignTask(taskId: string, userId: string) {
    const { data } = await axios.patch(`${API_BASE}/tasks/${taskId}`, { assigneeId: userId });
    return data;
  },

  async completeTask(taskId: string) {
    const { data } = await axios.patch(`${API_BASE}/tasks/${taskId}`, { status: 'completed' });
    return data;
  },

  async deleteTask(taskId: string) {
    await axios.delete(`${API_BASE}/tasks/${taskId}`);
  },

  // === TASK COMMENTS ===
  async addTaskComment(taskId: string, content: string, mentions?: string[]) {
    const { data } = await axios.post(`${API_BASE}/tasks/${taskId}/comments`, { content, mentions });
    return data;
  },

  async getTaskComments(taskId: string) {
    const { data } = await axios.get(`${API_BASE}/tasks/${taskId}/comments`);
    return data;
  },

  async deleteTaskComment(commentId: string) {
    await axios.delete(`${API_BASE}/comments/${commentId}`);
  },

  // === NOTIFICATIONS ===
  async getNotifications(limit?: number) {
    const { data } = await axios.get(`${API_BASE}/notifications`, {
      params: { limit: limit || 50 },
    });
    return data;
  },

  async getUnreadCount() {
    const { data } = await axios.get(`${API_BASE}/notifications/unread`);
    return data;
  },

  async markAsRead(notificationId: string) {
    const { data } = await axios.patch(`${API_BASE}/notifications/${notificationId}`, { status: 'read' });
    return data;
  },

  async markAllAsRead() {
    const { data } = await axios.patch(`${API_BASE}/notifications/read-all`);
    return data;
  },

  async deleteNotification(notificationId: string) {
    await axios.delete(`${API_BASE}/notifications/${notificationId}`);
  },

  // === NOTIFICATION PREFERENCES ===
  async getNotificationPreferences(teamId: string) {
    const { data } = await axios.get(`${API_BASE}/teams/${teamId}/notification-preferences`);
    return data;
  },

  async updateNotificationPreferences(teamId: string, preferences: any) {
    const { data } = await axios.patch(
      `${API_BASE}/teams/${teamId}/notification-preferences`,
      preferences
    );
    return data;
  },

  // === ANALYTICS ===
  async getTeamStats(teamId: string) {
    const { data } = await axios.get(`${API_BASE}/teams/${teamId}/stats`);
    return data;
  },

  async getProjectStats(projectId: string) {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/stats`);
    return data;
  },

  async getMemberContributions(teamId: string) {
    const { data } = await axios.get(`${API_BASE}/teams/${teamId}/contributions`);
    return data;
  },

  async getChannelActivity(channelId: string, days?: number) {
    const { data } = await axios.get(`${API_BASE}/channels/${channelId}/activity`, {
      params: { days: days || 7 },
    });
    return data;
  },

  // === ACTIVITY LOGS ===
  async getTeamActivity(teamId: string, limit?: number) {
    const { data } = await axios.get(`${API_BASE}/teams/${teamId}/activity`, {
      params: { limit: limit || 100 },
    });
    return data;
  },

  async getProjectActivity(projectId: string, limit?: number) {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/activity`, {
      params: { limit: limit || 50 },
    });
    return data;
  },

  // === PRESENCE ===
  async getTeamPresence(teamId: string) {
    const { data } = await axios.get(`${API_BASE}/teams/${teamId}/presence`);
    return data;
  },

  async getUserPresence(teamId: string, userId: string) {
    const { data } = await axios.get(`${API_BASE}/teams/${teamId}/presence/${userId}`);
    return data;
  },
};
