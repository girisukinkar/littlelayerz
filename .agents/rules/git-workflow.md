---
name: Git Workflow Rules
description: Defines the required checks and validations before pushing code to the repository.
---

# Git Workflow Requirements

1. **Mandatory Build Check**: Before you commit and push any code, you MUST run a build check (e.g., `npm run build` or `npm run typecheck`) to ensure the codebase has no compilation errors.
2. **Never push broken code**: If the build fails, fix the errors first. Under no circumstances should failing code be pushed to the repository.
