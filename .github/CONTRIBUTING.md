# Contributing to Atican Beach Resort

## 🌿 Branch Workflow

1. Pick an issue or feature from the backlog
2. Create branch from `develop`
3. Write code with tests
4. Create Pull Request to `develop`
5. Request review from team
6. Merge after approval
7. Release to `main` on schedule

## 📝 Commit Conventions

Format: `type(scope): description`

### Types
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style (formatting)
- `refactor:` Code improvement
- `test:` Testing
- `chore:` Maintenance

### Examples
```
feat(rooms): Add new deluxe suite type
fix(booking): Resolve date picker bug
docs(readme): Update deployment instructions
refactor(cart): Simplify Zustand store
```

## 🌿 Branch Naming

- `feature/descriptive-name`
- `bugfix/issue-description`
- `hotfix/urgent-fix`

## 🔍 Code Review

- All PRs require 1 approval
- Address all comments
- Keep PRs small and focused
- CI must pass before merge

## 🚀 Deployment

- `main` → Auto-deploys to production (https://aticanbeachresort.com)
- `develop` → Auto-deploys to staging
- `feature/*` → Creates preview deployment