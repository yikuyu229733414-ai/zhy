#!/usr/bin/env python3
"""Commit and push a local project to a GitHub repository over SSH.

Example:
    python push_to_github.py -m "Update docs"                 # default repo (yikuyu229733414-ai/zhy)
    python push_to_github.py owner/repo -m "Initial commit"   # explicit repo
"""

import argparse
import os
import re
import shutil
import subprocess
import sys

# Designated default repository: used when the user says "提交到github" without naming a target.
DEFAULT_REPO = "yikuyu229733414-ai/zhy"


def run(cmd, cwd, check=True):
    """Run a command and return the completed process; abort on failure when check=True."""
    try:
        result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    except FileNotFoundError as exc:
        raise SystemExit(f"Required executable not found: {exc.filename}")
    if check and result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()
        if detail:
            print(detail, file=sys.stderr)
        raise SystemExit(f"Command failed ({result.returncode}): {' '.join(cmd)}")
    return result


def to_ssh_remote(repo):
    """Normalize a GitHub repository reference (URL or owner/repo) to an SSH remote URL."""
    repo = repo.strip()
    if re.fullmatch(r"[\w.-]+/[\w.-]+", repo):
        repo = f"https://github.com/{repo}"
    for pattern in (
        r"https?://github\.com/([^/]+/[^/]+?)(?:\.git)?/?$",
        r"git@github\.com:([^/]+/[^/]+?)(?:\.git)?/?$",
        r"ssh://git@github\.com/([^/]+/[^/]+?)(?:\.git)?/?$",
    ):
        match = re.match(pattern, repo)
        if match:
            return f"git@github.com:{match.group(1)}.git"
    raise SystemExit(f"Unrecognized GitHub repository reference: {repo}")


def check_ssh_access(cwd):
    """Verify SSH authentication to GitHub before pushing."""
    result = run(
        ["ssh", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new", "-T", "git@github.com"],
        cwd,
        check=False,
    )
    output = ((result.stdout or "") + (result.stderr or "")).strip()
    if "successfully authenticated" in output:
        print("SSH authentication to GitHub: OK")
        return
    if result.returncode == 255 or "Permission denied" in output:
        if output:
            print(output, file=sys.stderr)
        raise SystemExit("SSH authentication failed. See references/ssh-setup.md for key setup steps.")
    print(f"Warning: SSH access check was inconclusive (exit {result.returncode}); continuing.", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description="Commit and push a project to GitHub via SSH.")
    parser.add_argument("repo", nargs="?", default=DEFAULT_REPO,
                        help=f"GitHub repository URL or owner/repo (default: {DEFAULT_REPO})")
    parser.add_argument("-m", "--message", default="Update project", help="Commit message")
    parser.add_argument("-b", "--branch", default=None, help="Branch to push (default: current branch, else 'main')")
    parser.add_argument("--path", default=".", help="Project directory (default: current directory)")
    args = parser.parse_args()

    project = os.path.abspath(args.path)
    if not os.path.isdir(project):
        raise SystemExit(f"Not a directory: {project}")
    if shutil.which("git") is None:
        raise SystemExit("git is not installed or not on PATH.")

    remote_url = to_ssh_remote(args.repo)

    # 1. Ensure a git repository exists.
    probe = run(["git", "rev-parse", "--is-inside-work-tree"], project, check=False)
    if probe.returncode != 0:
        run(["git", "init", "-b", args.branch or "main"], project)
        print(f"Initialized new git repository on branch '{args.branch or 'main'}'.")

    # 2. Verify SSH authentication to GitHub.
    check_ssh_access(project)

    # 3. Configure the origin remote (SSH form).
    remotes = run(["git", "remote"], project).stdout.split()
    if "origin" in remotes:
        run(["git", "remote", "set-url", "origin", remote_url], project)
    else:
        run(["git", "remote", "add", "origin", remote_url], project)
    print(f"origin -> {remote_url}")

    # 4. Stage all changes and create a commit.
    run(["git", "add", "-A"], project)
    if run(["git", "status", "--porcelain"], project).stdout.strip():
        for key in ("user.name", "user.email"):
            if not run(["git", "config", "--get", key], project, check=False).stdout.strip():
                raise SystemExit(f"git {key} is not set; configure it before committing.")
        run(["git", "commit", "-m", args.message], project)
        print(f"Committed: {args.message}")
    else:
        print("Working tree clean; skipping commit.")

    # 5. Push and set the upstream branch.
    branch = args.branch
    if branch is None:
        ref = run(["git", "symbolic-ref", "--short", "HEAD"], project, check=False)
        branch = ref.stdout.strip() or "main"
    push = run(["git", "push", "-u", "origin", branch], project, check=False)
    output = ((push.stdout or "") + (push.stderr or "")).strip()
    if output:
        print(output)
    if push.returncode != 0:
        raise SystemExit(f"Push to origin/{branch} failed.")
    print(f"Pushed branch '{branch}' to GitHub.")


if __name__ == "__main__":
    main()
