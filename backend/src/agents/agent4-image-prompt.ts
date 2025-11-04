/**
 * Agent 4: Image Prompt Generation
 *
 * Maps character profile and need vectors to pixel art visual language.
 * Generates detailed image prompts for Gemini Imagen.
 */

import { prisma } from '../index';
import logger from '../utils/logger';
import { Agent1Output, CompleteNeedVector } from './agent1-need-vector';
import { Agent2Output } from './agent2-character-profile';

// ============================================================================
// TYPES
// ============================================================================

export interface Agent4Input {
  character: Agent2Output['character'];
  needVectors: Agent1Output['completeVector'];
}

export interface Agent4Output {
  imagePrompt: string;
  visualElements: {
    colors: string[];
    objects: string[];
    mood: string;
    lighting: string;
    space: string;
  };
  reasoning: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Need → Visual Mapping
const NEED_VISUAL_MAPPING: Record<string, {
  colors: string[];
  lighting: string;
  space: string;
  mood: string;
}> = {
  survival: {
    colors: ['warm browns', 'deep greens', 'earth tones'],
    lighting: 'soft, stable lighting with no harsh shadows',
    space: 'enclosed, cozy space with protective boundaries',
    mood: 'secure, grounded, peaceful',
  },
  belonging: {
    colors: ['warm oranges', 'soft pinks', 'gentle yellows'],
    lighting: 'warm, inviting glow',
    space: 'intimate space with shared elements',
    mood: 'connected, welcoming, communal',
  },
  recognition: {
    colors: ['bright gold', 'vibrant purple', 'confident red'],
    lighting: 'spotlight effect, bright focused light',
    space: 'prominent, centered composition',
    mood: 'proud, distinguished, celebrated',
  },
  autonomy: {
    colors: ['cool blues', 'independent teal', 'free sky colors'],
    lighting: 'natural, unrestricted light',
    space: 'open space with clear boundaries',
    mood: 'free, self-directed, unconfined',
  },
  growth: {
    colors: ['fresh green', 'sunrise yellow', 'evolving gradients'],
    lighting: 'dynamic lighting with upward direction',
    space: 'expanding space with room to grow',
    mood: 'aspiring, forward-moving, optimistic',
  },
  meaning: {
    colors: ['deep purple', 'cosmic blue', 'meaningful gold'],
    lighting: 'ethereal, purposeful glow',
    space: 'contemplative space with symbolic elements',
    mood: 'reflective, purposeful, profound',
  },
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Execute Agent 4: Generate image prompt
 */
export async function executeAgent4(input: Agent4Input): Promise<Agent4Output> {
  const startTime = Date.now();

  logger.info('Agent 4: Starting image prompt generation', {
    characterName: input.character.name,
  });

  try {
    // 1. Analyze needs and get visual direction
    const needVisuals = analyzeNeedVisuals(input.needVectors);

    // 2. Load visual data pool
    const visualElements = await loadVisualDataPool(input.character);

    // 3. Map trauma to visual elements
    const traumaVisuals = mapTraumaToVisuals(input.character.traumaAndLearning);

    // 4. Select objects from data pool
    const selectedObjects = selectObjects(
      visualElements,
      input.character.archetype,
      needVisuals
    );

    // 5. Assemble final prompt
    const imagePrompt = assembleImagePrompt({
      needVisuals,
      traumaVisuals,
      objects: selectedObjects,
      characterName: input.character.name,
      personality: input.character.personalityTraits,
    });

    // 6. Extract visual elements
    const visualElementsSummary = {
      colors: needVisuals.colors,
      objects: selectedObjects.map((o) => o.name),
      mood: needVisuals.mood,
      lighting: needVisuals.lighting,
      space: needVisuals.space,
    };

    // 7. Generate reasoning
    const reasoning = generateReasoning(input, visualElementsSummary);

    const duration = Date.now() - startTime;
    logger.info('Agent 4: Image prompt generated', {
      duration,
      promptLength: imagePrompt.length,
    });

    return {
      imagePrompt,
      visualElements: visualElementsSummary,
      reasoning,
    };
  } catch (error: any) {
    logger.error('Agent 4: Execution failed', {
      error: error.message,
    });

    throw error;
  }
}

// ============================================================================
// NEED VISUAL ANALYSIS
// ============================================================================

interface NeedVisuals {
  colors: string[];
  lighting: string;
  space: string;
  mood: string;
  dominantNeeds: string[];
}

function analyzeNeedVisuals(needVectors: CompleteNeedVector[]): NeedVisuals {
  // Get top 2-3 dominant needs (actual > 0.5)
  const dominantNeeds = needVectors
    .filter((n) => n.actual > 0.5)
    .sort((a, b) => b.actual - a.actual)
    .slice(0, 3);

  const colors: string[] = [];
  const lightingOptions: string[] = [];
  const spaceOptions: string[] = [];
  const moodOptions: string[] = [];

  for (const need of dominantNeeds) {
    const visual = NEED_VISUAL_MAPPING[need.need];
    if (visual) {
      colors.push(...visual.colors);
      lightingOptions.push(visual.lighting);
      spaceOptions.push(visual.space);
      moodOptions.push(visual.mood);
    }
  }

  return {
    colors: [...new Set(colors)].slice(0, 4), // Unique colors, max 4
    lighting: lightingOptions[0] || 'balanced, neutral lighting',
    space: spaceOptions[0] || 'comfortable personal space',
    mood: moodOptions.join(', '),
    dominantNeeds: dominantNeeds.map((n) => n.need),
  };
}

// ============================================================================
// VISUAL DATA POOL
// ============================================================================

interface VisualObject {
  id: string;
  name: string;
  category: string;
  symbolism: string;
  tags: string[];
}

async function loadVisualDataPool(character: Agent2Output['character']): Promise<VisualObject[]> {
  const visuals = await prisma.dataPoolVisual.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      weight: 'desc',
    },
  });

  return visuals.map((v) => ({
    id: v.id,
    name: v.name,
    category: v.category,
    symbolism: v.symbolism || '',
    tags: v.tags ? v.tags.split(',').map((t) => t.trim()) : [],
  }));
}

