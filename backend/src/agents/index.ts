/**
 * Agents Module
 *
 * Central export for all agent-related functionality.
 */

// Agent 1: Need Vector Analysis
export {
  executeAgent1,
  type Agent1Input,
  type Agent1Output,
  type CompleteNeedVector,
} from './agent1-need-vector';

// Agent 2: Character Profile Generation
export {
  executeAgent2,
  type Agent2Input,
  type Agent2Output,
  type CharacterProfile,
} from './agent2-character-profile';

// Agent 3: System Prompt Assembly
export {
  executeAgent3,
  type Agent3Input,
  type Agent3Output,
} from './agent3-prompt-assembly';

// Agent 4: Image Prompt Generation
export {
  executeAgent4,
  type Agent4Input,
  type Agent4Output,
} from './agent4-image-prompt';

// Agent 5: Image Generation with Fallback
export {
  executeAgent5,
  type Agent5Input,
  type Agent5Output,
  getAllPresets,
  getPresetById,
} from './agent5-image-generation';

// Pipeline Orchestrator
export {
  executePipeline,
  getJobStatus,
  retryJob,
  getUserJobs,
  type PipelineInput,
  type PipelineOutput,
  type AgentStatus,
  type JobStatus,
} from './pipeline-orchestrator';
