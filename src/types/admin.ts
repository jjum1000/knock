// Admin TypeScript Types
// Types for Admin API requests and responses

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  sections: TemplateSections;
  variables: TemplateVariable[];
  agentInstructions: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    personas: number;
  };
}

export interface TemplateSections {
  why: string;
  past: string;
  trauma: string;
  how: string;
  personality: string;
  what: string;
  relationship: string;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
}

export interface CreateTemplateInput {
  name: string;
  version: string;
  sections: TemplateSections;
  variables: TemplateVariable[];
  agentInstructions?: string;
  isActive?: boolean;
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {}

export interface TemplatePreviewRequest {
  templateId: string;
  testData: Record<string, any>;
}

export interface TemplatePreviewResponse {
  success: boolean;
  data: {
    sections: Record<string, string>;
    fullPrompt: string;
    metadata: {
      templateName: string;
      templateVersion: string;
      characterCount: number;
      estimatedTokens: number;
    };
  };
}

// ============================================================================
// DATA POOL TYPES
// ============================================================================

export interface Experience {
  id: string;
  category: string;
  title: string;
  event: string;
  ageRange: [number, number];
  learnings: string[];
  triggers: ExperienceTriggers;
  createdAt: string;
}

export interface ExperienceTriggers {
  needs: string[];
  keywords: string[];
  priority: number;
}

export interface CreateExperienceInput {
  category: string;
  title: string;
  event: string;
  ageRange: [number, number];
  learnings: string[];
  triggers: ExperienceTriggers;
}

export interface UpdateExperienceInput extends Partial<CreateExperienceInput> {}

export interface Archetype {
  id: string;
  name: string;
  matchingNeeds: string[];
  visualElements: ArchetypeVisualElements;
  conversationStyle: ArchetypeConversationStyle;
  createdAt: string;
}

export interface ArchetypeVisualElements {
  objects: {
    name: string;
    weight: number;
    requirement?: string;
  }[];
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  lighting: string;
  mood: string;
}

export interface ArchetypeConversationStyle {
  length: 'short' | 'medium' | 'long';
  speed: 'fast' | 'medium' | 'slow';
  tone: 'light' | 'neutral' | 'serious';
  characteristics: string[];
}

export interface CreateArchetypeInput {
  name: string;
  matchingNeeds: string[];
  visualElements: ArchetypeVisualElements;
  conversationStyle: ArchetypeConversationStyle;
}

export interface UpdateArchetypeInput extends Partial<CreateArchetypeInput> {}

export interface VisualElement {
  id: string;
  category: 'object' | 'color' | 'lighting' | 'mood';
  relatedNeeds: string[];
  name: string;
  description: string;
  promptFragment: string;
  weight: number;
  createdAt: string;
}

export interface CreateVisualElementInput {
  category: 'object' | 'color' | 'lighting' | 'mood';
  relatedNeeds: string[];
  name: string;
  description: string;
  promptFragment: string;
  weight: number;
}

export interface UpdateVisualElementInput extends Partial<CreateVisualElementInput> {}

// ============================================================================
// MONITORING TYPES
// ============================================================================

export interface DashboardStats {
  overview: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    processingJobs: number;
    successRate: number;
    averageExecutionTime: number;
    averageQualityScore: number;
  };
  charts: {
    hourlyDistribution: Array<{ hour: string; count: number }>;
    statusDistribution: Array<{ status: string; count: number }>;
    qualityDistribution: Array<{ range: string; count: number }>;
  };
  recentJobs: AgentJob[];
  period: string;
  generatedAt: string;
}

export interface AgentJob {
  id: string;
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  executionTimeMs: number | null;
  qualityScore: number | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  user?: {
    id: string;
    email: string;
  };
  logs?: AgentJobLog[];
  personas?: any[];
  rooms?: any[];
  input?: any;
  output?: any;
}

export interface AgentJobLog {
  id: string;
  agentJobId: string;
  agentName: string;
  status: 'completed' | 'error' | 'skipped';
  message: string;
  executionTimeMs: number;
  inputData: any;
  outputData: any;
  createdAt: string;
}

export interface QualityAnalysis {
  qualityStats: {
    average: number;
    min: number | null;
    max: number | null;
    total: number;
  };
  lowQualityJobs: AgentJob[];
  qualityTrend: Array<{
    date: string;
    averageScore: number;
    count: number;
  }>;
  topFailureReasons: Array<{
    reason: string;
    count: number;
  }>;
  period: string;
  generatedAt: string;
}

export interface PerformanceMetrics {
  agentPerformance: Array<{
    agentName: string;
    averageTime: number;
    maxTime: number | null;
    minTime: number | null;
    count: number;
  }>;
  slowestJobs: AgentJob[];
  executionTimeTrend: Array<{
    date: string;
    averageTime: number;
    count: number;
  }>;
  period: string;
  generatedAt: string;
}

// ============================================================================
// AGENT EXECUTION TYPES
// ============================================================================

export interface AgentExecutionInput {
  input: {
    userData: {
      domains: string[];
      keywords: string[];
      interests: string[];
      avoidTopics?: string[];
    };
    preferences?: {
      conversationStyle?: 'casual' | 'formal' | 'mixed';
      responseLength?: 'short' | 'medium' | 'long';
    };
    meta: {
      userId: string;
      userName: string;
      language?: string;
    };
  };
  config?: {
    templateId?: string;
    skipCache?: boolean;
    dryRun?: boolean;
  };
}

export interface AgentExecutionResponse {
  success: boolean;
  data: {
    jobId: string;
    status: 'processing' | 'completed' | 'failed';
    message: string;
  };
}

export interface AgentStats {
  jobs: {
    total: number;
    completed: number;
    failed: number;
    processing: number;
    successRate: number;
  };
  performance: {
    averageExecutionTime: number;
    averageQualityScore: number;
  };
  output: {
    totalPersonasCreated: number;
    totalRoomsCreated: number;
  };
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore?: boolean;
  };
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface TemplateFilters {
  isActive?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DataPoolFilters {
  category?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface JobFilters {
  status?: 'processing' | 'completed' | 'failed';
  userId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}

export interface MonitoringPeriod {
  period: '1h' | '24h' | '7d' | '30d';
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface AdminUIState {
  currentPage: string;
  selectedTemplate: PromptTemplate | null;
  selectedExperience: Experience | null;
  selectedArchetype: Archetype | null;
  selectedVisual: VisualElement | null;
  selectedJob: AgentJob | null;
  isLoading: boolean;
  error: string | null;
}

export interface FormState<T> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isDirty: boolean;
}

// ============================================================================
// BREADCRUMB TYPES
// ============================================================================

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

export interface NavItem {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavItem[];
}
