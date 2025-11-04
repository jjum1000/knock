// Admin API Service
// Handles all API calls to admin endpoints

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  ApiResponse,
  PaginatedResponse,
  PromptTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplatePreviewRequest,
  TemplatePreviewResponse,
  TemplateFilters,
  Experience,
  CreateExperienceInput,
  UpdateExperienceInput,
  Archetype,
  CreateArchetypeInput,
  UpdateArchetypeInput,
  VisualElement,
  CreateVisualElementInput,
  UpdateVisualElementInput,
  DataPoolFilters,
  DashboardStats,
  AgentJob,
  JobFilters,
  QualityAnalysis,
  PerformanceMetrics,
  MonitoringPeriod,
  AgentExecutionInput,
  AgentExecutionResponse,
  AgentStats,
} from '@/types/admin';

// Create axios instance with base configuration
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api/v1',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add auth token
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiResponse<any>>) => {
      // Handle 401 Unauthorized
      if (error.response?.status === 401) {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }

      // Handle 403 Forbidden (not admin)
      if (error.response?.status === 403) {
        console.error('Admin access required');
      }

      return Promise.reject(error);
    }
  );

  return client;
};

const apiClient = createApiClient();

// ============================================================================
// TEMPLATE MANAGEMENT API
// ============================================================================

export const templateApi = {
  /**
   * Get all templates with optional filtering
   */
  getTemplates: async (filters?: TemplateFilters): Promise<ApiResponse<PromptTemplate[]>> => {
    const params = new URLSearchParams();
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters?.search) params.append('search', filters.search);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await apiClient.get<ApiResponse<PromptTemplate[]>>(
      `/admin/templates?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get a specific template by ID
   */
  getTemplate: async (id: string): Promise<ApiResponse<PromptTemplate>> => {
    const response = await apiClient.get<ApiResponse<PromptTemplate>>(`/admin/templates/${id}`);
    return response.data;
  },

  /**
   * Create a new template
   */
  createTemplate: async (data: CreateTemplateInput): Promise<ApiResponse<PromptTemplate>> => {
    const response = await apiClient.post<ApiResponse<PromptTemplate>>('/admin/templates', data);
    return response.data;
  },

  /**
   * Update an existing template
   */
  updateTemplate: async (
    id: string,
    data: UpdateTemplateInput
  ): Promise<ApiResponse<PromptTemplate>> => {
    const response = await apiClient.patch<ApiResponse<PromptTemplate>>(
      `/admin/templates/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a template (soft delete by default)
   */
  deleteTemplate: async (id: string, hardDelete = false): Promise<ApiResponse<void>> => {
    const params = hardDelete ? '?hardDelete=true' : '';
    const response = await apiClient.delete<ApiResponse<void>>(`/admin/templates/${id}${params}`);
    return response.data;
  },

  /**
   * Preview a template with test data
   */
  previewTemplate: async (
    id: string,
    testData: Record<string, any>
  ): Promise<TemplatePreviewResponse> => {
    const response = await apiClient.post<TemplatePreviewResponse>(`/admin/templates/${id}/preview`, {
      testData,
    });
    return response.data;
  },

  /**
   * Test a template with full validation
   */
  testTemplate: async (
    id: string,
    testData: Record<string, any>
  ): Promise<TemplatePreviewResponse> => {
    const response = await apiClient.post<TemplatePreviewResponse>(`/admin/templates/${id}/test`, {
      testData,
    });
    return response.data;
  },
};

// ============================================================================
// DATA POOL MANAGEMENT API - EXPERIENCES
// ============================================================================

export const experienceApi = {
  /**
   * Get all experiences with optional filtering
   */
  getExperiences: async (
    filters?: DataPoolFilters
  ): Promise<PaginatedResponse<Experience>> => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));

    const response = await apiClient.get<PaginatedResponse<Experience>>(
      `/admin/data-pool/experiences?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get a specific experience by ID
   */
  getExperience: async (id: string): Promise<ApiResponse<Experience>> => {
    const response = await apiClient.get<ApiResponse<Experience>>(
      `/admin/data-pool/experiences/${id}`
    );
    return response.data;
  },

  /**
   * Create a new experience
   */
  createExperience: async (data: CreateExperienceInput): Promise<ApiResponse<Experience>> => {
    const response = await apiClient.post<ApiResponse<Experience>>(
      '/admin/data-pool/experiences',
      data
    );
    return response.data;
  },

  /**
   * Update an existing experience
   */
  updateExperience: async (
    id: string,
    data: UpdateExperienceInput
  ): Promise<ApiResponse<Experience>> => {
    const response = await apiClient.patch<ApiResponse<Experience>>(
      `/admin/data-pool/experiences/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete an experience
   */
  deleteExperience: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/admin/data-pool/experiences/${id}`
    );
    return response.data;
  },
};

// ============================================================================
// DATA POOL MANAGEMENT API - ARCHETYPES
// ============================================================================

export const archetypeApi = {
  /**
   * Get all archetypes with optional filtering
   */
  getArchetypes: async (filters?: DataPoolFilters): Promise<PaginatedResponse<Archetype>> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));

    const response = await apiClient.get<PaginatedResponse<Archetype>>(
      `/admin/data-pool/archetypes?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get a specific archetype by ID
   */
  getArchetype: async (id: string): Promise<ApiResponse<Archetype>> => {
    const response = await apiClient.get<ApiResponse<Archetype>>(
      `/admin/data-pool/archetypes/${id}`
    );
    return response.data;
  },

  /**
   * Create a new archetype
   */
  createArchetype: async (data: CreateArchetypeInput): Promise<ApiResponse<Archetype>> => {
    const response = await apiClient.post<ApiResponse<Archetype>>(
      '/admin/data-pool/archetypes',
      data
    );
    return response.data;
  },

  /**
   * Update an existing archetype
   */
  updateArchetype: async (
    id: string,
    data: UpdateArchetypeInput
  ): Promise<ApiResponse<Archetype>> => {
    const response = await apiClient.patch<ApiResponse<Archetype>>(
      `/admin/data-pool/archetypes/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete an archetype
   */
  deleteArchetype: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/admin/data-pool/archetypes/${id}`
    );
    return response.data;
  },
};