function selectObjects(
  visualPool: VisualObject[],
  archetype: string,
  needVisuals: NeedVisuals
): VisualObject[] {
  // Select 3-5 objects based on:
  // 1. Archetype match
  // 2. Dominant needs
  // 3. Variety (different categories)

  const selected: VisualObject[] = [];
  const usedCategories = new Set<string>();

  // Filter by relevance
  const relevantObjects = visualPool.filter((obj) => {
    // Check if tags match archetype or dominant needs
    const matchesArchetype = obj.tags.some((tag) =>
      archetype.toLowerCase().includes(tag.toLowerCase())
    );
    const matchesNeeds = obj.tags.some((tag) =>
      needVisuals.dominantNeeds.some((need) =>
        tag.toLowerCase().includes(need.toLowerCase())
      )
    );
    return matchesArchetype || matchesNeeds;
  });

  // If no relevant objects found, use top weighted ones
  const candidateObjects = relevantObjects.length > 0 ? relevantObjects : visualPool;

  // Select diverse objects
  for (const obj of candidateObjects) {
    if (selected.length >= 5) break;
    if (!usedCategories.has(obj.category)) {
      selected.push(obj);
      usedCategories.add(obj.category);
    }
  }

  // Fill remaining slots if needed
  if (selected.length < 3) {
    for (const obj of candidateObjects) {
      if (selected.length >= 3) break;
      if (!selected.find((s) => s.id === obj.id)) {
        selected.push(obj);
      }
    }
  }

  return selected;
}

// ============================================================================
// TRAUMA MAPPING
// ============================================================================

interface TraumaVisuals {
  protective: string[];
  defensive: string[];
  vulnerability: string[];
}

