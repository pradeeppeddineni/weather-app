#!/usr/bin/env python3
"""App Store Connect + Codemagic automation for AgriPulse."""

import os, sys, json, time, argparse
import jwt, requests

# --- Config from env ---
ISSUER_ID = os.environ.get("ASC_ISSUER_ID")
KEY_ID = os.environ.get("ASC_KEY_ID")
KEY_PATH = os.environ.get("ASC_KEY_PATH")
CODEMAGIC_TOKEN = os.environ.get("CODEMAGIC_API_TOKEN")

APP_APPLE_ID = "6760972266"
BUNDLE_ID = "com.agripulse.app"
CODEMAGIC_APP_ID = "69c017336308871c8e239ccd"
CODEMAGIC_WORKFLOW = "agripulse-ios"

BASE = "https://api.appstoreconnect.apple.com/v1"


def asc_headers():
    """Generate JWT auth headers for App Store Connect API."""
    with open(KEY_PATH) as f:
        private_key = f.read()
    now = int(time.time())
    token = jwt.encode(
        {"iss": ISSUER_ID, "iat": now, "exp": now + 1200, "aud": "appstoreconnect-v1"},
        private_key,
        algorithm="ES256",
        headers={"kid": KEY_ID},
    )
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def asc_get(path, params=None):
    r = requests.get(f"{BASE}{path}", headers=asc_headers(), params=params)
    if not r.ok:
        print(f"GET {path} failed ({r.status_code}): {r.text[:500]}")
        sys.exit(1)
    return r.json()


def asc_post(path, data):
    r = requests.post(f"{BASE}{path}", headers=asc_headers(), json=data)
    if not r.ok:
        print(f"POST {path} failed ({r.status_code}): {r.text[:500]}")
        sys.exit(1)
    return r.json()


def asc_patch(path, data):
    r = requests.patch(f"{BASE}{path}", headers=asc_headers(), json=data)
    if not r.ok:
        print(f"PATCH {path} failed ({r.status_code}): {r.text[:500]}")
        sys.exit(1)
    if r.status_code == 204 or not r.text.strip():
        return {}
    return r.json()


# --- App Store Connect operations ---

def get_app_id():
    data = asc_get("/apps", {"filter[bundleId]": BUNDLE_ID})
    apps = data["data"]
    if not apps:
        print(f"No app found with bundle ID {BUNDLE_ID}")
        sys.exit(1)
    return apps[0]["id"]


def list_builds(app_id):
    data = asc_get("/builds", {
        "filter[app]": app_id,
        "sort": "-uploadedDate",
        "limit": 10,
        "fields[builds]": "version,processingState,uploadedDate,buildAudienceType",
    })
    builds = []
    for b in data["data"]:
        a = b["attributes"]
        builds.append({
            "id": b["id"],
            "version": a["version"],
            "state": a["processingState"],
            "date": a.get("uploadedDate", ""),
        })
    return builds


def create_version(app_id, version_string):
    data = asc_post("/appStoreVersions", {
        "data": {
            "type": "appStoreVersions",
            "attributes": {"platform": "IOS", "versionString": version_string},
            "relationships": {
                "app": {"data": {"type": "apps", "id": app_id}}
            },
        }
    })
    vid = data["data"]["id"]
    print(f"Created version {version_string} (id: {vid})")
    return vid


def set_whats_new(version_id, text):
    locs = asc_get(f"/appStoreVersions/{version_id}/appStoreVersionLocalizations")
    loc_id = None
    for loc in locs["data"]:
        if loc["attributes"]["locale"] == "en-US":
            loc_id = loc["id"]
            break
    if loc_id:
        asc_patch(f"/appStoreVersionLocalizations/{loc_id}", {
            "data": {
                "type": "appStoreVersionLocalizations",
                "id": loc_id,
                "attributes": {"whatsNew": text},
            }
        })
    else:
        asc_post("/appStoreVersionLocalizations", {
            "data": {
                "type": "appStoreVersionLocalizations",
                "attributes": {"locale": "en-US", "whatsNew": text},
                "relationships": {
                    "appStoreVersion": {"data": {"type": "appStoreVersions", "id": version_id}}
                },
            }
        })
    print(f"Set 'What's New' for version {version_id}")


def attach_build(version_id, build_id):
    asc_patch(f"/appStoreVersions/{version_id}/relationships/build", {
        "data": {"type": "builds", "id": build_id}
    })
    print(f"Attached build {build_id} to version {version_id}")


