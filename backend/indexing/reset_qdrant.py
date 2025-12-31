"""
Helper script to reset Qdrant collection without deleting locked files.
"""

import sys
from qdrant_client import QdrantClient
from pathlib import Path

# Set UTF-8 encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Initialize Qdrant client
project_root = Path(__file__).parent.parent.parent
qdrant_path = str(project_root / "data" / "qdrant_storage")

print("\nResetting Qdrant collection...")
print(f"   Path: {qdrant_path}")

try:
    client = QdrantClient(path=qdrant_path)

    # Delete collection if it exists
    try:
        client.delete_collection("product_docs")
        print("   ✅ Deleted existing 'product_docs' collection")
    except Exception as e:
        error_msg = str(e).lower()
        if "not found" in error_msg or "does not exist" in error_msg:
            print("   ℹ️  Collection doesn't exist (nothing to delete)")
        else:
            print(f"   ⚠️  Couldn't delete collection: {e}")

    # Release client
    client = None
    print("\n✅ Qdrant reset complete. You can now run vector_store.py\n")

except Exception as e:
    error_msg = str(e).lower()
    if "already accessed" in error_msg or "locked" in error_msg or "database is locked" in error_msg:
        print(f"\n❌ ERROR: Qdrant database is locked!")
        print(f"   The database is currently being used by another process.")
        print(f"\n   Solutions:")
        print(f"   1. Stop the FastAPI server (if running):")
        print(f"      - Press Ctrl+C in the terminal running the server")
        print(f"      - Or kill the Python process using Task Manager")
        print(f"   2. Close any Jupyter notebooks or Python scripts using Qdrant")
        print(f"   3. Wait a few seconds after stopping processes")
        print(f"   4. Then try running this script again")
        print(f"\n   If the problem persists, you may need to restart your computer")
        print(f"   to release the file lock.\n")
    else:
        print(f"\n❌ Error: {e}\n")
        print("If you see a 'Storage folder already accessed' error,")
        print("please close any running FastAPI servers or Jupyter notebooks")
        print("that might be using the Qdrant database.\n")
