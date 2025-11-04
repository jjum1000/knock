/**
 * Agent 5: Image Generation with Fallback
 *
 * Attempts to generate pixel art using Gemini Imagen API.
 * Falls back to preset images if API fails or is disabled.
 */

import { prisma } from '../index';
import logger from '../utils/logger';
import { generateImage } from '../services/gemini';
import { Agent4Output } from './agent4-image-prompt';

// ============================================================================
// TYPES
// ============================================================================

export interface Agent5Input {
  imagePrompt: string;
  visualElements: Agent4Output['visualElements'];
  characterName: string;
  userId: string;
}

export interface Agent5Output {
  imageUrl: string;
  generationMethod: 'ai_generated' | 'preset_fallback';
  presetId?: string;
  metadata: {
    prompt: string;
    colors: string[];
    mood: string;
    timestamp: string;
  };
}

// ============================================================================
// FALLBACK PRESETS
// ============================================================================

interface ImagePreset {
  id: string;
  name: string;
  url: string;
  colors: string[];
  mood: string;
  tags: string[];
}

// Predefined pixel art room presets
const IMAGE_PRESETS: ImagePreset[] = [
  {
    id: 'cozy-developer',
    name: 'Cozy Developer Room',
    url: '/presets/cozy-developer.png',
    colors: ['warm browns', 'soft blue', 'tech green'],
    mood: 'focused, comfortable, tech-savvy',
    tags: ['developer', 'autonomy', 'growth', 'minimal'],
  },
  {
    id: 'creative-sanctuary',
    name: 'Creative Sanctuary',
    url: '/presets/creative-sanctuary.png',
    colors: ['warm orange', 'soft pink', 'gentle yellow'],
    mood: 'creative, expressive, inspiring',
    tags: ['creative', 'meaning', 'growth', 'colorful'],
  },
  {
    id: 'minimalist-zen',
    name: 'Minimalist Zen Space',
    url: '/presets/minimalist-zen.png',
    colors: ['cool grey', 'soft white', 'nature green'],
    mood: 'peaceful, organized, clear',
    tags: ['minimalist', 'survival', 'autonomy', 'clean'],
  },
  {
    id: 'gamer-den',
    name: 'Gamer Den',
    url: '/presets/gamer-den.png',
    colors: ['neon blue', 'electric purple', 'dark background'],
    mood: 'energetic, immersive, competitive',
    tags: ['gamer', 'recognition', 'belonging', 'tech'],
  },
  {
    id: 'bookworm-library',
    name: 'Bookworm Library',
    url: '/presets/bookworm-library.png',
    colors: ['warm wood', 'antique gold', 'paper cream'],
    mood: 'scholarly, contemplative, cozy',
    tags: ['scholar', 'growth', 'meaning', 'traditional'],
  },
  {
    id: 'plant-parent',
    name: 'Plant Parent Paradise',
    url: '/presets/plant-parent.png',
    colors: ['fresh green', 'earth brown', 'sky blue'],
    mood: 'nurturing, natural, growing',
    tags: ['nature', 'growth', 'belonging', 'organic'],
  },
  {
    id: 'social-butterfly',
    name: 'Social Hub',
    url: '/presets/social-butterfly.png',
    colors: ['bright yellow', 'warm orange', 'friendly pink'],
    mood: 'welcoming, connected, vibrant',
    tags: ['social', 'belonging', 'recognition', 'warm'],
  },
  {
    id: 'achiever-office',
    name: 'Achiever Office',
    url: '/presets/achiever-office.png',
    colors: ['confident red', 'gold accent', 'professional grey'],
    mood: 'accomplished, organized, driven',
    tags: ['achiever', 'recognition', 'growth', 'professional'],
  },
  {
    id: 'artist-studio',
    name: 'Artist Studio',
    url: '/presets/artist-studio.png',
    colors: ['rainbow palette', 'creative chaos', 'inspiring'],
    mood: 'expressive, free, passionate',
    tags: ['artist', 'autonomy', 'meaning', 'creative'],
  },
  {
    id: 'night-owl',
    name: 'Night Owl Lair',
    url: '/presets/night-owl.png',
    colors: ['deep blue', 'moonlight silver', 'star gold'],
    mood: 'quiet, introspective, nocturnal',
    tags: ['night', 'autonomy', 'meaning', 'dark'],
  },
];

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Execute Agent 5: Generate or select room image
 */
