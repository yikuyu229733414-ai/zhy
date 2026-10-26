---
name: github-submit
description: This skill must be used whenever the user's prompt contains "提交到github" or "提交到 GitHub" - treat it as the default action and push to the user's designated repository without asking again. Also use when the user asks to commit, push, or upload a project to GitHub ("push this project to GitHub", "commit and push 整个项目", "上传项目到仓库", "把代码推送到 GitHub"). When the user names a repository, use that target; otherwise use the default repository yikuyu229733414-ai/zhy. Provides an SSH-based workflow for initializing a git repository, configuring the origin remote, creating a commit, and pushing a branch, plus SSH key setup and troubleshooting guidance.
---

# GitHub Submit

## Overview

Commit and push a local project to a GitHub repository over SSH. Covers the full path from an untracked folder to a pushed branch: repository initialization, remote configuration, commit creation, push, and SSH authentication verification.

## Trigger and Default Target

- Any prompt containing "提交到github" / "提交到 GitHub" means: run this skill immediately and push to the user's designated repository. Do not re-confirm the target.
- Default repository when the user names none: `yikuyu229733414-ai/zhy` (remote `git@github.com:yikuyu229733414-ai/zhy.git`).
- When the user names a different repository or URL, use that instead.
- Commit message: use the user's wording when provided; otherwise write a one-line summary of the staged changes.

## Workflow

Follow these steps in order.

### Step 1: Verify prerequisites

1. Confirm `git` is available (`git --version`).
2. Determine the target repository: use the default `yikuyu229733414-ai/zhy` unless the user names one. Convert any `https://github.com/owner/repo` form to SSH (`git@github.com:owner/repo.git`) — this skill always uses SSH.
3. Confirm an SSH key pair exists (e.g. `~/.ssh/id_ed25519` / `id_ed25519.pub`). If not, follow `references/ssh-setup.md` to generate a key and register the public key with GitHub before continuing.
4. Verify authentication with `ssh -o BatchMode=yes -T git@github.com`. Output containing `successfully authenticated` means success (exit code 1 is normal for this command). On `Permission denied (publickey)`, follow `references/ssh-setup.md` and stop until authentication works.

### Step 2: Run the bundled push script

Run `scripts/push_to_github.py` (paths in this skill are relative to the skill's own directory) from the target project:

```bash
python <skill-dir>/scripts/push_to_github.py -m "Commit message"                   # default repository
python <skill-dir>/scripts/push_to_github.py owner/other-repo -m "Commit message"  # explicit repository
```

Arguments:

| Argument | Meaning |
|---|---|
| `repo` | GitHub repository URL or `owner/repo` (optional, default: `yikuyu229733414-ai/zhy`) |
| `-m, --message` | Commit message (default: `Update project`) |
| `-b, --branch` | Branch to push (default: current branch, else `main`) |
| `--path` | Project directory (default: current directory) |

The script performs the whole deterministic sequence:

1. `git init -b <branch>` if the directory is not yet a repository
2. SSH authentication check against `git@github.com`
3. Configure `origin` as the SSH remote (converts HTTPS input automatically)
4. `git add -A` and create a commit only when there are changes
5. `git push -u origin <branch>`

Report the script's final status lines to the user. On success the project is committed and pushed.

### Step 3: Handle failures

- **Push rejected as non-fast-forward**: the remote already has commits (e.g. a README created on GitHub). Run `git pull --rebase origin <branch> --allow-unrelated-histories` to reconcile, resolve any conflicts, then push again. Never force-push unless the user explicitly requests it.
- **Missing git identity** (`user.name` / `user.email` not set): ask the user for the values and set them before committing.
- **SSH errors**: follow `references/ssh-setup.md` (key generation, ssh-agent, known_hosts, multiple accounts).
- **No Python available**: run the manual equivalent below.

### Manual equivalent

```bash
git init -b main                      # only if the directory is not a repository
ssh -T git@github.com                 # expect "Hi <username>! ... successfully authenticated"
git remote add origin git@github.com:owner/repo.git   # or: git remote set-url origin <ssh-url>
git add -A
git commit -m "Commit message"
git push -u origin main
```

## Resources

- `scripts/push_to_github.py` — one-shot commit-and-push automation; run it rather than replaying the git sequence by hand when Python is available.
- `references/ssh-setup.md` — SSH key generation, GitHub registration, ssh-agent, and a troubleshooting table. Load when authentication fails or no key pair exists.
