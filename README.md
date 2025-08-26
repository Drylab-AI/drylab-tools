## Drylab Tools – Dev Stack (Backend + Frontend)

Spin up a minimal FastAPI backend and a Next.js frontend wired together, with RFdiffusion2 cloned into the backend image for future protein design workflows.

### One‑liner start

```bash
sudo docker compose up
```

- Builds both services if needed and starts:
  - Backend on `http://localhost:8000`
  - Frontend on `http://localhost:3000`

Tip: First run or when you change Dockerfiles, use:

```bash
sudo docker compose up --build
```

### What you get

- Backend (FastAPI)
  - Serves simple job APIs (submit, list, details, logs, file tree, downloads)
  - Clones `RFdiffusion2` during image build for future integration
  - Default command: `uvicorn main:app --host 0.0.0.0 --port 8000`

- Frontend (Next.js)
  - UI to submit jobs, see results, preview PDB in Mol* viewer, view logs, and download outputs
  - Talks to backend via `BACKEND_URL` (compose sets this to `http://backend:8000`)

### Directory layout (key files)

```
drylab_tools/
  docker-compose.yml
  Dockerfile.backend
  Dockerfile.frontend
  main.py                  # FastAPI app (edit here to add tools/endpoints)
  drylab-tools-frontend/   # Next.js app (edit UI/APIs here)
```

The backend image clones `RFdiffusion2/` during build, so it will be present inside the backend container.

### Adding your own tools

1) Backend: add endpoints in `main.py`

```python
from fastapi import APIRouter

router = APIRouter()

@router.get("/my_tool")
def run_my_tool():
    return {"ok": True}

# Then include it in your app
# app.include_router(router)
```

2) Frontend: update API calls/UI

- Add or edit pages/components in `drylab-tools-frontend/app/...`
- Existing routes under `app/api/jobs/...` proxy to the backend. Follow the same pattern for new endpoints if needed.
- The frontend header allows overriding backend URL at runtime; otherwise it uses the compose‑injected `BACKEND_URL`.

Restart to pick up changes:

```bash
sudo docker compose up --build
```

### About RFdiffusion2

`RFdiffusion2` (from RosettaCommons) is a diffusion‑based framework for protein design and enzyme engineering.

- Repo: `https://github.com/RosettaCommons/RFdiffusion2`
- In this stack, the backend container clones the repository so you can wire its pipelines later (e.g., via Apptainer/Singularity). The provided FastAPI app demonstrates job orchestration, logs, file trees, and previews; you can replace the demo logic with real RFdiffusion2 invocations as you integrate.

### Useful commands

- Start/attach: `sudo docker compose up`
- Rebuild: `sudo docker compose up --build`
- Stop: `sudo docker compose down`

### Troubleshooting

- If you see apt/GPG errors during backend build, re‑run with `--build`. Network/mirror hiccups are the usual cause. You can also retry later or switch base mirrors if needed.


