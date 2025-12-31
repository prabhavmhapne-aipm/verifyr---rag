"""
PDF Text Extraction Pipeline - Phase 1

Extracts text from all PDFs in data/raw/ and outputs structured JSON files.
Uses PyMuPDF for primary extraction with Tesseract OCR fallback.
"""

import os
import sys
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
import fitz  # PyMuPDF
from PIL import Image
import io

# Set UTF-8 encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

try:
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    print("Warning: pytesseract not available. OCR fallback disabled.")


class PDFProcessor:
    """Processes PDF documents and extracts text with metadata."""

    def __init__(self, raw_data_path: str = "data/raw", output_path: str = "data/processed"):
        """
        Initialize PDF processor.

        Args:
            raw_data_path: Path to raw PDF files (default: data/raw)
            output_path: Path to save processed JSON files (default: data/processed)
        """
        self.raw_data_path = Path(raw_data_path)
        self.output_path = Path(output_path)
        self.output_path.mkdir(parents=True, exist_ok=True)

        # Load sources metadata if available
        self.sources_metadata = self._load_sources_metadata()

        # Statistics
        self.stats = {
            "total_pdfs": 0,
            "total_pages": 0,
            "ocr_pages": 0,
            "failed_pages": 0
        }

    def _load_sources_metadata(self) -> Dict:
        """
        Load sources.json if it exists.
        
        Returns:
            Dictionary mapping product -> file -> source metadata
        """
        sources_file = self.raw_data_path / "sources.json"
        if sources_file.exists():
            try:
                with open(sources_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"⚠️  Warning: Could not load sources.json: {e}")
        return {}

    def _get_source_metadata(self, product_name: str, file_path: Path) -> Dict[str, Optional[str]]:
        """
        Get source URL metadata for a file.
        
        Args:
            product_name: Product identifier
            file_path: Path to the PDF file (relative to product folder)
            
        Returns:
            Dictionary with source_url and source_name (or None if not found)
        """
        product_sources = self.sources_metadata.get(product_name, {})
        
        # Try with relative path from product folder
        try:
            # Get relative path from product folder
            product_folder = self.raw_data_path / product_name
            relative_path = file_path.relative_to(product_folder)
            # Convert to forward slashes for JSON compatibility
            relative_path_str = str(relative_path).replace('\\', '/')
            
            if relative_path_str in product_sources:
                metadata = product_sources[relative_path_str]
                return {
                    "source_url": metadata.get("source_url"),
                    "source_name": metadata.get("source_name")
                }
        except (ValueError, KeyError):
            pass
        
        # Fallback: try just the filename
        filename = file_path.name
        if filename in product_sources:
            metadata = product_sources[filename]
            return {
                "source_url": metadata.get("source_url"),
                "source_name": metadata.get("source_name")
            }
        
        return {"source_url": None, "source_name": None}

    def _infer_doc_type(self, filename: str) -> str:
        """
        Infer document type from filename.

        Args:
            filename: PDF filename

        Returns:
            Document type (manual, specifications, review, or custom)
        """
        filename_lower = filename.lower()

        if "manual" in filename_lower:
            if "specification" in filename_lower or "spec" in filename_lower:
                return "specifications_manual"
            return "manual"
        elif "specification" in filename_lower or "spec" in filename_lower:
            return "specifications"
        elif "review" in filename_lower:
            return "review"
        else:
            # Return filename without extension as doc type
            return Path(filename).stem

    def _ocr_page(self, page) -> str:
        """
        Perform OCR on a PDF page using Tesseract.

        Args:
            page: PyMuPDF page object

        Returns:
            Extracted text from OCR
        """
        if not OCR_AVAILABLE:
            return ""

        try:
            # Render page to image
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for better OCR
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))

            # Perform OCR (German + English fallback for multilingual documents)
            try:
                text = pytesseract.image_to_string(img, lang='deu+eng')
            except Exception as lang_error:
                # Fallback to German only if multi-language fails
                try:
                    text = pytesseract.image_to_string(img, lang='deu')
                except Exception:
                    # Final fallback to English if German language pack not installed
                    text = pytesseract.image_to_string(img, lang='eng')
            self.stats["ocr_pages"] += 1

            return text
        except Exception as e:
            print(f"    ⚠️  OCR failed: {e}")
            self.stats["failed_pages"] += 1
            return ""

    def extract_text_from_pdf(self, pdf_path: Path, product_name: str) -> List[Dict[str, Any]]:
        """
        Extract text and metadata from a single PDF file.

        Args:
            pdf_path: Path to PDF file
            product_name: Name of the product (from folder name)

        Returns:
            List of page dictionaries with text and metadata
        """
        doc_type = self._infer_doc_type(pdf_path.name)
        pages_data = []

        try:
            doc = fitz.open(pdf_path)
            print(f"  📄 {pdf_path.name} ({len(doc)} pages) - type: {doc_type}")

            for page_num in range(len(doc)):
                page = doc[page_num]

                # Extract text
                text = page.get_text()

                # Check if text extraction was successful
                # If less than 50 chars, likely a scanned page - try OCR
                if len(text.strip()) < 50:
                    print(f"    🔍 Page {page_num + 1}: Low text content, trying OCR...")
                    ocr_text = self._ocr_page(page)
                    if len(ocr_text.strip()) > len(text.strip()):
                        text = ocr_text

                # Skip completely empty pages
                if len(text.strip()) == 0:
                    print(f"    ⚠️  Page {page_num + 1}: No text found (skipping)")
                    continue

                # Get source URL metadata
                source_metadata = self._get_source_metadata(product_name, pdf_path)

                # Create page metadata
                page_data = {
                    "product_name": product_name,
                    "doc_type": doc_type,
                    "page_num": page_num + 1,  # 1-indexed for humans
                    "source_file": pdf_path.name,
                    "source_url": source_metadata.get("source_url"),
                    "source_name": source_metadata.get("source_name"),
                    "text": text.strip()
                }

                pages_data.append(page_data)
                self.stats["total_pages"] += 1

            doc.close()

        except Exception as e:
            print(f"  ❌ Error processing {pdf_path.name}: {e}")

        return pages_data

    def process_directory(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Process all PDFs in the raw data directory.

        Scans data/raw/ for product folders and processes all PDFs found.

        Returns:
            Dictionary mapping output filenames to extracted page data
        """
        all_documents = {}

        # Find all product folders
        product_folders = [f for f in self.raw_data_path.iterdir() if f.is_dir()]

        if not product_folders:
            print(f"⚠️  No product folders found in {self.raw_data_path}")
            return all_documents

        print(f"\n🔍 Found {len(product_folders)} product folder(s)")
        print("=" * 60)

        for product_folder in sorted(product_folders):
            product_name = product_folder.name
            print(f"\n📦 Processing: {product_name}")

            # Find all PDFs in this product folder (including subdirectories like reviews/)
            pdf_files = list(product_folder.rglob("*.pdf"))

            if not pdf_files:
                print(f"  ⚠️  No PDF files found")
                continue

            # Process each PDF
            for pdf_file in sorted(pdf_files):
                pages_data = self.extract_text_from_pdf(pdf_file, product_name)

                if pages_data:
                    # Create output filename: {product}_{doctype}.json
                    doc_type = self._infer_doc_type(pdf_file.name)
                    
                    # For multiple files of same type (e.g., multiple reviews), 
                    # use the filename stem to differentiate
                    # But if there's only one review, just use "review"
                    output_filename = f"{product_name}_{doc_type}.json"
                    
                    # If output filename already exists (multiple reviews), add filename stem
                    if output_filename in all_documents:
                        filename_stem = pdf_file.stem  # filename without extension
                        output_filename = f"{product_name}_{doc_type}_{filename_stem}.json"
                    
                    all_documents[output_filename] = pages_data
                    self.stats["total_pdfs"] += 1

        return all_documents

    def save_documents(self, documents: Dict[str, List[Dict[str, Any]]]):
        """
        Save extracted documents to JSON files.

        Args:
            documents: Dictionary of output filename -> page data
        """
        print("\n" + "=" * 60)
        print("💾 Saving extracted documents...")
        print("=" * 60)

        for filename, pages_data in documents.items():
            output_file = self.output_path / filename

            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(pages_data, f, indent=2, ensure_ascii=False)

            total_pages = len(pages_data)
            print(f"  ✅ {filename} ({total_pages} pages)")

        print(f"\n📊 Output directory: {self.output_path.absolute()}")

    def print_statistics(self):
        """Print processing statistics."""
        print("\n" + "=" * 60)
        print("📈 PROCESSING STATISTICS")
        print("=" * 60)
        print(f"  Total PDFs processed: {self.stats['total_pdfs']}")
        print(f"  Total pages extracted: {self.stats['total_pages']}")
        print(f"  Pages processed with OCR: {self.stats['ocr_pages']}")
        print(f"  Failed pages: {self.stats['failed_pages']}")
        print("=" * 60)


def main():
    """Main execution function."""
    print("\n" + "=" * 60)
    print("🚀 PHASE 1: PDF TEXT EXTRACTION")
    print("=" * 60)

    # Initialize processor
    processor = PDFProcessor()

    # Process all PDFs
    documents = processor.process_directory()

    if not documents:
        print("\n❌ No documents were processed!")
        return

    # Save to JSON files
    processor.save_documents(documents)

    # Print statistics
    processor.print_statistics()

    print("\n✅ Phase 1 complete! Check data/processed/ for output files.\n")


if __name__ == "__main__":
    main()
