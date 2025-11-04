import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const experienceTriggersSchema = z.object({
  needs: z.array(z.string()),
  keywords: z.array(z.string()),
  priority: z.number().min(1).max(10),
});

const createExperienceSchema = z.object({
  category: z.string().min(1).max(50),
  title: z.string().min(1).max(255),
  event: z.string().min(1),
  ageRange: z.tuple([z.number(), z.number()]),
  learnings: z.array(z.string().min(1)),
  triggers: experienceTriggersSchema,
});

const updateExperienceSchema = createExperienceSchema.partial();

const archetypeVisualElementsSchema = z.object({
  objects: z.array(z.object({
    name: z.string(),
    weight: z.number().min(0).max(1),
    requirement: z.string().optional(),
  })),
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
  }),
  lighting: z.string(),
  mood: z.string(),
});

const archetypeConversationStyleSchema = z.object({
  length: z.enum(['short', 'medium', 'long']),
  speed: z.enum(['fast', 'medium', 'slow']),
  tone: z.enum(['light', 'neutral', 'serious']),
  characteristics: z.array(z.string()),
});

const createArchetypeSchema = z.object({
  name: z.string().min(1).max(100),
  matchingNeeds: z.array(z.string()),
  visualElements: archetypeVisualElementsSchema,
  conversationStyle: archetypeConversationStyleSchema,
});

const updateArchetypeSchema = createArchetypeSchema.partial();

const createVisualElementSchema = z.object({
  category: z.enum(['object', 'color', 'lighting', 'mood']),
  relatedNeeds: z.array(z.string()),
  name: z.string().min(1).max(255),
  description: z.string().min(1),
  promptFragment: z.string().min(1),
  weight: z.number().min(0).max(1),
});

const updateVisualElementSchema = createVisualElementSchema.partial();

// ============================================================================
// EXPERIENCE POOL ROUTES
// ============================================================================

/**
 * GET /api/v1/admin/data-pool/experiences
 * Get all experiences with optional filtering
 */
router.get('/experiences', async (req: Request, res: Response) => {
  try {
    const { category, search, sortBy = 'createdAt', sortOrder = 'desc', limit, offset } = req.query;

    const where: any = {};

    if (category) {
      where.category = category as string;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { event: { contains: search as string } },
      ];
    }

    const [experiences, total] = await Promise.all([
      prisma.dataPoolExperience.findMany({
        where,
        orderBy: {
          [sortBy as string]: sortOrder === 'asc' ? 'asc' : 'desc',
        },
        take: limit ? parseInt(limit as string) : undefined,
        skip: offset ? parseInt(offset as string) : undefined,
      }),
      prisma.dataPoolExperience.count({ where }),
    ]);

    res.json({
      success: true,
      data: experiences,
      pagination: {
        total,
        limit: limit ? parseInt(limit as string) : total,
        offset: offset ? parseInt(offset as string) : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching experiences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch experiences',
    });
  }
});

/**
 * GET /api/v1/admin/data-pool/experiences/:id
 * Get a specific experience by ID
 */
router.get('/experiences/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const experience = await prisma.dataPoolExperience.findUnique({
      where: { id },
    });

    if (!experience) {
      return res.status(404).json({
        success: false,
        error: 'Experience not found',
      });
    }

    res.json({
      success: true,
      data: experience,
    });
  } catch (error) {
    console.error('Error fetching experience:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch experience',
    });
  }
});

/**
 * POST /api/v1/admin/data-pool/experiences
 * Create a new experience
 */
router.post('/experiences', async (req: Request, res: Response) => {
  try {
    const validatedData = createExperienceSchema.parse(req.body);

    const experience = await prisma.dataPoolExperience.create({
      data: {
        category: validatedData.category,
        title: validatedData.title,
        event: validatedData.event,
        ageRange: validatedData.ageRange,
        learnings: validatedData.learnings,
        triggers: validatedData.triggers as any,
      },
    });

    res.status(201).json({
      success: true,
      data: experience,
      message: 'Experience created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('Error creating experience:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create experience',
    });
  }
});

/**
 * PATCH /api/v1/admin/data-pool/experiences/:id
 * Update an existing experience
 */