export async function executeAgent5(input: Agent5Input): Promise<Agent5Output> {
  const startTime = Date.now();

  logger.info('Agent 5: Starting image generation', {
    characterName: input.characterName,
    userId: input.userId,
  });

  try {
    // Check if AI generation is enabled
    const useAI = process.env.USE_AI_IMAGE_GENERATION === 'true';

    if (useAI) {
      // Attempt AI generation
      try {
        logger.info('Agent 5: Attempting Gemini Imagen generation');
        const imageUrl = await generateImage(input.imagePrompt);

        if (imageUrl && imageUrl !== 'MOCK_IMAGE_URL') {
          // Success: AI-generated image
          const duration = Date.now() - startTime;
          logger.info('Agent 5: AI image generated successfully', {
            duration,
            imageUrl,
          });

          return {
            imageUrl,
            generationMethod: 'ai_generated',
            metadata: {
              prompt: input.imagePrompt,
              colors: input.visualElements.colors,
              mood: input.visualElements.mood,
              timestamp: new Date().toISOString(),
            },
          };
        }
      } catch (error: any) {
        logger.warn('Agent 5: AI generation failed, falling back to presets', {
          error: error.message,
        });
        // Continue to fallback
      }
    } else {
      logger.info('Agent 5: AI generation disabled, using preset fallback');
    }

    // Fallback: Select best matching preset
    const preset = selectBestPreset(input.visualElements);

    const duration = Date.now() - startTime;
    logger.info('Agent 5: Preset image selected', {
      duration,
      presetId: preset.id,
      presetName: preset.name,
    });

    return {
      imageUrl: preset.url,
      generationMethod: 'preset_fallback',
      presetId: preset.id,
      metadata: {
        prompt: input.imagePrompt,
        colors: input.visualElements.colors,
        mood: input.visualElements.mood,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    logger.error('Agent 5: Execution failed', {
      error: error.message,
    });

    // Ultimate fallback: Return first preset
    return {
      imageUrl: IMAGE_PRESETS[0].url,
      generationMethod: 'preset_fallback',
      presetId: IMAGE_PRESETS[0].id,
      metadata: {
        prompt: input.imagePrompt,
        colors: input.visualElements.colors,
        mood: input.visualElements.mood,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// ============================================================================
// PRESET SELECTION
// ============================================================================

function selectBestPreset(visualElements: Agent4Output['visualElements']): ImagePreset {
  // Score each preset based on:
  // 1. Color match
  // 2. Mood match
  // 3. Object/tag match

  let bestPreset = IMAGE_PRESETS[0];
  let bestScore = 0;

  for (const preset of IMAGE_PRESETS) {
    let score = 0;

    // Color matching (40% weight)
    const colorMatches = countMatches(
      visualElements.colors.map((c) => c.toLowerCase()),
      preset.colors.map((c) => c.toLowerCase())
    );
    score += colorMatches * 4;

    // Mood matching (30% weight)
    const moodMatches = countWordOverlap(
      visualElements.mood.toLowerCase(),
      preset.mood.toLowerCase()
    );
    score += moodMatches * 3;

    // Object/tag matching (30% weight)
    const objectMatches = countMatches(
      visualElements.objects.map((o) => o.toLowerCase()),
      preset.tags
    );
    score += objectMatches * 3;

    if (score > bestScore) {
      bestScore = score;
      bestPreset = preset;
    }
  }

  logger.info('Agent 5: Preset selection', {
    selectedPreset: bestPreset.id,
    score: bestScore,
    colors: visualElements.colors,
    mood: visualElements.mood,
  });

  return bestPreset;
}

// ============================================================================
// MATCHING UTILITIES
// ============================================================================

function countMatches(arr1: string[], arr2: string[]): number {
  let count = 0;
  for (const item1 of arr1) {
    for (const item2 of arr2) {
      if (item1.includes(item2) || item2.includes(item1)) {
        count++;
      }
    }
  }
  return count;
}

function countWordOverlap(text1: string, text2: string): number {
  const words1 = text1.split(/\s+|,\s*/);
  const words2 = text2.split(/\s+|,\s*/);

  let count = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2 && word1.length > 3) {
        // Only count meaningful words
        count++;
      }
    }
  }
  return count;
}

// ============================================================================
// PUBLIC UTILITIES
// ============================================================================

/**
 * Get all available image presets (for admin/debug)
 */
export function getAllPresets(): ImagePreset[] {
  return IMAGE_PRESETS;
}

/**
 * Get a specific preset by ID
 */
export function getPresetById(presetId: string): ImagePreset | undefined {
  return IMAGE_PRESETS.find((p) => p.id === presetId);
}
