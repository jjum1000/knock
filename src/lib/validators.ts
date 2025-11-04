// Form validation schemas using Zod

import { z } from 'zod';

// ============================================================================
// TEMPLATE VALIDATION SCHEMAS
// ============================================================================

export const templateSectionSchema = z.object({
  why: z.string().min(1, 'WHY section is required'),
  past: z.string().min(1, 'PAST section is required'),
  trauma: z.string().min(1, 'TRAUMA section is required'),
  how: z.string().min(1, 'HOW section is required'),
  personality: z.string().min(1, 'PERSONALITY section is required'),
  what: z.string().min(1, 'WHAT section is required'),
  relationship: z.string().min(1, 'RELATIONSHIP section is required'),
});

export const templateVariableSchema = z.object({
  name: z.string().min(1, 'Variable name is required'),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  required: z.boolean(),
  description: z.string().optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  version: z.string().min(1, 'Version is required').max(20, 'Version is too long'),
  sections: templateSectionSchema,
  variables: z.array(templateVariableSchema),
  agentInstructions: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateTemplateSchema = createTemplateSchema.partial();

// ============================================================================
// EXPERIENCE VALIDATION SCHEMAS
// ============================================================================

export const experienceTriggersSchema = z.object({
  needs: z.array(z.string()).min(1, 'At least one need is required'),
  keywords: z.array(z.string()).min(1, 'At least one keyword is required'),
  priority: z.number().min(1).max(10, 'Priority must be between 1 and 10'),
});

export const createExperienceSchema = z.object({
  category: z.string().min(1, 'Category is required').max(50, 'Category is too long'),
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  event: z.string().min(1, 'Event description is required'),
  ageRange: z.tuple([
    z.number().min(0).max(100),
    z.number().min(0).max(100),
  ]).refine(([min, max]) => min <= max, {
    message: 'Max age must be greater than or equal to min age',
  }),
  learnings: z.array(z.string().min(1)).min(1, 'At least one learning is required'),
  triggers: experienceTriggersSchema,
});

export const updateExperienceSchema = createExperienceSchema.partial();

// ============================================================================
// ARCHETYPE VALIDATION SCHEMAS
// ============================================================================

export const archetypeVisualElementsSchema = z.object({
  objects: z.array(z.object({
    name: z.string().min(1),
    weight: z.number().min(0).max(1),
    requirement: z.string().optional(),
  })).min(1, 'At least one object is required'),
  colors: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  }),
  lighting: z.string().min(1, 'Lighting is required'),
  mood: z.string().min(1, 'Mood is required'),
});

export const archetypeConversationStyleSchema = z.object({
  length: z.enum(['short', 'medium', 'long']),
  speed: z.enum(['fast', 'medium', 'slow']),
  tone: z.enum(['light', 'neutral', 'serious']),
  characteristics: z.array(z.string()).min(1, 'At least one characteristic is required'),
});

export const createArchetypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  matchingNeeds: z.array(z.string()).min(1, 'At least one matching need is required'),
  visualElements: archetypeVisualElementsSchema,
  conversationStyle: archetypeConversationStyleSchema,
});

export const updateArchetypeSchema = createArchetypeSchema.partial();

// ============================================================================
// VISUAL ELEMENT VALIDATION SCHEMAS
// ============================================================================

export const createVisualElementSchema = z.object({
  category: z.enum(['object', 'color', 'lighting', 'mood']),
  relatedNeeds: z.array(z.string()).min(1, 'At least one related need is required'),
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  description: z.string().min(1, 'Description is required'),
  promptFragment: z.string().min(1, 'Prompt fragment is required'),
  weight: z.number().min(0).max(1, 'Weight must be between 0 and 1'),
});

export const updateVisualElementSchema = createVisualElementSchema.partial();

// ============================================================================
// AGENT EXECUTION VALIDATION SCHEMAS
// ============================================================================

export const agentExecutionSchema = z.object({
  input: z.object({
    userData: z.object({
      domains: z.array(z.string()).min(1, 'At least one domain is required'),
      keywords: z.array(z.string()).min(1, 'At least one keyword is required'),
      interests: z.array(z.string()).min(1, 'At least one interest is required'),
      avoidTopics: z.array(z.string()).optional(),
    }),
    preferences: z.object({
      conversationStyle: z.enum(['casual', 'formal', 'mixed']).optional(),
      responseLength: z.enum(['short', 'medium', 'long']).optional(),
    }).optional(),
    meta: z.object({
      userId: z.string().min(1, 'User ID is required'),
      userName: z.string().min(1, 'User name is required'),
      language: z.string().optional(),
    }),
  }),
  config: z.object({
    templateId: z.string().uuid('Invalid template ID').optional(),
    skipCache: z.boolean().optional(),
    dryRun: z.boolean().optional(),
  }).optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export type TemplateFormData = z.infer<typeof createTemplateSchema>;
export type ExperienceFormData = z.infer<typeof createExperienceSchema>;
export type ArchetypeFormData = z.infer<typeof createArchetypeSchema>;
export type VisualElementFormData = z.infer<typeof createVisualElementSchema>;
export type AgentExecutionFormData = z.infer<typeof agentExecutionSchema>;
