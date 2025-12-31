Context Assembly Pipeline
Input: Retrieved chunks + metadata
Components:

Context Formatter: Structures chunks for LLM consumption
Source Annotator: Adds citation markers to each chunk
Context Compressor: Removes redundancy if needed
Token Counter: Ensures context fits within LLM limits

Output: Formatted context string with source references