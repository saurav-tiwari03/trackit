# Commit Message Guide

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification. All commit messages are automatically validated using commitlint.

## Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Basic Structure

**Required:**
```
<type>: <subject>
```

**With scope (optional):**
```
<type>(<scope>): <subject>
```

**With body (optional):**
```
<type>: <subject>

Detailed explanation of the change
- Bullet point 1
- Bullet point 2
```

## Commit Types

### 1. `feat` - New Feature
Adds a new feature or functionality to the codebase.

**Examples:**
```bash
feat: add user authentication
feat(api): implement JWT token validation
feat: add file upload functionality
feat(auth): add password reset endpoint
```

### 2. `fix` - Bug Fix
Fixes a bug or resolves an issue in the codebase.

**Examples:**
```bash
fix: resolve database connection timeout
fix(api): handle null response in user endpoint
fix: correct validation error message
fix(auth): prevent token expiration bug
```

### 3. `docs` - Documentation
Changes that only affect documentation.

**Examples:**
```bash
docs: update API documentation
docs: add setup instructions to README
docs(api): document new endpoints
docs: fix typo in installation guide
```

### 4. `style` - Code Style
Changes that do not affect the meaning of the code (formatting, whitespace, semicolons, etc.).

**Examples:**
```bash
style: format code with Prettier
style: fix indentation in config files
style: remove trailing whitespace
```

### 5. `refactor` - Code Refactoring
Code changes that neither fix a bug nor add a feature (restructuring code).

**Examples:**
```bash
refactor: restructure error handling
refactor(api): simplify route handlers
refactor: extract common utilities
refactor(database): improve query structure
```

### 6. `perf` - Performance Improvements
Code changes that improve performance.

**Examples:**
```bash
perf: optimize database queries
perf(api): reduce response time
perf: cache frequently accessed data
perf: improve image compression
```

### 7. `test` - Tests
Adding or updating tests.

**Examples:**
```bash
test: add unit tests for auth service
test(api): add integration tests for endpoints
test: fix failing test cases
test: increase test coverage
```

### 8. `build` - Build System
Changes that affect the build system or external dependencies.

**Examples:**
```bash
build: update webpack configuration
build: add new build script
build: update TypeScript compiler options
build: upgrade Node.js version
```

### 9. `ci` - CI/CD
Changes to CI/CD configuration files and scripts.

**Examples:**
```bash
ci: add GitHub Actions workflow
ci: update deployment pipeline
ci: fix build script in CI
ci: add automated testing
```

### 10. `chore` - Maintenance
Other changes that don't modify src or test files (config, tooling, dependencies, etc.).

**Examples:**
```bash
chore: update dependencies
chore: configure ESLint
chore: update .gitignore
chore: setup commitlint
chore: remove unused files
```

### 11. `revert` - Revert
Reverts a previous commit.

**Examples:**
```bash
revert: revert "feat: add new feature"
revert(api): revert authentication changes
```

## Rules

The following rules are enforced by commitlint:

- ✅ **Type must be lowercase** - `feat` not `FEAT`
- ✅ **No period at end of subject** - `feat: add feature` not `feat: add feature.`
- ✅ **Subject is required** - Cannot be empty
- ✅ **Maximum 100 characters** for the header line
- ✅ **Scope is optional** but recommended for larger projects
- ✅ **Use present tense** - "add" not "added"
- ✅ **Use imperative mood** - "fix bug" not "fixes bug"

## Best Practices

### 1. Subject Line
- Keep it under 50 characters when possible
- Start with a lowercase letter (after the type)
- Don't end with a period
- Be specific and descriptive

**Good:**
```
feat: add user registration endpoint
fix: resolve MongoDB connection pool issue
```

**Bad:**
```
feat: added new stuff
fix: bug fix
feat: add feature.
```

### 2. Scope (Optional)
Use scope to indicate which part of the codebase is affected.

**Examples:**
```bash
feat(auth): add JWT validation
fix(api): handle error responses
refactor(database): improve query performance
```

### 3. Body (Optional)
Use the body to explain:
- **What** the change does
- **Why** the change was made
- **How** it differs from previous behavior

**Example:**
```
feat: add file upload functionality

- Support multiple file formats (jpg, png, pdf)
- Add file size validation (max 10MB)
- Implement progress tracking for large files
```

### 4. Breaking Changes
If your commit introduces breaking changes, indicate it in the footer:

```
feat(api): change authentication method

BREAKING CHANGE: JWT tokens now required for all endpoints.
Previous API key authentication is no longer supported.
```

## Quick Decision Guide

| Type       | When to Use                       |
| ---------- | --------------------------------- |
| `feat`     | Adding new functionality          |
| `fix`      | Fixing bugs                       |
| `docs`     | Only documentation changes        |
| `style`    | Formatting, no logic change       |
| `refactor` | Code restructuring, same behavior |
| `perf`     | Performance improvements          |
| `test`     | Test-related changes              |
| `build`    | Build tools, dependencies         |
| `ci`       | CI/CD pipeline changes            |
| `chore`    | Maintenance, config, tooling      |
| `revert`   | Undoing a previous commit         |

## Common Patterns

### Most Frequently Used Types:
1. **`feat`** - New features
2. **`fix`** - Bug fixes
3. **`chore`** - Maintenance tasks
4. **`refactor`** - Code improvements
5. **`docs`** - Documentation

### Real-World Examples

```bash
# Adding a new API endpoint
feat(api): add user profile endpoint

# Fixing a bug
fix: resolve MongoDB connection pool issue

# Updating documentation
docs: add environment variable setup guide

# Refactoring code
refactor: extract database connection logic

# Performance improvement
perf: add Redis caching for user data

# Adding tests
test: add unit tests for auth middleware

# Updating dependencies
chore: update Express to latest version

# CI/CD changes
ci: add automated deployment workflow

# Reverting a change
revert: revert "feat: add experimental feature"
```

## Invalid Examples (Will Be Rejected)

```bash
# ❌ Missing type
git commit -m "added new feature"

# ❌ Wrong case
git commit -m "FEAT: add feature"

# ❌ Period at end
git commit -m "feat: add feature."

# ❌ Empty subject
git commit -m "feat:"

# ❌ Invalid type
git commit -m "update: change code"

# ❌ Too long (over 100 chars)
git commit -m "feat: add a very long commit message that exceeds the maximum allowed character limit and will be rejected by commitlint"
```

## Validation

All commit messages are automatically validated using:
- **commitlint** - Validates commit message format
- **Husky** - Git hooks that run validation before commit

If your commit message doesn't follow the format, the commit will be rejected with an error message explaining what's wrong.

## Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Commitlint Documentation](https://github.com/conventional-changelog/commitlint)
- [Angular Commit Message Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)

---

**Remember:** Good commit messages help you and your team understand the history of the project. Take time to write clear, descriptive commit messages!

