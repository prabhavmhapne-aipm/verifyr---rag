import os
from dotenv import load_dotenv
from langfuse import Langfuse

# Load environment variables
load_dotenv()

# Initialize Langfuse
langfuse = Langfuse(
    host=os.getenv("LANGFUSE_HOST"),
    public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
    secret_key=os.getenv("LANGFUSE_SECRET_KEY")
)

print("Langfuse client created successfully!")
print(f"Available methods: {[m for m in dir(langfuse) if not m.startswith('_')]}")

# Try to create a trace
try:
    trace = langfuse.trace(name="test_trace", input={"test": "data"})
    print(f"\n✅ Trace created successfully: {type(trace)}")
except Exception as e:
    print(f"\n❌ Error creating trace: {e}")
    print("\nTrying alternative methods...")

    # Try get_trace_url or other methods
    if hasattr(langfuse, 'get_trace_url'):
        print("  - has get_trace_url")
    if hasattr(langfuse, 'create_trace'):
        print("  - has create_trace")
    if hasattr(langfuse, 'flush'):
        print("  - has flush")