function mapTraumaToVisuals(trauma: string): TraumaVisuals {
  const traumaLower = trauma.toLowerCase();

  const protective: string[] = [];
  const defensive: string[] = [];
  const vulnerability: string[] = [];

  // Analyze trauma text for keywords
  if (traumaLower.includes('버림') || traumaLower.includes('거절')) {
    protective.push('warm blankets', 'cozy nooks');
    defensive.push('closed doors', 'boundaries');
    vulnerability.push('open windows', 'inviting spaces');
  }

  if (traumaLower.includes('무시') || traumaLower.includes('인정')) {
    protective.push('personal achievements display', 'recognition symbols');
    defensive.push('personal space markers');
  }

  if (traumaLower.includes('통제') || traumaLower.includes('자율')) {
    protective.push('personal choice indicators', 'freedom symbols');
    defensive.push('clear personal boundaries');
  }

  if (traumaLower.includes('실패') || traumaLower.includes('성장')) {
    protective.push('growth plants', 'learning materials');
    defensive.push('safety nets', 'stable foundations');
  }

  return { protective, defensive, vulnerability };
}

// ============================================================================
// PROMPT ASSEMBLY
// ============================================================================

interface PromptComponents {
  needVisuals: NeedVisuals;
  traumaVisuals: TraumaVisuals;
  objects: VisualObject[];
  characterName: string;
  personality: string;
}

function assembleImagePrompt(components: PromptComponents): string {
  const { needVisuals, traumaVisuals, objects, characterName, personality } = components;

  // Build structured prompt
  let prompt = `Create a pixel art illustration of a cozy personal room that reflects the essence of ${characterName}.\n\n`;

  // Style
  prompt += `**Style**: 16-bit pixel art, isometric view, detailed but clean, warm and inviting aesthetic.\n\n`;

  // Color palette
  prompt += `**Color Palette**: ${needVisuals.colors.join(', ')}. Use these colors to create a harmonious and emotionally resonant space.\n\n`;

  // Mood and atmosphere
  prompt += `**Mood**: ${needVisuals.mood}. The overall atmosphere should feel ${personality.split('.')[0].toLowerCase()}.\n\n`;

  // Lighting
  prompt += `**Lighting**: ${needVisuals.lighting}.\n\n`;

  // Space composition
  prompt += `**Space**: ${needVisuals.space}.\n\n`;

  // Objects and elements
  prompt += `**Key Objects**:\n`;
  for (const obj of objects) {
    prompt += `- ${obj.name}: ${obj.symbolism}\n`;
  }
  prompt += `\n`;

  // Protective/Defensive elements (from trauma)
  if (traumaVisuals.protective.length > 0 || traumaVisuals.defensive.length > 0) {
    prompt += `**Symbolic Elements**:\n`;
    if (traumaVisuals.protective.length > 0) {
      prompt += `- Protective: ${traumaVisuals.protective.join(', ')}\n`;
    }
    if (traumaVisuals.defensive.length > 0) {
      prompt += `- Boundaries: ${traumaVisuals.defensive.join(', ')}\n`;
    }
    prompt += `\n`;
  }

  // Details and finishing touches
  prompt += `**Details**: Include small personal touches like books, photos, plants, or decorative items that suggest someone lives here and cares about their space. The room should feel lived-in but organized according to their personality.\n\n`;

  // Technical requirements
  prompt += `**Technical**: High resolution pixel art, clean lines, no text or labels, suitable for a profile or character representation.`;

  return prompt;
}

// ============================================================================
// REASONING
// ============================================================================

function generateReasoning(
  input: Agent4Input,
  visualElements: Agent4Output['visualElements']
): string {
  const topNeeds = input.needVectors
    .filter((n) => n.actual > 0.5)
    .sort((a, b) => b.actual - a.actual)
    .slice(0, 3);

  let reasoning = `Image prompt reasoning for ${input.character.name}:\n\n`;

  reasoning += `**Dominant Needs**:\n`;
  for (const need of topNeeds) {
    reasoning += `- ${need.need} (${(need.actual * 100).toFixed(0)}%): Reflected through ${visualElements.colors.join(', ')} colors and ${visualElements.mood} atmosphere.\n`;
  }

  reasoning += `\n**Archetype**: ${input.character.archetype} - Selected objects (${visualElements.objects.join(', ')}) align with this archetype.\n`;

  reasoning += `\n**Trauma Integration**: Visual elements incorporate protective and defensive symbolism based on "${input.character.traumaAndLearning.substring(0, 50)}..."\n`;

  reasoning += `\n**Overall Visual Strategy**: Using ${visualElements.lighting} and ${visualElements.space} to create a cohesive representation of the character's inner world.`;

  return reasoning;
}