def submit_for_review(app_id, version_id):
    # Create review submission
    sub = asc_post("/reviewSubmissions", {
        "data": {
            "type": "reviewSubmissions",
            "attributes": {"platform": "IOS"},
            "relationships": {
                "app": {"data": {"type": "apps", "id": app_id}}
            },
        }
    })
    sub_id = sub["data"]["id"]

    # Add version as submission item
    asc_post("/reviewSubmissionItems", {
        "data": {
            "type": "reviewSubmissionItems",
            "relationships": {
                "reviewSubmission": {"data": {"type": "reviewSubmissions", "id": sub_id}},
                "appStoreVersion": {"data": {"type": "appStoreVersions", "id": version_id}},
            },
        }
    })

    # Submit
    asc_patch(f"/reviewSubmissions/{sub_id}", {
        "data": {
            "type": "reviewSubmissions",
            "id": sub_id,
            "attributes": {"submitted": True},
        }
    })
    print(f"Submitted version {version_id} for App Store review")


# --- TestFlight operations ---

def list_beta_groups(app_id):
    data = asc_get(f"/apps/{app_id}/betaGroups")
    groups = []
    for g in data["data"]:
        a = g["attributes"]
        groups.append({
            "id": g["id"],
            "name": a["name"],
            "internal": a.get("isInternalGroup", False),
        })
    return groups


def add_build_to_group(group_id, build_id):
    r = requests.post(
        f"{BASE}/betaGroups/{group_id}/relationships/builds",
        headers=asc_headers(),
        json={"data": [{"type": "builds", "id": build_id}]},
    )
    if not r.ok:
        print(f"Add to group failed ({r.status_code}): {r.text[:500]}")
        sys.exit(1)
    print(f"Added build {build_id} to beta group {group_id}")


def submit_beta_review(build_id):
    r = requests.post(
        f"{BASE}/betaAppReviewSubmissions",
        headers=asc_headers(),
        json={
            "data": {
                "type": "betaAppReviewSubmissions",
                "relationships": {
                    "build": {"data": {"type": "builds", "id": build_id}}
                },
            }
        },
    )
    if r.ok:
        print(f"Submitted build {build_id} for beta review")
    else:
        # May already be submitted or approved
        print(f"Beta review submit: {r.status_code} - {r.text[:200]}")


def set_beta_whats_new(build_id, text):
    locs = asc_get(f"/builds/{build_id}/betaBuildLocalizations")
    if locs["data"]:
        loc_id = locs["data"][0]["id"]
        asc_patch(f"/betaBuildLocalizations/{loc_id}", {
            "data": {
                "type": "betaBuildLocalizations",
                "id": loc_id,
                "attributes": {"whatsNew": text},
            }
        })
    else:
        asc_post("/betaBuildLocalizations", {
            "data": {
                "type": "betaBuildLocalizations",
                "attributes": {"locale": "en-US", "whatsNew": text},
                "relationships": {
                    "build": {"data": {"type": "builds", "id": build_id}}
                },
            }
        })
    print(f"Set beta 'What to Test' for build {build_id}")


# --- Codemagic operations ---

def trigger_build(branch="main"):
    r = requests.post(
        "https://api.codemagic.io/builds",
        headers={"Content-Type": "application/json", "x-auth-token": CODEMAGIC_TOKEN},
        json={"appId": CODEMAGIC_APP_ID, "workflowId": CODEMAGIC_WORKFLOW, "branch": branch},
    )
    if not r.ok:
        print(f"Codemagic trigger failed ({r.status_code}): {r.text[:300]}")
        sys.exit(1)
    build_id = r.json()["buildId"]
    print(f"Codemagic build triggered: {build_id}")
    return build_id


def check_build(build_id):
    r = requests.get(
        f"https://api.codemagic.io/builds/{build_id}",
        headers={"x-auth-token": CODEMAGIC_TOKEN},
    )
    b = r.json().get("build", r.json())
    status = b.get("status", "unknown")
    steps = []
    for s in b.get("buildActions", []):
        steps.append(f"  {'✓' if s['status']=='success' else '✗' if s['status']=='failed' else '⟳'} {s['name']}: {s['status']}")
    return status, steps


# --- CLI ---

