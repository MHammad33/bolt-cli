# bolt-cli plan

This file holds the design for `bolt`: the decisions, the phases and the open questions. The [README](../README.md) has the short version. Phases 1 and 2 are detailed. Phases 3 to 7 are rough notes until we reach them, as [CONTRIBUTING.md](../CONTRIBUTING.md) describes.

## Goal

`bolt` is a terminal coding agent in the style of Claude Code. You start it in a project folder and give it tasks in plain English. It reads and edits code, runs commands in a loop until the task is done, and asks before doing anything risky.

Core parity means bolt matches Claude Code's user-facing behaviour: the same core loop, the same tool names and behaviour, the same permission modes, an interactive session by default, and CLAUDE.md project memory. We don't copy Claude Code's source.

We build it to learn how coding agents work: tool calling, the agent loop, context management and safety. We prefer readable code to clever code.

## Non-goals

- Copying Claude Code's source code, or matching it byte for byte.
- Multi-user or server features.
- Supporting every model. We test a small set on each provider.

**Later, not in the seven phases:** subagents, hooks, MCP servers, plugins and skills. They're large, so they get their own plan once Phase 7 is done.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Model access | Two clients behind one `ModelClient` interface: **OpenRouter** for cheap models while testing, and the **Anthropic Messages API** for Claude models | Cheap models keep test runs affordable. Claude models match the Claude Code behaviour we're copying. |
| Provider choice | `BOLT_PROVIDER` (`openrouter` or `anthropic`). Default: `openrouter` | Cheap by default. Proposed during planning, so it can change. |
| Model choice | `BOLT_MODEL`, with a default per provider | Models differ a lot in tool-calling quality, so the default should be easy to change. |
| Interactive session | `bolt` with no arguments opens a session. `bolt ask "<prompt>"` runs one task and exits | Matches Claude Code. Reuses the #1 code. |
| Tool set | Read, Write, Edit, Glob, Grep, Bash, with Claude Code's names and behaviour | Same tools as Claude Code, so the behaviour is familiar. |
| Permission modes | `default` (ask before Write, Edit and Bash), `acceptEdits` (Write and Edit don't ask), `plan` (read-only tools only) | Claude Code's modes. |
| Language | TypeScript on Node 20+ | Already set up in `tsconfig.json` and `@types/node`. |
| Module format | ESM: `"type": "module"`, relative imports end in `.js` | Matches the modern Node default. Decided during planning, before any code exists, so there's no migration cost. |
| Platform | Windows only for now | Development and testing happen on Windows. Linux is out of scope, so Bash needs no per-platform code. |
| No vendor SDKs | Call both APIs with `fetch` and parse SSE by hand | Keeps the wire format visible while we learn it. |
| Dev run | `tsx` runs TypeScript directly | No build step during development. |
| Build | `tsc` writes to `dist/` | Produces the files we run as the packaged CLI. |
| Tests | Node's built-in `node:test` runner | Nothing extra to learn or maintain. |
| Plan home | This file, plus GitHub issues and milestones | This file holds the design. Issues hold the tasks. |
| Ownership | Phases are split between the two of us (see [Team](#team)) | No one ends up as the only person who understands a part of the code. |

### Why there's a provider interface

OpenRouter and the Anthropic API both do tool calling, but their message shapes differ. OpenRouter follows the OpenAI format, and Anthropic uses content blocks. bolt therefore talks to a small internal `ModelClient` interface and never to either vendor's types. Each provider is one implementation, and the agent loop doesn't know which one it's using.

## Architecture (target, end of Phase 5)

```
src/
  cli/          argument parsing, command dispatch, interactive session (bolt, bolt ask)
  config/       load settings from env vars and .env
  model/        ModelClient interface, our message and tool types,
                OpenRouter client, Anthropic client
  tools/        Read, Write, Edit, Glob, Grep, Bash: definitions and handlers
  agent/        the loop: model -> tool call -> tool result -> model
  safety/       permission modes and path checks (Phase 5)
  context/      token counting, history trimming, CLAUDE.md loading (Phase 6)
  index.ts      entry point
test/           node:test files, mirroring src/
```

Keep each folder small. If a module has to import another folder's internals, the boundary is in the wrong place.

## Configuration

Variables come from the environment. A gitignored `.env` file in the project root is also read, using Node's built-in `process.loadEnvFile`, so no dependency is needed. Values from the real environment win over `.env`.

- `BOLT_PROVIDER` (optional, default `openrouter`). `openrouter` or `anthropic`.
- `OPENROUTER_API_KEY`. Required when the provider is `openrouter`. Never written to a file or logged.
- `ANTHROPIC_API_KEY`. Required when the provider is `anthropic`. Never written to a file or logged.
- `BOLT_MODEL` (optional). A model id for the chosen provider, for example `anthropic/claude-sonnet-4.5` on OpenRouter or a Claude model id on Anthropic. Phase 1 uses a placeholder default per provider. The Phase 2 spike replaces it.
- `BOLT_MAX_STEPS` (optional, default 20). Validated in Phase 1. Stops the agent loop from running forever.

Config stays stateless otherwise: no history and no config file beyond `.env` until Phase 6.

## Phase 1: CLI skeleton

**What we learn:** command parsing, config, and loading secrets from the environment.

**Goal:** `bolt` runs from the terminal, understands a few commands, and fails with a clear message when config is missing.

**Tasks**

1. Add `tsx` and a `build` script (`tsc -p .`, output to `dist/`). Set `bin` in `package.json` to the built entry.
2. Create `src/index.ts` as the entry point. Print usage when run with `--help`.
3. Add a command parser. Use `node:util`'s `parseArgs`, not a dependency, so the parsing stays visible.
4. Add `bolt ask "<prompt>"` as a stub that prints the prompt back. Phase 2 makes it real.
5. Add config loading in `src/config/`. It reads `BOLT_PROVIDER`, the key for that provider, `BOLT_MODEL` and `BOLT_MAX_STEPS` (from the environment or `.env`), validates them, and returns a typed object. A missing key prints a clear error and exits with code 1.
6. Add `--version`, which prints the version from `package.json`.
7. Set the `test` script to `node --test` and add the first tests, for the parser and the config.
8. Add lint, format and typecheck in CI (issue #7). Phase 1 keeps this in scope.
9. Add run and build instructions to the README's "Getting started" section.

**Acceptance criteria**

- [ ] `npm run build` succeeds with no TypeScript errors.
- [ ] `npx tsx src/index.ts --help` prints usage and exits with code 0.
- [ ] `npx tsx src/index.ts --version` prints the version from `package.json` and exits with code 0.
- [ ] `npx tsx src/index.ts ask "hello"` prints `hello` (the stub) and exits with code 0.
- [ ] With `BOLT_PROVIDER` unset and `OPENROUTER_API_KEY` unset, `ask` prints a message that names the missing variable and exits with code 1.
- [ ] With `BOLT_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` unset, `ask` prints a message that names the missing variable and exits with code 1.
- [ ] An invalid `BOLT_MAX_STEPS` (not a positive integer) prints an error and exits with code 1.
- [ ] `npm test` runs and passes, with tests for argument parsing and config validation.
- [ ] No API key value appears in any output, error message or test snapshot.

**Out of scope:** network calls, the interactive session (Phase 2), config files on disk other than `.env`, colours and spinners.

**Issues (existing)**

- #3 src layout, build and dev scripts (tsconfig, ESM)
- #4 argument-parsing spike (done)
- #5 entry point with `--help` and `--version`
- #6 config and env loading
- #7 lint, format and CI typecheck

## Phase 2: First LLM calls and the interactive session

**What we learn:** calling two model APIs, streaming their replies, and how their tool-call formats differ. We also see how the choice of model affects behaviour.

**Goal:** `bolt` opens an interactive session, and `bolt ask "<prompt>"` runs one task. Both send the prompt to the provider chosen in config and stream the reply.

**Tasks**

1. **Spike first, time-boxed to about half a day.** Call OpenRouter with a few cheap candidate models, using the same prompt and one dummy tool. Record which models return well-formed tool calls, along with latency and cost. Put the results in the issue as a short table. The result sets the default `BOLT_MODEL` for OpenRouter. Pick a Claude model as the default for Anthropic in the same spike.
2. Define the `ModelClient` interface in `src/model/`, with a `complete` method (no streaming) and a `stream` method. Use our own message and tool types, not the vendors'.
3. Implement the OpenRouter client. It calls `https://openrouter.ai/api/v1/chat/completions` with `fetch` and parses the SSE stream by hand.
4. Implement the Anthropic client. It calls the Messages API with `fetch` and parses its SSE events by hand. Map its content blocks to our message types.
5. Port the interactive session from closed #1 into `src/cli/`. It shows the working directory, takes several prompts in one run, handles empty input without crashing, and exits cleanly on Ctrl+C or `exit`. Each prompt goes to the model client.
6. Connect `bolt ask` and the session to the client. Stream text to stdout as it arrives. No tools yet, so the model only answers.
7. Handle the errors that matter: a missing key (401), a rate limit (429), a network failure, and a stream that ends early. Each prints one clear line and exits with a non-zero code. In the session, an error is printed and the prompt comes back.
8. Tests use a fake `ModelClient` for the command and session tests, and saved responses for each SSE parser. Include a response split across chunks. `npm test` makes no network calls.
9. Add a manual smoke-test script, or a README section that shows the real call. Someone runs it by hand. It isn't part of CI.

**Acceptance criteria**

- [ ] `bolt ask "hello"` prints a streamed response and exits with code 0, matching the example in CONTRIBUTING.md.
- [ ] `bolt` opens a session that shows the working directory, accepts several prompts, ignores empty input and exits cleanly.
- [ ] Changing `BOLT_PROVIDER` changes which API is called, and changing `BOLT_MODEL` changes the model. A visible model name in verbose output or the response metadata confirms both.
- [ ] An invalid key prints an auth error and exits with code 1. It doesn't print a stack trace.
- [ ] Tests cover both SSE parsers using saved responses, including a response split across chunks.
- [ ] `npm test` makes no network calls.
- [ ] The spike results are written up in the spike issue, with the chosen default model for each provider and the reason for it.

**Open questions for this phase**

- Does OpenRouter's model list change often enough that the default model id belongs in config rather than in code? Recommendation: config, with a sensible default.
- Do we keep a per-run log of requests and responses for learning? Recommendation: a `--verbose` flag, off by default, with both API keys always redacted.

**Issues**

- #8 spike: streaming and tool-call formats (research, narrowed to formats: OpenRouter and Anthropic)
- `spike: compare cheap OpenRouter models and pick Claude defaults` (new, opened when Phase 2 starts)
- `feat: define ModelClient interface and message types` (new)
- `feat: OpenRouter client with streaming` (new)
- `feat: Anthropic client with streaming` (new)
- `feat: interactive session (port from #1)` (new)
- `feat: wire bolt ask to the model client` (new)
- `test: SSE parsers and fake client tests` (new)

## Phase 3: Tool use (rough)

Define the tools with Claude Code's names and behaviour, each with a JSON schema:

- **Read**: read a file, with optional line range.
- **Write**: create or overwrite a file.
- **Edit**: replace an exact string in a file. It fails if the old string isn't found or isn't unique. We don't rewrite whole files.
- **Glob**: find files by pattern.
- **Grep**: search file contents.
- **Bash**: run a shell command. Our name for Phase 3's `run_shell`.

Parse the tool calls in each provider's response and dispatch them. Send each tool result back to the model. Tool definitions are plain data, so tests can check them without calling a model.

Open: the two providers format tool calls differently, so each client needs a normaliser into our types.

## Phase 4: Agent loop (rough)

The loop runs model, then tool call, then tool result, then model again. It stops when the model returns plain text or when `BOLT_MAX_STEPS` is reached. Each step gets logged so the loop is visible. Test the loop with a fake model that returns scripted tool calls. The interactive session from Phase 2 now runs the loop, so one prompt can take several steps.

## Phase 5: Safety (rough)

Permission modes, the same names as Claude Code:

- **default**: ask before Write, Edit and Bash.
- **acceptEdits**: Write and Edit run without asking. Bash still asks.
- **plan**: read-only tools only (Read, Glob, Grep). Nothing is written or run.
- `--yes` for scripted use. It skips the prompts only.

Path checks always apply, in every mode. Resolve every path against the working directory and refuse any path outside it, including `..` tricks and symlinks.

Decide which Bash commands count as risky. Start with a short deny list, and prompt for everything else. Windows only, so the list covers Windows shell commands.

Open: should `--yes` skip the path checks? Recommendation: no, never.

## Phase 6: Context management (rough)

Count tokens. An approximate count is fine to start. When the history nears the model's limit, summarise old turns, or drop tool output first. Decide which files get included automatically and which only on request.

CLAUDE.md: load the CLAUDE.md file from the project root into the context at the start of each session, as Claude Code does.

Open: which tokenizer to use. Start with a rough character-based estimate, then decide whether an exact tokenizer is worth the dependency. This is also where bolt may start storing local state (history), per the plan.

## Phase 7: Polish and evals (rough)

- Slash commands in the session, such as `/help`, `/clear` and `/mode`.
- Better output: colours, a spinner and a clear end-of-task summary.
- A small task suite. Each task is a folder with a starting repo state and a check script. Run the suite before and after a change to see whether it helps.

## Team

Two people. Each phase has one owner for its core piece. Owners rotate, so both of us understand the whole codebase.

| Phase | Core piece | Owner |
|---|---|---|
| 1 | CLI skeleton and config | TBD |
| 2 | ModelClient, both provider clients and the interactive session | TBD (the other person) |
| 3 | Tool definitions and handlers | TBD |
| 4 | Agent loop | TBD (the other person) |
| 5 | Safety | TBD |
| 6 | Context management | TBD |
| 7 | Evals and slash commands | TBD |

Owners are set on the GitHub Project board, not in this file.

## Workflow

This follows [CONTRIBUTING.md](../CONTRIBUTING.md). In short: pick an issue from Todo, branch as `<type>/<number>-<short-name>`, open a PR early, link it with `Closes #n`, get a review, and squash-merge.

## Milestones and board

- One GitHub milestone per phase, Phase 1 to Phase 7.
- Issues for Phases 1 and 2 are created now. Each of Phases 3 to 7 gets one placeholder issue, with the rough notes above copied in.
- Board columns: Backlog, Todo, In Progress, In Review, Done.

## Open questions

None of these block Phase 1. Each should be answered before the phase it belongs to.

1. Which default model for each provider? The Phase 2 spike answers this.
2. Is `openrouter` the right default for `BOLT_PROVIDER`? Proposed during planning. Cheap by default, switch to `anthropic` when we want Claude-quality runs.
3. Who owns each phase? See [Team](#team). Deferred, not yet decided.
4. Which minimum Node version do we target? Phase 1 needs `process.loadEnvFile`, which is Node 20.12+.

**Answered during planning**

- Fidelity: core parity with Claude Code's user-facing behaviour. Extras wait for a later plan.
- Non-goals: "competing with existing coding agents" and "a polished UI" are dropped.
- Providers: OpenRouter and Anthropic, both behind `ModelClient`, both built in Phase 2.
- Interactive session: the default, built in Phase 2.
- Tools: Claude Code's six tool names and behaviour.
- Permissions: default, acceptEdits and plan modes, with `--yes` for scripts.
- CLAUDE.md: Phase 6. Slash commands: Phase 7.
- Local state: stateless until Phase 6, apart from a gitignored `.env` file.
- Platforms: Windows only for now.
- Module format: ESM.
- Lint and CI: stay in Phase 1.
