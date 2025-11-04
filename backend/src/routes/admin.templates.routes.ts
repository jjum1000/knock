import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import Handlebars from 'handlebars';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const templateSectionSchema = z.object({
  why: z.string().min(1),
  past: z.string().min(1),
  trauma: z.string().min(1),
  how: z.string().min(1),
  personality: z.string().min(1),
  what: z.string().min(1),
  relationship: z.string().min(1),
});

const templateVariableSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  required: z.boolean(),
  description: z.string().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  version: z.string().min(1).max(20),
  sections: templateSectionSchema,
  variables: z.array(templateVariableSchema),
  agentInstructions: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateTemplateSchema = createTemplateSchema.partial();

const previewTemplateSchema = z.object({
  templateId: z.string().uuid(),
  testData: z.record(z.any()),
});

/**
 * GET /api/v1/admin/templates
 * Get all templates with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { isActive, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { version: { contains: search as string } },
      ];
    }

    const templates = await prisma.promptTemplate.findMany({
      where,
      orderBy: {
        [sortBy as string]: sortOrder === 'asc' ? 'asc' : 'desc',
      },
      select: {
        id: true,
        name: true,
        version: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            personas: true, // Count how many personas use this template
          },
        },
      },
    });

    res.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
    });
  }
});

/**
 * GET /api/v1/admin/templates/:id
 * Get a specific template by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const template = await prisma.promptTemplate.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            personas: true,
          },
        },
      },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template',
    });
  }
});

/**
 * POST /api/v1/admin/templates
 * Create a new template
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = createTemplateSchema.parse(req.body);

    // Validate Handlebars syntax in sections
    const sectionErrors: string[] = [];
    Object.entries(validatedData.sections).forEach(([key, template]) => {
      try {
        Handlebars.compile(template);
      } catch (error: any) {
        sectionErrors.push(`Section "${key}": ${error.message}`);
      }
    });

    if (sectionErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Handlebars syntax',
        details: sectionErrors,
      });
    }

    const template = await prisma.promptTemplate.create({
      data: {
        name: validatedData.name,
        version: validatedData.version,
        sections: validatedData.sections as any,
        variables: validatedData.variables as any,
        agentInstructions: validatedData.agentInstructions || '',
        isActive: validatedData.isActive ?? true,
      },
    });

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template',
    });
  }
});

/**
 * PATCH /api/v1/admin/templates/:id
 * Update an existing template
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateTemplateSchema.parse(req.body);

    // Check if template exists
    const existingTemplate = await prisma.promptTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    // Validate Handlebars syntax if sections are being updated
    if (validatedData.sections) {
      const sectionErrors: string[] = [];
      Object.entries(validatedData.sections).forEach(([key, template]) => {
        try {
          Handlebars.compile(template as string);
        } catch (error: any) {
          sectionErrors.push(`Section "${key}": ${error.message}`);
        }
      });

      if (sectionErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Handlebars syntax',
          details: sectionErrors,
        });
      }
    }

    const updateData: any = {};
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.version) updateData.version = validatedData.version;
    if (validatedData.sections) updateData.sections = validatedData.sections;
    if (validatedData.variables) updateData.variables = validatedData.variables;
    if (validatedData.agentInstructions !== undefined) {
      updateData.agentInstructions = validatedData.agentInstructions;
    }
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;

    const template = await prisma.promptTemplate.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: template,
      message: 'Template updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update template',
    });
  }
});

/**
 * DELETE /api/v1/admin/templates/:id
 * Delete a template (soft delete by setting isActive to false)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { hardDelete } = req.query;

    // Check if template exists
    const template = await prisma.promptTemplate.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            personas: true,
          },
        },
      },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    // Prevent deletion if template is in use
    if (template._count.personas > 0 && hardDelete !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete template that is in use',
        details: `This template is used by ${template._count.personas} persona(s)`,
      });
    }

    if (hardDelete === 'true') {
      // Hard delete (permanent)
      await prisma.promptTemplate.delete({
        where: { id },
      });
    } else {
      // Soft delete (set isActive to false)
      await prisma.promptTemplate.update({
        where: { id },
        data: { isActive: false },
      });
    }

    res.json({
      success: true,
      message: hardDelete === 'true'
        ? 'Template permanently deleted'
        : 'Template deactivated',
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template',
    });
  }
});

/**
 * POST /api/v1/admin/templates/:id/preview
 * Preview a template with test data
 */
router.post('/:id/preview', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { testData } = req.body;

    const template = await prisma.promptTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    const sections = template.sections as any;
    const compiledSections: any = {};

    // Compile each section with test data
    try {
      Object.entries(sections).forEach(([key, sectionTemplate]) => {
        const compiled = Handlebars.compile(sectionTemplate as string);
        compiledSections[key] = compiled(testData);
      });

      // Assemble full prompt
      const fullPrompt = Object.entries(compiledSections)
        .map(([key, content]) => `## ${key.toUpperCase()}\n\n${content}`)
        .join('\n\n---\n\n');

      res.json({
        success: true,
        data: {
          sections: compiledSections,
          fullPrompt,
          metadata: {
            templateName: template.name,
            templateVersion: template.version,
            characterCount: fullPrompt.length,
            estimatedTokens: Math.ceil(fullPrompt.length / 4), // Rough estimate
          },
        },
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: 'Template rendering error',
        details: error.message,
      });
    }
  } catch (error) {
    console.error('Error previewing template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview template',
    });
  }
});

/**
 * POST /api/v1/admin/templates/:id/test
 * Test a template with full agent pipeline simulation
 */
router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { testData } = req.body;

    const template = await prisma.promptTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    // Validate test data against template variables
    const variables = template.variables as any[];
    const missingRequired = variables
      .filter(v => v.required && !(v.name in testData))
      .map(v => v.name);

    if (missingRequired.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required variables',
        details: missingRequired,
      });
    }

    const sections = template.sections as any;
    const compiledSections: any = {};
    const warnings: string[] = [];

    // Compile each section
    try {
      Object.entries(sections).forEach(([key, sectionTemplate]) => {
        const compiled = Handlebars.compile(sectionTemplate as string);
        const result = compiled(testData);
        compiledSections[key] = result;

        // Check for unreplaced variables
        const unreplacedMatches = result.match(/\{\{[^}]+\}\}/g);
        if (unreplacedMatches) {
          warnings.push(`Section "${key}" has unreplaced variables: ${unreplacedMatches.join(', ')}`);
        }
      });

      const fullPrompt = Object.entries(compiledSections)
        .map(([key, content]) => `## ${key.toUpperCase()}\n\n${content}`)
        .join('\n\n---\n\n');

      res.json({
        success: true,
        data: {
          sections: compiledSections,
          fullPrompt,
          validation: {
            hasWarnings: warnings.length > 0,
            warnings,
            allVariablesProvided: missingRequired.length === 0,
            characterCount: fullPrompt.length,
            estimatedTokens: Math.ceil(fullPrompt.length / 4),
          },
        },
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: 'Template test failed',
        details: error.message,
      });
    }
  } catch (error) {
    console.error('Error testing template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test template',
    });
  }
});

export default router;