def cmd_release(args):
    app_id = get_app_id()
    builds = list_builds(app_id)
    print("\nAvailable builds:")
    for b in builds:
        print(f"  Build {b['version']} ({b['state']}) - {b['date'][:10]}")

    if args.build:
        build = next((b for b in builds if b["version"] == args.build), None)
        if not build:
            print(f"Build {args.build} not found")
            sys.exit(1)
    else:
        build = builds[0]
        print(f"\nUsing latest build: {build['version']}")

    version_id = create_version(app_id, args.version)
    if args.whats_new:
        set_whats_new(version_id, args.whats_new)
    attach_build(version_id, build["id"])
    submit_for_review(app_id, version_id)
    print(f"\n✓ Version {args.version} submitted for App Store review")


def cmd_testflight(args):
    app_id = get_app_id()
    builds = list_builds(app_id)

    if args.build:
        build = next((b for b in builds if b["version"] == args.build), None)
        if not build:
            print(f"Build {args.build} not found")
            sys.exit(1)
    else:
        build = builds[0]

    print(f"Using build: {build['version']}")

    groups = list_beta_groups(app_id)
    int_groups = [g for g in groups if g["internal"]]
    ext_groups = [g for g in groups if not g["internal"]]

    if args.whats_new:
        set_beta_whats_new(build["id"], args.whats_new)

    # Internal testers get all builds automatically — no API call needed
    if int_groups:
        print(f"Internal testers ({', '.join(g['name'] for g in int_groups)}) — notified automatically")

    # Add to external groups
    if args.group:
        group = next((g for g in ext_groups if g["name"].lower() == args.group.lower()), None)
        if not group:
            print(f"Group '{args.group}' not found. Available: {[g['name'] for g in ext_groups]}")
            sys.exit(1)
        ext_groups = [group]

    for group in ext_groups:
        print(f"Adding to external group: {group['name']}")
        add_build_to_group(group["id"], build["id"])

    submit_beta_review(build["id"])
    group_names = [g['name'] for g in int_groups + ext_groups]
    print(f"\n✓ Build {build['version']} added to {group_names} and submitted for beta review")


def cmd_build(args):
    build_id = trigger_build(args.branch)
    if args.wait:
        print("Waiting for build to complete...")
        while True:
            time.sleep(30)
            status, steps = check_build(build_id)
            print(f"  Status: {status}")
            if status in ("finished", "failed"):
                for s in steps:
                    print(s)
                break
    return build_id


def cmd_build_status(args):
    status, steps = check_build(args.build_id)
    print(f"Status: {status}")
    for s in steps:
        print(s)


def cmd_list_builds(args):
    app_id = get_app_id()
    builds = list_builds(app_id)
    print("Recent builds:")
    for b in builds:
        print(f"  Build {b['version']:>3}  {b['state']:<10}  {b['date'][:10]}")


def cmd_full(args):
    """Full pipeline: set version, trigger Codemagic build, wait, then release + testflight."""
    print(f"=== Step 0: Set marketing version to {args.version} ===")
    import types
    ver_args = types.SimpleNamespace(version=args.version, commit=True, push=True)
    cmd_set_version(ver_args)

    print("\n=== Step 1: Trigger Codemagic build ===")
    cm_build_id = trigger_build(args.branch)

    print("\nWaiting for build to complete...")
    while True:
        time.sleep(30)
        status, steps = check_build(cm_build_id)
        print(f"  Status: {status}")
        if status == "finished":
            for s in steps:
                print(s)
            break
        if status == "failed":
            for s in steps:
                print(s)
            print("\n✗ Build failed. Aborting.")
            sys.exit(1)

    print("\n=== Step 2: Wait for build to appear in ASC ===")
    app_id = get_app_id()
    # Wait up to 5 min for build to appear
    for _ in range(10):
        builds = list_builds(app_id)
        valid = [b for b in builds if b["state"] == "VALID"]
        if valid:
            build = valid[0]
            print(f"Found build: {build['version']}")
            break
        print("  Waiting for build processing...")
        time.sleep(30)
    else:
        print("Build not found in ASC after waiting")
        sys.exit(1)

    print("\n=== Step 3: Create App Store version & submit ===")
    version_id = create_version(app_id, args.version)
    if args.whats_new:
        set_whats_new(version_id, args.whats_new)
    attach_build(version_id, build["id"])
    submit_for_review(app_id, version_id)

    print("\n=== Step 4: Add to TestFlight (internal + external) ===")
    groups = list_beta_groups(app_id)
    int_groups = [g for g in groups if g["internal"]]
    ext_groups = [g for g in groups if not g["internal"]]
    if args.whats_new:
        set_beta_whats_new(build["id"], args.whats_new)
    if int_groups:
        print(f"Internal testers ({', '.join(g['name'] for g in int_groups)}) — notified automatically")
    for group in ext_groups:
        print(f"Adding to external group: {group['name']}")
        add_build_to_group(group["id"], build["id"])
    if ext_groups:
        submit_beta_review(build["id"])

    print(f"\n✓ Full pipeline complete for version {args.version}")