router.patch('/experiences/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateExperienceSchema.parse(req.body);

    const existingExperience = await prisma.dataPoolExperience.findUnique({
      where: { id },
    });

    if (!existingExperience) {
      return res.status(404).json({
        success: false,
        error: 'Experience not found',
      });
    }

    const updateData: any = {};
    if (validatedData.category) updateData.category = validatedData.category;
    if (validatedData.title) updateData.title = validatedData.title;
    if (validatedData.event) updateData.event = validatedData.event;
    if (validatedData.ageRange) updateData.ageRange = validatedData.ageRange;
    if (validatedData.learnings) updateData.learnings = validatedData.learnings;
    if (validatedData.triggers) updateData.triggers = validatedData.triggers;

    const experience = await prisma.dataPoolExperience.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: experience,
      message: 'Experience updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('Error updating experience:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update experience',
    });
  }
});

/**
 * DELETE /api/v1/admin/data-pool/experiences/:id
 * Delete an experience
 */
router.delete('/experiences/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const experience = await prisma.dataPoolExperience.findUnique({
      where: { id },
    });

    if (!experience) {
      return res.status(404).json({
        success: false,
        error: 'Experience not found',
      });
    }

    await prisma.dataPoolExperience.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Experience deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting experience:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete experience',
    });
  }
});

// ============================================================================
// ARCHETYPE POOL ROUTES
// ============================================================================

/**
 * GET /api/v1/admin/data-pool/archetypes
 * Get all archetypes with optional filtering
 */
router.get('/archetypes', async (req: Request, res: Response) => {
  try {
    const { search, sortBy = 'createdAt', sortOrder = 'desc', limit, offset } = req.query;

    const where: any = {};

    if (search) {
      where.name = { contains: search as string };
    }

    const [archetypes, total] = await Promise.all([
      prisma.dataPoolArchetype.findMany({
        where,
        orderBy: {
          [sortBy as string]: sortOrder === 'asc' ? 'asc' : 'desc',
        },
        take: limit ? parseInt(limit as string) : undefined,
        skip: offset ? parseInt(offset as string) : undefined,
      }),
      prisma.dataPoolArchetype.count({ where }),
    ]);

    res.json({
      success: true,
      data: archetypes,
      pagination: {
        total,
        limit: limit ? parseInt(limit as string) : total,
        offset: offset ? parseInt(offset as string) : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching archetypes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch archetypes',
    });
  }
});

/**
 * GET /api/v1/admin/data-pool/archetypes/:id
 * Get a specific archetype by ID
 */
router.get('/archetypes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const archetype = await prisma.dataPoolArchetype.findUnique({
      where: { id },
    });

    if (!archetype) {
      return res.status(404).json({
        success: false,
        error: 'Archetype not found',
      });
    }

    res.json({
      success: true,
      data: archetype,
    });
  } catch (error) {
    console.error('Error fetching archetype:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch archetype',
    });
  }
});

/**
 * POST /api/v1/admin/data-pool/archetypes
 * Create a new archetype
 */
router.post('/archetypes', async (req: Request, res: Response) => {
  try {
    const validatedData = createArchetypeSchema.parse(req.body);

    const archetype = await prisma.dataPoolArchetype.create({
      data: {
        name: validatedData.name,
        matchingNeeds: validatedData.matchingNeeds,
        visualElements: validatedData.visualElements as any,
        conversationStyle: validatedData.conversationStyle as any,
      },
    });

    res.status(201).json({
      success: true,
      data: archetype,
      message: 'Archetype created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('Error creating archetype:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create archetype',
    });
  }
});

/**
 * PATCH /api/v1/admin/data-pool/archetypes/:id
 * Update an existing archetype
 */
router.patch('/archetypes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateArchetypeSchema.parse(req.body);

    const existingArchetype = await prisma.dataPoolArchetype.findUnique({
      where: { id },
    });

    if (!existingArchetype) {
      return res.status(404).json({
        success: false,
        error: 'Archetype not found',
      });
    }

    const updateData: any = {};
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.matchingNeeds) updateData.matchingNeeds = validatedData.matchingNeeds;
    if (validatedData.visualElements) updateData.visualElements = validatedData.visualElements;
    if (validatedData.conversationStyle) updateData.conversationStyle = validatedData.conversationStyle;

    const archetype = await prisma.dataPoolArchetype.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: archetype,
      message: 'Archetype updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('Error updating archetype:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update archetype',
    });
  }
});

