import axios from 'axios';

const API_BASE_URL = '/api/predictive';

export const predictiveService = {
  // ============= SKILL RECOMMENDATIONS =============

  /**
   * Get personalized skill recommendations for user
   */
  async getSkillRecommendations(
    userId: string,
    topN: number = 10,
    filters?: { industryFilter?: string[]; minMarketDemand?: number }
  ) {
    try {
      const response = await axios.get(`${API_BASE_URL}/recommendations`, {
        params: { userId, topN, ...filters },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get skill recommendations:', error);
      throw error;
    }
  },

  /**
   * Get detailed recommendation with resources
   */
  async getRecommendationDetails(recommendationId: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/recommendations/${recommendationId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get recommendation details:', error);
      throw error;
    }
  },

  /**
   * Submit feedback on a skill recommendation
   */
  async submitRecommendationFeedback(
    recommendationId: string,
    feedback: {
      satisfaction: number;
      adopted: boolean;
      daysToAdoption?: number;
      comments?: string;
    }
  ) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/recommendations/${recommendationId}/feedback`,
        feedback
      );
      return response.data;
    } catch (error) {
      console.error('Failed to submit recommendation feedback:', error);
      throw error;
    }
  },

  // ============= SKILL GAPS =============

  /**
   * Calculate skill gaps for target role
   */
  async getSkillGaps(
    userId: string,
    options?: { targetRole?: string; includeResources?: boolean; sortBy?: string }
  ) {
    try {
      const response = await axios.get(`${API_BASE_URL}/skill-gaps`, {
        params: { userId, ...options },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get skill gaps:', error);
      throw error;
    }
  },

  /**
   * Get recommended resources for closing a skill gap
   */
  async getGapClosingResources(skillName: string, targetLevel: number) {
    try {
      const response = await axios.get(`${API_BASE_URL}/skill-gaps/${skillName}/resources`, {
        params: { targetLevel },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get gap closing resources:', error);
      throw error;
    }
  },

  // ============= CAREER PREDICTIONS =============

  /**
   * Get career path predictions
   */
  async getPredictedCareerPath(
    userId: string,
    options?: { horizonYears?: number; includeCompensation?: boolean }
  ) {
    try {
      const response = await axios.get(`${API_BASE_URL}/career-path`, {
        params: { userId, ...options },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get career path prediction:', error);
      throw error;
    }
  },

  /**
   * Get insights and recommendations for career growth
   */
  async getCareerInsights(
    userId: string,
    options?: { focusArea?: string; confidenceThreshold?: number }
  ) {
    try {
      const response = await axios.get(`${API_BASE_URL}/career-insights`, {
        params: { userId, ...options },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get career insights:', error);
      throw error;
    }
  },

  /**
   * Get specific insight details
   */
  async getInsightDetails(insightId: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/insights/${insightId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get insight details:', error);
      throw error;
    }
  },

  // ============= LEARNING PATHS =============

  /**
   * Create a personalized learning path
   */
  async createLearningPath(
    userId: string,
    data: {
      targetSkills: string[];
      currentLevel?: number;
      targetLevel?: number;
      timeCommitmentHours?: number;
      learningStyle?: string;
    }
  ) {
    try {
      const response = await axios.post(`${API_BASE_URL}/learning-paths`, {
        userId,
        ...data,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create learning path:', error);
      throw error;
    }
  },

  /**
   * Get user's learning paths
   */
  async getLearningPaths(userId: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/learning-paths`, {
        params: { userId },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get learning paths:', error);
      throw error;
    }
  },

  /**
   * Update learning path progress
   */
  async updateLearningPathProgress(
    pathId: string,
    progress: { progressPercent?: number; resourceCompleted?: string; hoursLogged?: number }
  ) {
    try {
      const response = await axios.put(`${API_BASE_URL}/learning-paths/${pathId}/progress`, progress);
      return response.data;
    } catch (error) {
      console.error('Failed to update learning path progress:', error);
      throw error;
    }
  },

  /**
   * Get learning resources for a skill
   */
  async getLearningResources(
    skillName: string,
    options?: { type?: string; maxCost?: number; minRating?: number }
  ) {
    try {
      const response = await axios.get(`${API_BASE_URL}/learning-resources`, {
        params: { skillName, ...options },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get learning resources:', error);
      throw error;
    }
  },

  // ============= SALARY INSIGHTS =============

  /**
   * Get salary insights and benchmarks
   */
  async getSalaryInsights(
    userId: string,
    options?: { includeNegotiationTips?: boolean; includeGeographic?: boolean }
  ) {
    try {
      const response = await axios.get(`${API_BASE_URL}/salary-insights`, {
        params: { userId, ...options },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get salary insights:', error);
      throw error;
    }
  },

  /**
   * Compare salary with peers
   */
  async compareSalary(userId: string, compareToRole: string, filters?: { industry?: string; location?: string }) {
    try {
      const response = await axios.get(`${API_BASE_URL}/salary-comparison`, {
        params: { userId, compareToRole, ...filters },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to compare salary:', error);
      throw error;
    }
  },

  // ============= ANALYTICS & METRICS =============

  /**
   * Get analytics dashboard metrics
   */
  async getDashboardMetrics(options?: { timeframeMonths?: number }) {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/dashboard`, {
        params: options,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get dashboard metrics:', error);
      throw error;
    }
  },

  /**
   * Get user-specific analytics
   */
  async getUserAnalytics(userId: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get user analytics:', error);
      throw error;
    }
  },

  /**
   * Get recommendation metrics
   */
  async getRecommendationMetrics(skillName: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/recommendations/${skillName}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get recommendation metrics:', error);
      throw error;
    }
  },

  /**
   * Track prediction accuracy
   */
  async trackPredictionAccuracy(
    userId: string,
    data: {
      metricName: string;
      predictedValue: number;
      notes?: string;
    }
  ) {
    try {
      const response = await axios.post(`${API_BASE_URL}/analytics/predictions`, {
        userId,
        ...data,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to track prediction accuracy:', error);
      throw error;
    }
  },

  // ============= BIAS DETECTION & FAIRNESS =============

  /**
   * Get bias detection report
   */
  async getBiasReport(options?: { includedMetrics?: string[]; includeActionItems?: boolean }) {
    try {
      const response = await axios.get(`${API_BASE_URL}/bias-report`, {
        params: options,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get bias report:', error);
      throw error;
    }
  },

  /**
   * Get specific metric bias analysis
   */
  async getMetricBiasAnalysis(metricName: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/bias-analysis/${metricName}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get metric bias analysis:', error);
      throw error;
    }
  },

  /**
   * Get bias recommendations
   */
  async getBiasRecommendations() {
    try {
      const response = await axios.get(`${API_BASE_URL}/bias-recommendations`);
      return response.data;
    } catch (error) {
      console.error('Failed to get bias recommendations:', error);
      throw error;
    }
  },

  // ============= MARKET DATA =============

  /**
   * Get skill market trends
   */
  async getMarketTrends(options?: { industry?: string; timeframe?: number }) {
    try {
      const response = await axios.get(`${API_BASE_URL}/market-trends`, {
        params: options,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get market trends:', error);
      throw error;
    }
  },

  /**
   * Get in-demand skills
   */
  async getInDemandSkills(options?: { industry?: string; level?: string; limit?: number }) {
    try {
      const response = await axios.get(`${API_BASE_URL}/market-trends/in-demand`, {
        params: options,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get in-demand skills:', error);
      throw error;
    }
  },

  /**
   * Get role requirements and skill matrix
   */
  async getRoleRequirements(role: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/role-requirements/${role}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get role requirements:', error);
      throw error;
    }
  },

  /**
   * Get salary benchmarks for role
   */
  async getRoleSalaryBenchmarks(role: string, filters?: { years_experience?: number; location?: string }) {
    try {
      const response = await axios.get(`${API_BASE_URL}/salary-benchmarks/${role}`, {
        params: filters,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get salary benchmarks:', error);
      throw error;
    }
  },

  // ============= SKILL PROGRESS =============

  /**
   * Log skill learning activity
   */
  async logSkillProgress(
    userId: string,
    skillName: string,
    data: { hoursLogged?: number; resourceCompleted?: string; score?: number }
  ) {
    try {
      const response = await axios.post(`${API_BASE_URL}/skill-progress`, {
        userId,
        skillName,
        ...data,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to log skill progress:', error);
      throw error;
    }
  },

  /**
   * Get skill progress summary
   */
  async getSkillProgress(userId: string, skillName: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/skill-progress/${skillName}`, {
        params: { userId },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get skill progress:', error);
      throw error;
    }
  },

  /**
   * Get all progress for user
   */
  async getAllProgressMetrics(userId: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/skill-progress`, {
        params: { userId },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get progress metrics:', error);
      throw error;
    }
  },
};
