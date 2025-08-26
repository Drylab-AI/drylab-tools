from fastapi import FastAPI, Query, BackgroundTasks, Request, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict
import asyncio
import os
import subprocess
import tempfile
import shutil
import time
import logging
import requests
import pathlib
import json
import sys

app = FastAPI()

class ActiveSiteBlock(BaseModel):
    residue: str
    atoms: str


class JobRequest(BaseModel):
    job_name: str
    job_type: str
    ligand: str
    pdb_data: str
    contigs: str
    active_site_atoms: List[ActiveSiteBlock]

JOBS: Dict[str, Dict] = {}

@app.post("/jobs")
async def create_job(req: JobRequest, background_tasks: BackgroundTasks):
    # Pretend to queue a job and return an id
    jid = f"job-{len(JOBS)+1:03d}"
    JOBS[jid] = {
        "id": jid, 
        "status": "running", 
        "name": req.job_name or req.job_type, 
        "pdb_data": req.pdb_data, 
        "ligand": req.ligand, 
        "contigs": req.contigs, 
        "active_site_atoms": req.active_site_atoms,
        "job_type": req.job_type,
        "created_at": time.time()
    }
    # Simulate work asynchronously (background task)
    background_tasks.add_task(simulate_job, jid)
    return {"id": jid, "status": JOBS[jid]["status"]}


@app.get("/getting_jobs")
async def getting_jobs():
    print('returning jobs')
    print(JOBS)
    return {"jobs": list(JOBS.values())}

