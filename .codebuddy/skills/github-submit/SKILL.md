---
name: github-submit
description: This skill should be used when a user wants to commit and push a local project to a GitHub repository, including requests such as "提交到 GitHub", "push this project to GitHub", "commit and push 整个项目到指定仓库", "上传项目到仓库", or "把代码推送到 GitHub". Provides a reliable SSH-based workflow for initializing a git repository, configuring the origin remote, creating a commit, and pushing a branch, plus SSH key setup and troubleshooting guidance.
---

# GitHub Submit

## Overview

Commit and push a local project to a GitHub repository over SSH. Covers the full path from an untracked folder to a pushed branch: repository initialization, remote configuration, commit creation, push, and SSH authentication verification.

## Workflow

Follow these steps in order.

### Step 1: Verify prerequisites

1. Confirm `git` is available (`git --version`).
2. Confirm a GitHub target is known: a repository URL or `owner/repo`. Convert any `https://github.com/owner/repo` form to SSH (`git@github.com:owner/repo.git`) — this skill always uses SSH.
3. Confirm an SSH key pair exists (e.g. `~/.ssh/id_ed25519` / `id_ed25519.pub`). If not, follow `references/ssh-setup.md` to generate a key and register the public key with GitHub before continuing.
4. Verify authentication with `ssh -o BatchMode=yes -T git@github.com`. Output containing `successfully authenticated` means success (exit code 1 is normal for this command). On `Permission denied (publickey)`, follow `references/ssh-setup.md` and stop until authentication works.

### Step 2: Run the bundled push script

Run `scripts/push_to_github.py` (paths in this skill are relative to the skill's own directory) from the target project:

```bash
python <skill-dir>/scripts/push_to_github.py <owner/repo-or-url> -m "Commit message" [--branch main] [--path .]
```

Arguments:

| Argument | Meaning |
|---|---|
| `repo` | GitHub repository URL or `owner/repo` (required) |
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
