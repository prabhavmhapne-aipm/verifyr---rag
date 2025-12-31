# Raw Product Documents

## Folder Structure

Place your product PDFs in the following structure:

```
raw/
├── product_a/
│   ├── manual.pdf
│   ├── specifications.pdf
│   └── review.pdf
└── product_b/
    ├── manual.pdf
    ├── specifications.pdf
    └── review.pdf
```

## Naming Conventions

### Folder Names
- Use lowercase with underscores: `product_a`, `product_b`
- Folder name will be used as the product identifier in metadata

### File Names
- **manual.pdf** - Product user manual or handbook
- **specifications.pdf** - Technical specifications document
- **review.pdf** - Product review or evaluation document

## Document Types
The system will automatically infer document type from filename:
- Files containing "manual" → doc_type: "manual"
- Files containing "specification" or "specs" → doc_type: "specifications"
- Files containing "review" → doc_type: "review"

## Requirements
- Total of 6 PDFs (3 per product)
- PDFs must be readable (not corrupted)
- PDFs should contain extractable text (not just scanned images, though OCR fallback is available)

## Next Steps
After placing your PDFs here:
1. Verify you have all 6 files in the correct folders
2. Proceed to Phase 1: PDF Text Extraction