@app.get("/jobs/{job_id}")
async def get_job(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    result = dict(job)
    return result

# Helpers and additional job endpoints
def _ensure_in_outdir(job_outdir: str, candidate_path: str) -> str:
    root = pathlib.Path(job_outdir).resolve()
    full = (root / candidate_path).resolve()
    if not str(full).startswith(str(root)):
        raise HTTPException(status_code=400, detail="Invalid path")
    return str(full)

def _build_tree(root_dir: str, rel_dir: str = "", depth: int = 4, entries_limit: int = 500):
    base_path = pathlib.Path(root_dir) / rel_dir
    try:
        items = []
        count = 0
        for entry in sorted(base_path.iterdir(), key=lambda p: (p.is_file(), p.name.lower())):
            count += 1
            if count > entries_limit:
                break
            rel_path = str(pathlib.Path(rel_dir) / entry.name)
            if entry.is_dir():
                node = {"name": entry.name, "path": rel_path, "type": "dir"}
                if depth > 0:
                    node["children"] = _build_tree(root_dir, rel_path, depth - 1, entries_limit)
                items.append(node)
            else:
                try:
                    size = entry.stat().st_size
                except Exception:
                    size = None
                items.append({"name": entry.name, "path": rel_path, "type": "file", "size": size})
        return items
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Directory not found")

@app.get("/jobs/{job_id}/tree")
async def get_job_tree(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    outdir = job.get("outdir")
    if not outdir:
        raise HTTPException(status_code=404, detail="No output directory for job")
    tree = _build_tree(outdir, rel_dir="", depth=4)
    return {"root": outdir, "tree": tree}

@app.get("/jobs/{job_id}/file")
async def get_job_file(job_id: str, path: str = Query(..., description="Relative path inside job outdir")):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    outdir = job.get("outdir")
    if not outdir:
        raise HTTPException(status_code=404, detail="No output directory for job")
    full_path = _ensure_in_outdir(outdir, path)
    p = pathlib.Path(full_path)
    if not p.exists() or not p.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    try:
        # Limit read to 5 MB to avoid huge responses
        max_bytes = 5 * 1024 * 1024
        content = p.read_bytes()
        if len(content) > max_bytes:
            content = content[:max_bytes]
        # Try decode as utf-8; if fails, fallback to latin-1
        try:
            text = content.decode('utf-8')
        except UnicodeDecodeError:
            text = content.decode('latin-1', errors='replace')
        return {"path": path, "size": p.stat().st_size, "content": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {e}")

@app.get("/jobs/{job_id}/download")
async def download_job_path(job_id: str, background_tasks: BackgroundTasks, path: str | None = Query(None, description="Relative path inside job outdir. If omitted, downloads entire outdir as zip")):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    outdir = job.get("outdir")
    if not outdir:
        raise HTTPException(status_code=404, detail="No output directory for job")
    if not path:
        tmpdir = tempfile.mkdtemp(prefix=f"{job_id}_zip_")
        base_name = os.path.join(tmpdir, job_id)
        zip_path = shutil.make_archive(base_name, 'zip', root_dir=outdir, base_dir='.')
        def _cleanup():
            try:
                if os.path.exists(zip_path):
                    os.remove(zip_path)
                shutil.rmtree(tmpdir, ignore_errors=True)
            except Exception:
                pass
        background_tasks.add_task(_cleanup)
        return FileResponse(zip_path, media_type='application/zip', filename=f"{job_id}.zip")
    full_path = _ensure_in_outdir(outdir, path)
    p = pathlib.Path(full_path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Path not found")
    if p.is_dir():
        tmpdir = tempfile.mkdtemp(prefix=f"{job_id}_zip_")
        safe_name = p.name or 'folder'
        base_name = os.path.join(tmpdir, safe_name)
        zip_path = shutil.make_archive(base_name, 'zip', root_dir=str(p), base_dir='.')
        def _cleanup2():
            try:
                if os.path.exists(zip_path):
                    os.remove(zip_path)
                shutil.rmtree(tmpdir, ignore_errors=True)
            except Exception:
                pass
        background_tasks.add_task(_cleanup2)
        return FileResponse(zip_path, media_type='application/zip', filename=f"{safe_name}.zip")
    return FileResponse(str(p), filename=p.name)

async def simulate_job(jid: str):
    param = JOBS.get(jid)
    if not param:
        return

    JOBS[jid]["results"] = {"log": ""}
    pdb_data = param["pdb_data"]
    
    # dummy:
    with open("/home/clouduser/agentic-vl/RFdiffusion2/rf_diffusion/benchmark/input/mcsa_41/M0584_1ldm.pdb", "r") as f:
        pdb_data = f.read()
    
    try:
        workdir = tempfile.mkdtemp(prefix=f"{jid}_")
        pdb_path = os.path.join(workdir, "input.pdb")
        with open(pdb_path, "w") as f:
            f.write(pdb_data)

        items = []
        for blk in param["active_site_atoms"]:
            if isinstance(blk, dict):
                residue = blk.get("residue")
                atoms = blk.get("atoms")
            else:
                residue = blk.residue
                atoms = blk.atoms
            if residue and atoms:
                items.append((residue, atoms))

        dict_str = "{" + ",".join([f"'{k}':'{v}'" for k, v in items]) + "}"

        # Build args matching the open_source_demo.json quoting style
        # - inference.ligand=\'...\' (backslashed single quotes)
        # - contigmap.contigs=[\'...\'] (list with a single backslashed-quoted string)
        # - contigmap.contig_atoms="'{...}'" (double quotes wrapping a single-quoted dict)
        ligand_val = (param['ligand'] or "").replace("'", "\\'")
        contigs_val = (param['contigs'] or "")
        if contigs_val.startswith("'") and contigs_val.endswith("'"):
            contigs_val = contigs_val[1:-1]
        contigs_val = contigs_val.replace("'", "\\'")

        args = [
            f"inference.input_pdb={pdb_path}",
            f"inference.ligand=\\'{ligand_val}\\'",
            f"contigmap.contigs=[\\'{contigs_val}\\']",
        ]
        
        if "unindexed" in (param.get("job_type") or ""):
            args.append("inference.contig_as_guidepost=True")
        else:
            args.append("inference.contig_as_guidepost=False")

        dict_str = "{" + ",".join([f"\\'{k}\\':\\'{v}\\'" for k, v in items]) + "}"
        args.append(f"contigmap.contig_atoms=\"'{dict_str}'\"")

        bench_key = (param.get("job_type") or "job").strip() or "job"

        # Write benchmark JSON into rf_diffusion/benchmark/
        repo_root = os.path.abspath(os.path.dirname(__file__))
        bench_dir = os.path.join(repo_root, "rf_diffusion", "benchmark")
        cfg_dir = os.path.join(bench_dir, "configs")
        os.makedirs(bench_dir, exist_ok=True)
        os.makedirs(cfg_dir, exist_ok=True)

        bench_json_name = f"{jid}.json"
        bench_json_path = os.path.join(bench_dir, bench_json_name)
        with open(bench_json_path, "w") as jf:
            json.dump({bench_key: " ".join(args)}, jf)

        # Write a minimal YAML config into rf_diffusion/benchmark/configs/
        yaml_name = f"{jid}.yaml"
        yaml_path = os.path.join(cfg_dir, yaml_name)
        yaml_text = "\n".join([
            "defaults:",
            "  - enzyme_bench_n41",
            "  - _self_",
            "",
            "in_proc: True",
            "sweep:",
            "  retries: 2",
            "  command_args: >",
            "    --config-name=aa",
            "    inference.deterministic=True",
            "    inference.ckpt_path=REPO_ROOT/rf_diffusion/model_weights/RFD_173.pt",
            "    inference.seed_offset=43",
            "",
            "  num_per_condition: 1",
            "  num_per_job: 1",
            f"  benchmark_json: {bench_json_name}",
            "",
            "  slurm:",
            "    p: gpu-bf",
            "    gres: gpu:1",
            "",
            "stop_step: sweep",
            f"outdir: {workdir}",
            "",
        ])
        with open(yaml_path, "w") as yf:
            yf.write(yaml_text)

        env = os.environ.copy()
        env.setdefault("REPO_ROOT", repo_root)
        pipeline_path = "/home/clouduser/agentic-vl/RFdiffusion2/rf_diffusion/benchmark/pipeline.py"
        cmd = [
            "apptainer", "exec", "--nv",
            "/home/clouduser/agentic-vl/RFdiffusion2/rf_diffusion/exec/bakerlab_rf_diffusion_aa.sif",
            pipeline_path,
            f"--config-name={os.path.splitext(yaml_name)[0]}",
            f"sweep.benchmarks={bench_key}",
            "sweep.slurm.submit=True",
            "sweep.slurm.in_proc=True",
        ]

        logs_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "job_logs"))
        os.makedirs(logs_dir, exist_ok=True)
        log_file_path = os.path.join(logs_dir, f"{jid}.log")
        JOBS[jid]["log_file"] = log_file_path
        JOBS[jid]["outdir"] = workdir
        JOBS[jid]["cmd"] = " ".join(cmd)

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env=env,
            cwd=os.path.abspath(os.path.join(os.path.dirname(__file__))),
        )

        with open(log_file_path, "a", encoding="utf-8") as logf:
            while True:
                line = await proc.stdout.readline()
                if not line:
                    break
                decoded = line.decode(errors="ignore")
                JOBS[jid]["results"]["log"] += decoded
                logf.write(decoded)

        rc = await proc.wait()
        JOBS[jid]["status"] = "finished" if rc == 0 else "failed"

    except Exception as e:
        JOBS[jid]["results"]["log"] += f"\nERROR: {e}\n"
        JOBS[jid]["status"] = "failed"