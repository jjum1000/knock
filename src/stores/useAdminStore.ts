// Admin State Management Store
// Uses Zustand for global admin state management

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  PromptTemplate,
  Experience,
  Archetype,
  VisualElement,
  AgentJob,
  DashboardStats,
} from '@/types/admin';

interface AdminState {
  // Current view/page
  currentPage: string;
  setCurrentPage: (page: string) => void;

  // Selected items
  selectedTemplate: PromptTemplate | null;
  setSelectedTemplate: (template: PromptTemplate | null) => void;

  selectedExperience: Experience | null;
  setSelectedExperience: (experience: Experience | null) => void;

  selectedArchetype: Archetype | null;
  setSelectedArchetype: (archetype: Archetype | null) => void;

  selectedVisual: VisualElement | null;
  setSelectedVisual: (visual: VisualElement | null) => void;

  selectedJob: AgentJob | null;
  setSelectedJob: (job: AgentJob | null) => void;

  // Dashboard data
  dashboardStats: DashboardStats | null;
  setDashboardStats: (stats: DashboardStats | null) => void;

  // Sidebar state
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Modal states
  isTemplateModalOpen: boolean;
  setTemplateModalOpen: (open: boolean) => void;

  isExperienceModalOpen: boolean;
  setExperienceModalOpen: (open: boolean) => void;

  isArchetypeModalOpen: boolean;
  setArchetypeModalOpen: (open: boolean) => void;

  isVisualModalOpen: boolean;
  setVisualModalOpen: (open: boolean) => void;

  isAgentExecutionModalOpen: boolean;
  setAgentExecutionModalOpen: (open: boolean) => void;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Filter states
  templateFilters: {
    search: string;
    isActive: boolean | null;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  setTemplateFilters: (filters: Partial<AdminState['templateFilters']>) => void;
  resetTemplateFilters: () => void;

  dataPoolFilters: {
    search: string;
    category: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    limit: number;
    offset: number;
  };
  setDataPoolFilters: (filters: Partial<AdminState['dataPoolFilters']>) => void;
  resetDataPoolFilters: () => void;

  jobFilters: {
    search: string;
    status: 'processing' | 'completed' | 'failed' | null;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    limit: number;
    offset: number;
  };
  setJobFilters: (filters: Partial<AdminState['jobFilters']>) => void;
  resetJobFilters: () => void;

  // Monitoring period
  monitoringPeriod: '1h' | '24h' | '7d' | '30d';
  setMonitoringPeriod: (period: AdminState['monitoringPeriod']) => void;

  // Reset all state
  resetAll: () => void;
}

const initialState = {
  currentPage: 'dashboard',
  selectedTemplate: null,
  selectedExperience: null,
  selectedArchetype: null,
  selectedVisual: null,
  selectedJob: null,
  dashboardStats: null,
  sidebarCollapsed: false,
  isTemplateModalOpen: false,
  isExperienceModalOpen: false,
  isArchetypeModalOpen: false,
  isVisualModalOpen: false,
  isAgentExecutionModalOpen: false,
  isLoading: false,
  error: null,
  templateFilters: {
    search: '',
    isActive: null,
    sortBy: 'createdAt',
    sortOrder: 'desc' as const,
  },
  dataPoolFilters: {
    search: '',
    category: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as const,
    limit: 20,
    offset: 0,
  },
  jobFilters: {
    search: '',
    status: null,
    sortBy: 'startedAt',
    sortOrder: 'desc' as const,
    limit: 20,
    offset: 0,
  },
  monitoringPeriod: '24h' as const,
};

export const useAdminStore = create<AdminState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        // Current page actions
        setCurrentPage: (page) => set({ currentPage: page }),

        // Selected items actions
        setSelectedTemplate: (template) => set({ selectedTemplate: template }),
        setSelectedExperience: (experience) => set({ selectedExperience: experience }),
        setSelectedArchetype: (archetype) => set({ selectedArchetype: archetype }),
        setSelectedVisual: (visual) => set({ selectedVisual: visual }),
        setSelectedJob: (job) => set({ selectedJob: job }),

        // Dashboard actions
        setDashboardStats: (stats) => set({ dashboardStats: stats }),

        // Sidebar actions
        toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

        // Modal actions
        setTemplateModalOpen: (open) => set({ isTemplateModalOpen: open }),
        setExperienceModalOpen: (open) => set({ isExperienceModalOpen: open }),
        setArchetypeModalOpen: (open) => set({ isArchetypeModalOpen: open }),
        setVisualModalOpen: (open) => set({ isVisualModalOpen: open }),
        setAgentExecutionModalOpen: (open) => set({ isAgentExecutionModalOpen: open }),

        // Loading actions
        setIsLoading: (loading) => set({ isLoading: loading }),

        // Error actions
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),

        // Template filter actions
        setTemplateFilters: (filters) =>
          set((state) => ({
            templateFilters: { ...state.templateFilters, ...filters },
          })),
        resetTemplateFilters: () =>
          set({ templateFilters: initialState.templateFilters }),

        // Data pool filter actions
        setDataPoolFilters: (filters) =>
          set((state) => ({
            dataPoolFilters: { ...state.dataPoolFilters, ...filters },
          })),
        resetDataPoolFilters: () =>
          set({ dataPoolFilters: initialState.dataPoolFilters }),

        // Job filter actions
        setJobFilters: (filters) =>
          set((state) => ({
            jobFilters: { ...state.jobFilters, ...filters },
          })),
        resetJobFilters: () =>
          set({ jobFilters: initialState.jobFilters }),

        // Monitoring period actions
        setMonitoringPeriod: (period) => set({ monitoringPeriod: period }),

        // Reset all state
        resetAll: () => set(initialState),
      }),
      {
        name: 'admin-store',
        // Only persist certain fields
        partialize: (state) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          templateFilters: state.templateFilters,
          dataPoolFilters: state.dataPoolFilters,
          jobFilters: state.jobFilters,
          monitoringPeriod: state.monitoringPeriod,
        }),
      }
    ),
    {
      name: 'AdminStore',
    }
  )
);

// Selector hooks for better performance
export const useCurrentPage = () => useAdminStore((state) => state.currentPage);
export const useSelectedTemplate = () => useAdminStore((state) => state.selectedTemplate);
export const useSelectedExperience = () => useAdminStore((state) => state.selectedExperience);
export const useSelectedArchetype = () => useAdminStore((state) => state.selectedArchetype);
export const useSelectedVisual = () => useAdminStore((state) => state.selectedVisual);
export const useSelectedJob = () => useAdminStore((state) => state.selectedJob);
export const useDashboardStats = () => useAdminStore((state) => state.dashboardStats);
export const useSidebarCollapsed = () => useAdminStore((state) => state.sidebarCollapsed);
export const useIsLoading = () => useAdminStore((state) => state.isLoading);
export const useError = () => useAdminStore((state) => state.error);
export const useTemplateFilters = () => useAdminStore((state) => state.templateFilters);
export const useDataPoolFilters = () => useAdminStore((state) => state.dataPoolFilters);
export const useJobFilters = () => useAdminStore((state) => state.jobFilters);
export const useMonitoringPeriod = () => useAdminStore((state) => state.monitoringPeriod);
