#!/usr/bin/env python3
import os
import sys
import urllib.request
import shutil

# ANSI color codes
class Colors:
    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    RESET = "\033[0m"

BASE_URL = "https://files.ipd.uw.edu/pub/rfdiffusion2/"
BASE_FS = "/net/lab/pub/rfdiffusion2/"

# Explicit files whose dest name/path differs from URL or that aren't in the weights pattern
FILES = [
    # {
    #     "url": BASE_URL + "sifs/rfdiffusion.sif",
    #     "dest": os.path.join("rf_diffusion", "exec", "bakerlab_rf_diffusion_aa.sif"),
    # },
    # {
    #     "url": BASE_URL + "sifs/mlfold.sif",
    #     "dest": os.path.join("rf_diffusion", "exec", "mlfold.sif"),
    # },
    # {
    #     "url": BASE_URL + "sifs/chai.sif",
    #     "dest": os.path.join("rf_diffusion", "exec", "chai.sif"),
    # },
]

# Minimal specification for weights/third-party weights:
# Just list their RELATIVE paths under the base (everything after .../pub/rfdiffusion2/)
WEIGHTS = [
    "model_weights/RFD_173.pt",
    # "model_weights/RFD_140.pt",
    # "third_party_model_weights/ligand_mpnn/s25_r010_t300_p.pt",
    # "third_party_model_weights/ligand_mpnn/s_300756.pt",
]

# Expand WEIGHTS into full FILES entries (same format as your current FILES)
for rel in WEIGHTS:
    FILES.append({
        "url": BASE_URL + rel,
        "dest": os.path.join("rf_diffusion", *rel.split("/")),
    })

ARGS = set(sys.argv[1:])
OVERWRITE = "overwrite" in ARGS
COPY_WITHIN_DIGS = "copy_within_digs" in ARGS

def ensure_dest_ready(dest):
    dest_dir = os.path.dirname(dest)
    os.makedirs(dest_dir, exist_ok=True)

    if os.path.islink(dest):
        print(f"{Colors.YELLOW}⚠ Removing existing symlink:{Colors.RESET} {dest}")
        os.remove(dest)
    elif os.path.isfile(dest) and not OVERWRITE:
        print(f"{Colors.CYAN}✔ File exists, skipping:{Colors.RESET} {dest} "
              f"(use '{Colors.BOLD}overwrite{Colors.RESET}' to replace)")
        return False
    return True

def rel_from_url(url: str) -> str:
    """Return path relative to BASE_URL given a full URL."""
    if not url.startswith(BASE_URL):
        # Fallback: try to treat it as already-relative (shouldn't happen here)
        return url
    return url[len(BASE_URL):]

def copy_file_within_digs(url, dest):
    rel = rel_from_url(url)
    src = os.path.join(BASE_FS, *rel.split("/"))
    if not os.path.isfile(src):
        print(f"{Colors.RED}✖ Source not found:{Colors.RESET} {src}")
        return
    print(f"{Colors.BLUE}⇢ Copying (within digs):{Colors.RESET} {src}")
    print(f"{Colors.BLUE}→ To:{Colors.RESET} {dest}")
    shutil.copy2(src, dest)
    print(f"{Colors.GREEN}✓ Copy complete:{Colors.RESET} {dest}\n")

def download_file(url, dest):
    print(f"{Colors.BLUE}⇣ Downloading:{Colors.RESET} {url}")
    print(f"{Colors.BLUE}→ To:{Colors.RESET} {dest}")

    def reporthook(block_num, block_size, total_size):
        downloaded = block_num * block_size
        if total_size > 0:
            percent = min(100, downloaded * 100 / total_size)
            bar_len = 30
            filled = int(bar_len * percent / 100)
            bar = "█" * filled + "-" * (bar_len - filled)
            sys.stdout.write(
                f"\r{Colors.CYAN}[{bar}] {percent:5.1f}% "
                f"({downloaded/1024/1024:.2f}/{total_size/1024/1024:.2f} MiB){Colors.RESET}"
            )
        else:
            sys.stdout.write(
                f"\r{Colors.CYAN}{downloaded/1024/1024:.2f} MiB downloaded (size unknown){Colors.RESET}"
            )
        sys.stdout.flush()

    urllib.request.urlretrieve(url, dest, reporthook)
    sys.stdout.write("\n")
    print(f"{Colors.GREEN}✓ Download complete:{Colors.RESET} {dest}\n")

def transfer_file(url, dest):
    if not ensure_dest_ready(dest):
        return
    try:
        if COPY_WITHIN_DIGS:
            copy_file_within_digs(url, dest)
        else:
            download_file(url, dest)
    except Exception as e:
        print(f"{Colors.RED}✖ Error:{Colors.RESET} {e}")

def main():
    mode = "COPY (within digs)" if COPY_WITHIN_DIGS else "DOWNLOAD"
    print(f"{Colors.HEADER}{Colors.BOLD}=== Setting up RFDiffusion environment ==={Colors.RESET}")
    print(f"{Colors.BOLD}Mode:{Colors.RESET} {mode} {'(overwrite enabled)' if OVERWRITE else ''}\n")
    for f in FILES:
        transfer_file(f["url"], f["dest"])
    print(f"{Colors.GREEN}{Colors.BOLD}All files ready! 🎉{Colors.RESET}")

if __name__ == "__main__":
    main()
