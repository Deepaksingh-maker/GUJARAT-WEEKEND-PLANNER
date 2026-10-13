import sys
from pathlib import Path

# Add project root to sys.path so 'backend' package is always resolvable
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

import uvicorn

if __name__ == "__main__":
    print("[INFO] Starting Gujarat Weekend Backend API Server on http://127.0.0.1:8000 ...")
    backend_dir = str(Path(__file__).resolve().parent)
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True, reload_dirs=[backend_dir])
