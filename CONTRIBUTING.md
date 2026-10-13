# Contributing

There are two of us and the goal is to learn, so this process is kept light. Please follow it anyway: the review step is where most of the learning happens.

## Workflow

1. **Pick an issue** from the **Todo** column of the Project board and assign it to yourself. If there's no issue for the work, create one first.
2. **Create a branch** from an up-to-date `main`:
   ```bash
   git checkout main
   git pull
   git checkout -b feat/12-streaming-output
   ```
3. **Open a PR early**, as a draft if needed, and link the issue with `Closes #12` in the description.
4. **Request a review** from the other person. The card moves to **In Review**.
5. **Merge after approval** using *Squash and merge*. The card moves to **Done** automatically.

## Branch names

`<type>/<issue-number>-<short-description>`

| Type | Use for |
|------|---------|
| `feat/` | New functionality |
| `fix/` | Bug fixes |
| `docs/` | Documentation and planning |
| `refactor/` | Code changes that don't change behavior |
| `chore/` | Tooling, deps, config |
| `spike/` | Throwaway experiments for a learning spike (don't merge these) |

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add read_file tool
fix: handle empty model response
docs: explain agent loop in README
```

Keep commits focused. The squash-merge title becomes the commit on `main`, so make the PR title a good conventional commit message.

## Issues

Every issue needs **acceptance criteria**, a concrete check for "done". For example:

> `bolt ask "hello"` prints a streamed response and exits with code 0.

There are three templates:

- **Feature**: something the CLI should do
- **Bug**: something that's broken
- **Learning spike**: research a concept and write up what you found in the issue before closing it. These comments become our shared notes, so make them readable.

Keep issues small. If one feels bigger than a couple of days of work, split it.

## Code review

Reviews are about learning, not gatekeeping.

- **Author:** explain *why* in the PR description, not just what. Point out anything you're unsure about.
- **Reviewer:** ask questions when something is unclear, since that's the point. Label comments with `nit:` (optional), `question:` or `blocker:`.
- Try to review within a day so nobody gets stuck.

## Sharing the work

Rotate who owns each phase's core piece. If one person built the tool system, the other builds the agent loop. Nobody should end up as the only person who understands a part of the codebase.

## Weekly sync

Meet for 15 minutes once a week: what got done, what's blocked, and who picks up what next. Plan the next phase in detail and leave later phases as rough notes in **Backlog**.
