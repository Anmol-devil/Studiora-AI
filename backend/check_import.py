import sys
import traceback

try:
    import main
    print("SUCCESS: import main worked fine")
except Exception as e:
    print("ERROR:", type(e).__name__, str(e), file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