/**
 * DELETE /api/v1/admin/data-pool/archetypes/:id
 * Delete an archetype
 */
router.delete('/archetypes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const archetype = await prisma.dataPoolArchetype.findUnique({
      where: { id },
    });

    if (!archetype) {
      return res.status(404).json({
        success: false,
        error: 'Archetype not found',
      });
    }

    await prisma.dataPoolArchetype.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Archetype deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting archetype:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete archetype',
    });
  }
});

// ============================================================================
// VISUAL ELEMENTS POOL ROUTES
// ============================================================================

/**
 * GET /api/v1/admin/data-pool/visuals
 * Get all visual elements with optional filtering
 */
router.get('/visuals', async (req: Request, res: Response) => {
  try {
    const { category, search, sortBy = 'createdAt', sortOrder = 'desc', limit, offset } = req.query;

    const where: any = {};

    if (category) {
      where.category = category as string;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }

    const [visuals, total] = await Promise.all([
      prisma.dataPoolVisualElement.findMany({
        where,
        orderBy: {
          [sortBy as string]: sortOrder === 'asc' ? 'asc' : 'desc',
        },
        take: limit ? parseInt(limit as string) : undefined,
        skip: offset ? parseInt(offset as string) : undefined,
      }),
      prisma.dataPoolVisualElement.count({ where }),
    ]);

    res.json({
      success: true,
      data: visuals,
      pagination: {
        total,
        limit: limit ? parseInt(limit as string) : total,
        offset: offset ? parseInt(offset as string) : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching visual elements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch visual elements',
    });
  }
});

/**
 * GET /api/v1/admin/data-pool/visuals/:id
 * Get a specific visual element by ID
 */
router.get('/visuals/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const visual = await prisma.dataPoolVisualElement.findUnique({
      where: { id },
    });

    if (!visual) {
      return res.status(404).json({
        success: false,
        error: 'Visual element not found',
      });
    }

    res.json({
      success: true,
      data: visual,
    });
  } catch (error) {
    console.error('Error fetching visual element:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch visual element',
    });
  }
});

/**
 * POST /api/v1/admin/data-pool/visuals
 * Create a new visual element
 */
router.post('/visuals', async (req: Request, res: Response) => {
  try {
    const validatedData = createVisualElementSchema.parse(req.body);

    const visual = await prisma.dataPoolVisualElement.create({
      data: {
        category: validatedData.category,
        relatedNeeds: validatedData.relatedNeeds,
        name: validatedData.name,
        description: validatedData.description,
        promptFragment: validatedData.promptFragment,
        weight: validatedData.weight,
      },
    });

    res.status(201).json({
      success: true,
      data: visual,
      message: 'Visual element created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('Error creating visual element:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create visual element',
    });
  }
});

/**
 * PATCH /api/v1/admin/data-pool/visuals/:id
 * Update an existing visual element
 */
router.patch('/visuals/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateVisualElementSchema.parse(req.body);

    const existingVisual = await prisma.dataPoolVisualElement.findUnique({
      where: { id },
    });

    if (!existingVisual) {
      return res.status(404).json({
        success: false,
        error: 'Visual element not found',
      });
    }

    const updateData: any = {};
    if (validatedData.category) updateData.category = validatedData.category;
    if (validatedData.relatedNeeds) updateData.relatedNeeds = validatedData.relatedNeeds;
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.description) updateData.description = validatedData.description;
    if (validatedData.promptFragment) updateData.promptFragment = validatedData.promptFragment;
    if (validatedData.weight !== undefined) updateData.weight = validatedData.weight;

    const visual = await prisma.dataPoolVisualElement.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: visual,
      message: 'Visual element updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('Error updating visual element:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update visual element',
    });
  }
});

/**
 * DELETE /api/v1/admin/data-pool/visuals/:id
 * Delete a visual element
 */
router.delete('/visuals/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const visual = await prisma.dataPoolVisualElement.findUnique({
      where: { id },
    });

    if (!visual) {
      return res.status(404).json({
        success: false,
        error: 'Visual element not found',
      });
    }

    await prisma.dataPoolVisualElement.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Visual element deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting visual element:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete visual element',
    });
  }
});

export default router;
