const fs = require('fs');
const path = require('path');

// Read the schemas file
const schemasPath = path.join(__dirname, 'apps/www/src/lib/ai/schemas.ts');
let content = fs.readFileSync(schemasPath, 'utf-8');

// Model delays based on our configuration
const modelDelays = {
  // OpenAI Models
  "gpt-4o-mini": 20,
  "gpt-4o": 15,
  "gpt-4.1": 12,
  "gpt-4.1-mini": 18,
  "gpt-4.1-nano": 25,
  "o3": 10,
  "o3-mini": 22,
  "o4-mini": 20,
  "gpt-3.5-turbo": 18,

  // Anthropic Models
  "claude-4-opus-20250514": 10,
  "claude-4-sonnet-20250514": 12,
  "claude-3-7-sonnet-20250219": 15,
  "claude-3-5-sonnet-20241022": 15,
  "claude-3-5-sonnet-20240620": 15,
  "claude-3-5-haiku-20241022": 22,
  "claude-3-haiku-20240307": 22,

  // Anthropic Thinking Models
  "claude-4-opus-20250514-thinking": 18,
  "claude-4-sonnet-20250514-thinking": 18,
  "claude-3-7-sonnet-20250219-thinking": 20,
  "claude-3-5-sonnet-20241022-thinking": 20,
  "claude-3-5-sonnet-20240620-thinking": 20,
  "claude-3-5-haiku-20241022-thinking": 25,

  // Legacy Models
  "claude-sonnet-4-20250514": 12,
  "claude-sonnet-4-20250514-thinking": 18,

  // OpenRouter Models
  "x-ai/grok-3-mini-beta": 20,
  "x-ai/grok-3-beta": 10,
  "google/gemini-2.5-flash-preview": 15,
  "google/gemini-2.5-pro-preview": 10,
  "google/gemini-pro-1.5": 12,
  "meta-llama/llama-3.3-70b-instruct": 12,
  "anthropic/claude-3.5-sonnet": 15,
  "openai/gpt-4o": 15,
  "mistralai/mistral-large": 12,
};

// Function to add streamingDelay to a model definition
function addStreamingDelay(modelDef, modelId) {
  const delay = modelDelays[modelId];
  if (!delay) return modelDef;

  // Check if streamingDelay already exists
  if (modelDef.includes('streamingDelay:')) return modelDef;

  // Find where to insert streamingDelay (before the closing })
  const lines = modelDef.split('\n');
  const lastLine = lines[lines.length - 1];
  
  // Insert streamingDelay before the last line
  lines.splice(lines.length - 1, 0, `\t\tstreamingDelay: ${delay},`);
  
  return lines.join('\n');
}

// Process each model definition
Object.keys(modelDelays).forEach(modelId => {
  // Create regex to find the model definition
  const regex = new RegExp(`"${modelId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}": ModelConfigSchema\\.parse\\({[^}]+}\\)`, 'gs');
  
  content = content.replace(regex, (match) => {
    return addStreamingDelay(match, modelId);
  });
});

// Write the updated content back
fs.writeFileSync(schemasPath, content);

console.log('Updated all model definitions with streamingDelay values');