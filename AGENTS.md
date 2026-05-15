# AGENTS.md

## Cursor Cloud specific instructions

This is a greenfield repository called **SkillTree**. As of the initial setup, the repo contains only a `README.md` — no application code, dependencies, build system, or services exist yet.

### Current state
- **No package manager or lockfile** — no `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, etc.
- **No build/run/test/lint commands** — nothing to execute yet.
- **No services or databases** required.

### For future agents
- Once application code is added, update this file with instructions on how to install dependencies, run services, execute tests, and lint.
- Update the VM environment update script (via `SetupVmEnvironment`) when a dependency manager is introduced.
