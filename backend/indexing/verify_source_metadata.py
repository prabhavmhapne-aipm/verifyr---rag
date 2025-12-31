"""
Quick verification script to check if source_url and source_name are in Qdrant.
"""

import sys
from pathlib import Path
from qdrant_client import QdrantClient

# Set UTF-8 encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Initialize Qdrant client
project_root = Path(__file__).parent.parent.parent
qdrant_path = str(project_root / "data" / "qdrant_storage")

print("\n" + "="*60)
print("Verifying Source Metadata in Qdrant")
print("="*60)

try:
    client = QdrantClient(path=qdrant_path)

    # Get a few points to check metadata
    points = client.scroll(
        collection_name="product_docs",
        limit=3,
        with_payload=True,
        with_vectors=False
    )[0]

    print(f"\nRetrieved {len(points)} sample points from Qdrant\n")

    for i, point in enumerate(points, 1):
        print(f"Point #{i}:")
        print(f"  Chunk ID: {point.payload.get('chunk_id', 'N/A')}")
        print(f"  Product: {point.payload.get('product_name', 'N/A')}")
        print(f"  Doc Type: {point.payload.get('doc_type', 'N/A')}")
        print(f"  Page: {point.payload.get('page_num', 'N/A')}")
        print(f"  Source File: {point.payload.get('source_file', 'N/A')}")
        print(f"  Source URL: {point.payload.get('source_url', 'N/A')}")
        print(f"  Source Name: {point.payload.get('source_name', 'N/A')}")
        print(f"  Text Preview: {point.payload.get('text', '')[:80]}...")
        print()

    # Check if all points have source metadata
    all_points = client.scroll(
        collection_name="product_docs",
        limit=100,
        with_payload=True,
        with_vectors=False
    )[0]

    with_source_url = sum(1 for p in all_points if p.payload.get('source_url'))
    with_source_name = sum(1 for p in all_points if p.payload.get('source_name'))

    print("="*60)
    print(f"Metadata Statistics (from {len(all_points)} sample points):")
    print(f"  Points with source_url: {with_source_url}/{len(all_points)} ({with_source_url/len(all_points)*100:.1f}%)")
    print(f"  Points with source_name: {with_source_name}/{len(all_points)} ({with_source_name/len(all_points)*100:.1f}%)")
    print("="*60)

    if with_source_url > 0:
        print("\n✅ SUCCESS: Source metadata (URLs and names) found in Qdrant!")
    else:
        print("\n⚠️  WARNING: No source metadata found in sample")

    print()

except Exception as e:
    print(f"\n❌ Error: {e}\n")
