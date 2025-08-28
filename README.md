## Drylab Tools - RosettaDiffusion2, ...

Spin up a minimal FastAPI backend and a Next.js frontend wired together, with RFdiffusion2 cloned into the backend image for future protein design workflows.

### One‑liner start

```bash
sh run.sh
```

I am adding more tools like Chai1, or Boltz2, ... for everyone access. But there are tons out there, might need your help.

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

### About integrated tools

`RFdiffusion2` (from RosettaCommons) is a diffusion‑based framework for protein design and enzyme engineering.
- Repo: `https://github.com/RosettaCommons/RFdiffusion2`