def cmd_set_version(args):
    """Update MARKETING_VERSION in the Xcode project and optionally commit + push."""
    import re

    pbxproj = os.path.join("AgriPulse", "AgriPulse.xcodeproj", "project.pbxproj")
    if not os.path.exists(pbxproj):
        # Try from project root
        pbxproj = os.path.join("AgriPulse.xcodeproj", "project.pbxproj")
    if not os.path.exists(pbxproj):
        print(f"Cannot find project.pbxproj (tried AgriPulse/ and current dir)")
        sys.exit(1)

    with open(pbxproj, "r") as f:
        content = f.read()

    old_pattern = r'MARKETING_VERSION = [\d.]+;'
    matches = re.findall(old_pattern, content)
    if not matches:
        print("No MARKETING_VERSION found in pbxproj")
        sys.exit(1)

    old_version = matches[0].split("= ")[1].rstrip(";").strip()
    new_content = re.sub(old_pattern, f'MARKETING_VERSION = {args.version};', content)

    with open(pbxproj, "w") as f:
        f.write(new_content)

    count = len(matches)
    print(f"Updated MARKETING_VERSION: {old_version} → {args.version} ({count} occurrences)")

    if args.commit:
        os.system(f'cd "{os.path.dirname(pbxproj)}/.." && git add "{pbxproj}" && git commit -m "Bump marketing version to {args.version}"')
        if args.push:
            os.system(f'cd "{os.path.dirname(pbxproj)}/.." && git push origin main')
            print(f"Pushed version {args.version} to origin/main")


def main():
    # Validate env
    missing = []
    for var in ["ASC_ISSUER_ID", "ASC_KEY_ID", "ASC_KEY_PATH", "CODEMAGIC_API_TOKEN"]:
        if not os.environ.get(var):
            missing.append(var)
    if missing:
        print(f"Missing env vars: {', '.join(missing)}")
        print("Set them in .claude/settings.local.json or export them.")
        sys.exit(1)

    parser = argparse.ArgumentParser(description="AgriPulse App Store & Codemagic automation")
    sub = parser.add_subparsers(dest="command")

    # release
    p = sub.add_parser("release", help="Create version, attach build, submit for review")
    p.add_argument("--version", required=True, help="Version string (e.g., 1.2)")
    p.add_argument("--build", help="Build number (default: latest)")
    p.add_argument("--whats-new", help="What's New text")

    # testflight
    p = sub.add_parser("testflight", help="Add build to external TestFlight group")
    p.add_argument("--build", help="Build number (default: latest)")
    p.add_argument("--group", help="Group name (default: first external group)")
    p.add_argument("--whats-new", help="What to Test text")

    # build
    p = sub.add_parser("build", help="Trigger Codemagic build")
    p.add_argument("--branch", default="main", help="Branch to build")
    p.add_argument("--wait", action="store_true", help="Wait for completion")

    # build-status
    p = sub.add_parser("build-status", help="Check Codemagic build status")
    p.add_argument("build_id", help="Codemagic build ID")

    # list-builds
    sub.add_parser("list-builds", help="List recent TestFlight builds")

    # set-version
    p = sub.add_parser("set-version", help="Update MARKETING_VERSION in Xcode project")
    p.add_argument("version", help="Version string (e.g., 1.3)")
    p.add_argument("--commit", action="store_true", help="Git commit the change")
    p.add_argument("--push", action="store_true", help="Git push after commit (implies --commit)")

    # full pipeline
    p = sub.add_parser("full", help="Full pipeline: set version → build → release → testflight")
    p.add_argument("--version", required=True, help="Version string (e.g., 1.2)")
    p.add_argument("--branch", default="main", help="Branch to build")
    p.add_argument("--whats-new", help="Release notes / What to Test")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(0)

    # --push implies --commit
    if hasattr(args, 'push') and args.push:
        args.commit = True

    {"release": cmd_release, "testflight": cmd_testflight, "build": cmd_build,
     "build-status": cmd_build_status, "list-builds": cmd_list_builds,
     "set-version": cmd_set_version, "full": cmd_full}[args.command](args)


if __name__ == "__main__":
    main()
