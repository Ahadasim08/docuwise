"""
Seed the DocuWise demo with sample documents.

Usage:
    python scripts/seed.py --url http://localhost:8000 --email you@example.com --password yourpass

Requires: requests, supabase-py (pip install requests supabase)
"""
import argparse
import sys
from pathlib import Path

SAMPLES = Path(__file__).parent.parent / "samples"
SAMPLE_FILES = [
    SAMPLES / "engineering_handbook.pdf",
    SAMPLES / "product_overview.docx",
    SAMPLES / "company_handbook.csv",
    SAMPLES / "q3_financial_report.csv",
]

MIME = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".csv": "text/csv",
}


def get_token(supabase_url: str, email: str, password: str) -> str:
    try:
        from supabase import create_client
    except ImportError:
        print("ERROR: pip install supabase")
        sys.exit(1)

    # Extract project ref from URL for anon key hint
    import os
    anon_key = os.environ.get("VITE_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    if not anon_key:
        print("ERROR: set SUPABASE_ANON_KEY env var (the anon/public key, not service key)")
        sys.exit(1)

    client = create_client(supabase_url, anon_key)
    resp = client.auth.sign_in_with_password({"email": email, "password": password})
    return resp.session.access_token


def upload_file(api_url: str, token: str, path: Path) -> dict:
    import requests
    ext = path.suffix.lower()
    mime = MIME.get(ext, "application/octet-stream")
    with open(path, "rb") as f:
        r = requests.post(
            f"{api_url}/upload",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": (path.name, f, mime)},
            timeout=120,
        )
    r.raise_for_status()
    return r.json()


def poll_ready(api_url: str, token: str, doc_id: str, timeout: int = 120) -> bool:
    import requests, time
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = requests.get(
            f"{api_url}/documents/{doc_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        if r.ok:
            data = r.json()
            status = data.get("status", "processing")
            if status == "ready":
                return True
            if status == "error":
                print(f"  ERROR: {data.get('error_message')}")
                return False
        time.sleep(3)
    return False


def create_session(api_url: str, token: str, title: str) -> str:
    import requests
    r = requests.post(
        f"{api_url}/sessions",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"title": title},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["id"]


def attach_docs(api_url: str, token: str, session_id: str, doc_ids: list[str]):
    import requests
    r = requests.post(
        f"{api_url}/sessions/{session_id}/documents",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"document_ids": doc_ids},
        timeout=10,
    )
    r.raise_for_status()


def main():
    parser = argparse.ArgumentParser(description="Seed DocuWise with sample documents")
    parser.add_argument("--url", default="http://localhost:8000", help="Backend URL")
    parser.add_argument("--supabase-url", help="Supabase project URL (or set SUPABASE_URL env)")
    parser.add_argument("--email", required=True, help="Login email")
    parser.add_argument("--password", required=True, help="Login password")
    parser.add_argument("--session-title", default="Demo — Sample Documents", help="Session title")
    args = parser.parse_args()

    import os
    supabase_url = args.supabase_url or os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    if not supabase_url:
        print("ERROR: provide --supabase-url or set SUPABASE_URL env var")
        sys.exit(1)

    print(f"Authenticating {args.email}...")
    token = get_token(supabase_url, args.email, args.password)
    print("Authenticated.")

    # Upload all sample files
    doc_ids = []
    for path in SAMPLE_FILES:
        if not path.exists():
            print(f"  SKIP (not found): {path.name} — run scripts/make_samples.py first")
            continue
        print(f"  Uploading {path.name}...")
        doc = upload_file(args.url, token, path)
        doc_id = doc["id"]
        print(f"    Uploaded → {doc_id} (embedding in background...)")
        ready = poll_ready(args.url, token, doc_id)
        if ready:
            print(f"    Ready.")
            doc_ids.append(doc_id)
        else:
            print(f"    Timed out or error for {path.name}.")

    if not doc_ids:
        print("No documents uploaded successfully.")
        sys.exit(1)

    # Create a demo session and attach all docs
    print(f"\nCreating session: '{args.session_title}'...")
    session_id = create_session(args.url, token, args.session_title)
    attach_docs(args.url, token, session_id, doc_ids)
    print(f"Session {session_id} created with {len(doc_ids)} document(s).")
    print("\nSeed complete. Open the app and select the demo session to start querying.")


if __name__ == "__main__":
    main()
