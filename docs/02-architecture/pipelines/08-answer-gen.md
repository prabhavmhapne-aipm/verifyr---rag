Answer Generation Pipeline
Input: User query + formatted context
Components:

Prompt Template Engine: Constructs system + user prompts
Instruction Injector: Adds task-specific guidelines (cite sources, compare objectively)
LLM Client: Calls Claude API
Response Parser: Extracts answer text
Citation Extractor: Identifies and structures source references

Output: Generated answer + structured source list