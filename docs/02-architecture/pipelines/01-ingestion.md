Document Ingestion

Goal: Extract clean text from 6 PDFs with metadata

Input: 6 PDFs (2 products × 3 document types)
Components:

PDF Loader: Handles file reading and basic validation
Text Extractor: Primary extraction from PDF text layer
OCR Engine: Fallback for scanned/image-based PDFs
Text Cleaner: Removes artifacts, normalizes formatting
Metadata Tagger: Assigns product_name, doc_type, page_number, source_file

Output: Structured documents with clean text + metadata