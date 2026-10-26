# SSH Key Setup for GitHub

Follow this guide when SSH authentication to GitHub fails or when no SSH key exists yet.

## 1. Generate a key pair

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

Accept the default path (`~/.ssh/id_ed25519`). Set a passphrase or leave it empty. A matching pair is produced:

- `~/.ssh/id_ed25519` — private key (never share, never commit)
- `~/.ssh/id_ed25519.pub` — public key (safe to register with GitHub)

## 2. Register the public key with GitHub

Print the public key:

```bash
cat ~/.ssh/id_ed25519.pub
```

Then in GitHub: **Settings → SSH and GPG keys → New SSH key**, paste the full line (starting with `ssh-ed25519`), save.

## 3. Load the key into the ssh-agent (needed if the key has a passphrase)

Windows (PowerShell):

```powershell
Get-Service ssh-agent | Set-Service -StartupType Manual
Start-Service ssh-agent
ssh-add $env:USERPROFILE\.ssh\id_ed25519
```

macOS / Linux:

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

## 4. Verify

```bash
ssh -T git@github.com
```

Success prints `Hi <username>! You've successfully authenticated, but GitHub does not provide shell access.` — the command still exits with code 1; that is normal.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Permission denied (publickey)` | Public key not registered, wrong key file, or key not loaded | Re-check step 2; run `ssh-add -l` to list loaded keys; verify the remote uses `git@github.com:...` |
| `Host key verification failed` | github.com not in known_hosts | Run `ssh -o StrictHostKeyChecking=accept-new -T git@github.com` once |
| `git@github.com: Permission denied (publickey)` only for one repo | Deploy key belongs to another repository | Use an account-level key, not a deploy key |
| Two GitHub accounts on one machine | Default key maps to the wrong account | Add a `~/.ssh/config` alias (below) |
| HTTPS remote prompts for a password | HTTPS remote with no credential helper | Switch the remote to SSH: `git remote set-url origin git@github.com:owner/repo.git` |
| Push rejected as non-fast-forward | Remote has commits the local branch lacks | `git pull --rebase origin <branch>` then push again; never force-push without the user's explicit request |

### Multiple accounts via `~/.ssh/config`

```
Host github-work
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_work

Host github-personal
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519
```

Then use `git@github-work:owner/repo.git` as the remote URL.