// ============================================================================
// DATA POOL MANAGEMENT API - VISUAL ELEMENTS
// ============================================================================

export const visualApi = {
  /**
   * Get all visual elements with optional filtering
   */
  getVisuals: async (
    filters?: DataPoolFilters
  ): Promise<PaginatedResponse<VisualElement>> => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));

    const response = await apiClient.get<PaginatedResponse<VisualElement>>(
      `/admin/data-pool/visuals?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get a specific visual element by ID
   */
  getVisual: async (id: string): Promise<ApiResponse<VisualElement>> => {
    const response = await apiClient.get<ApiResponse<VisualElement>>(
      `/admin/data-pool/visuals/${id}`
    );
    return response.data;
  },

  /**
   * Create a new visual element
   */
  createVisual: async (data: CreateVisualElementInput): Promise<ApiResponse<VisualElement>> => {
    const response = await apiClient.post<ApiResponse<VisualElement>>(
      '/admin/data-pool/visuals',
      data
    );
    return response.data;
  },

  /**
   * Update an existing visual element
   */
  updateVisual: async (
    id: string,
    data: UpdateVisualElementInput
  ): Promise<ApiResponse<VisualElement>> => {
    const response = await apiClient.patch<ApiResponse<VisualElement>>(
      `/admin/data-pool/visuals/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a visual element
   */
  deleteVisual: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/admin/data-pool/visuals/${id}`);
    return response.data;
  },
};

// ============================================================================
// MONITORING & ANALYTICS API
// ============================================================================

export const monitoringApi = {
  /**
   * Get dashboard statistics
   */
  getDashboard: async (period: MonitoringPeriod['period'] = '24h'): Promise<DashboardStats> => {
    const response = await apiClient.get<DashboardStats>(
      `/admin/monitoring/dashboard?period=${period}`
    );
    return response.data;
  },

  /**
   * Get all jobs with filtering
   */
  getJobs: async (filters?: JobFilters): Promise<PaginatedResponse<AgentJob>> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await apiClient.get<PaginatedResponse<AgentJob>>(
      `/admin/monitoring/jobs?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get detailed information about a specific job
   */
  getJobDetail: async (jobId: string): Promise<ApiResponse<AgentJob>> => {
    const response = await apiClient.get<ApiResponse<AgentJob>>(
      `/admin/monitoring/jobs/${jobId}`
    );
    return response.data;
  },

  /**
   * Get quality analysis
   */
  getQualityAnalysis: async (
    period: MonitoringPeriod['period'] = '7d'
  ): Promise<QualityAnalysis> => {
    const response = await apiClient.get<QualityAnalysis>(
      `/admin/monitoring/quality?period=${period}`
    );
    return response.data;
  },

  /**
   * Get error logs
   */
  getErrors: async (filters?: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<AgentJob>> => {
    const params = new URLSearchParams();
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await apiClient.get<PaginatedResponse<AgentJob>>(
      `/admin/monitoring/errors?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get performance metrics
   */
  getPerformanceMetrics: async (
    period: MonitoringPeriod['period'] = '7d'
  ): Promise<PerformanceMetrics> => {
    const response = await apiClient.get<PerformanceMetrics>(
      `/admin/monitoring/performance?period=${period}`
    );
    return response.data;
  },
};

// ============================================================================
// AGENT EXECUTION & CONTROL API
// ============================================================================

export const agentApi = {
  /**
   * Manually execute the agent pipeline
   */
  executeAgent: async (input: AgentExecutionInput): Promise<AgentExecutionResponse> => {
    const response = await apiClient.post<AgentExecutionResponse>('/admin/agent/execute', input);
    return response.data;
  },

  /**
   * Get list of all agent jobs
   */
  getJobs: async (filters?: JobFilters): Promise<PaginatedResponse<AgentJob>> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));

    const response = await apiClient.get<PaginatedResponse<AgentJob>>(
      `/admin/agent/jobs?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get job status
   */
  getJobStatus: async (jobId: string): Promise<ApiResponse<AgentJob>> => {
    const response = await apiClient.get<ApiResponse<AgentJob>>(`/admin/agent/jobs/${jobId}`);
    return response.data;
  },

  /**
   * Retry a failed job
   */
  retryJob: async (jobId: string): Promise<AgentExecutionResponse> => {
    const response = await apiClient.post<AgentExecutionResponse>(
      `/admin/agent/jobs/${jobId}/retry`
    );
    return response.data;
  },

  /**
   * Cancel a running job
   */
  cancelJob: async (jobId: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/admin/agent/jobs/${jobId}`);
    return response.data;
  },

  /**
   * Get overall agent statistics
   */
  getStats: async (): Promise<ApiResponse<AgentStats>> => {
    const response = await apiClient.get<ApiResponse<AgentStats>>('/admin/agent/stats');
    return response.data;
  },

  /**
   * Test pipeline with sample data
   */
  testPipeline: async (): Promise<AgentExecutionResponse> => {
    const response = await apiClient.post<AgentExecutionResponse>('/admin/agent/test-pipeline');
    return response.data;
  },
};

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error as AxiosError<ApiResponse<any>>;
    return (
      apiError.response?.data?.error ||
      apiError.response?.data?.message ||
      apiError.message ||
      'An unknown error occurred'
    );
  }
  return 'An unknown error occurred';
};

// Export all APIs as a single object
export const adminApi = {
  templates: templateApi,
  experiences: experienceApi,
  archetypes: archetypeApi,
  visuals: visualApi,
  monitoring: monitoringApi,
  agent: agentApi,
};

export default adminApi;
