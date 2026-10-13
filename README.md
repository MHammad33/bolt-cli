# bolt-cli

A terminal coding agent in the style of Claude Code, built from scratch in TypeScript as a learning project.

You start `bolt` in a project folder and give it a task in plain English. It reads your code, edits files and runs commands in a loop until the task is done, asking for permission before anything risky.

> **Status:** early. Only the project skeleton exists so far. See the [Roadmap](#roadmap) and the GitHub Project board for what's in progress.

## Why this exists

We're building this to understand how coding agents actually work: tool calling, the agent loop, context management and safety. The goal is core parity with Claude Code's user-facing behaviour, not its source code. Learning comes first, so we prefer clear code over clever code, and every PR gets reviewed.

The full design is in [docs/PLAN.md](docs/PLAN.md).

## Getting started

**Requirements:** Node.js 20+ and npm.

```bash
git clone https://github.com/MHammad33/bolt-cli.git
cd bolt-cli
npm install
```

Run and build instructions will be added once the CLI entry point lands (Phase 1).

## Roadmap

Each phase is a GitHub milestone. Each one teaches one core idea behind coding agents.

| # | Phase | What we learn |
|---|-------|---------------|
| 1 | **CLI skeleton** | Command parsing, config, loading the API keys from env |
| 2 | **First LLM calls and interactive session** | Calling OpenRouter and Anthropic APIs, streaming replies, and the interactive session |
| 3 | **Tool use** | Defining tools (Read, Write, Edit, Glob, Grep, Bash) and handling tool calls |
| 4 | **Agent loop** | Model → tool → result → model, repeated until the task is done |
| 5 | **Safety** | Permission prompts and keeping writes and commands inside the working directory |
| 6 | **Context management** | Token limits, summarizing long conversations, choosing which files to include |
| 7 | **Polish & evals** | UX improvements plus a small task suite to measure whether changes help |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow, branch naming, commit style and how we use the Project board.
