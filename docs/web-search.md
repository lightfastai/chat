# Web Search Feature

This branch implements web search functionality using exa-js as an AI tool with manual user control.

## Key Features
- Manual web search toggle button next to model selector
- AI can search the web when explicitly enabled by user
- Real-time search results displayed inline with AI responses
- Source attribution with titles, URLs, and text snippets
- Error handling and graceful fallbacks
- Powered by Exa's meaning-based search with embeddings

## Usage
1. Click the Globe icon next to the model selector to enable web search
2. When enabled, the AI can search the web for current information when needed
3. Search results appear inline with AI responses showing titles, URLs, and text snippets
4. Toggle can be turned off to disable web search functionality

## Implementation Details
- Uses exa-js library for web search API calls
- Implemented as AI SDK v5 tool with conditional registration
- Backend Convex actions handle search, findSimilar, and getContents operations
- Frontend toggle state controls when web search tools are available to AI
