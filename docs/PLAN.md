# bolt-cli plan

This file holds the design for `bolt`: the decisions, the phases and the open questions. The [README](../README.md) has the short version. Phases 1 and 2 are detailed. Phases 3 to 7 are rough notes until we reach them, as [CONTRIBUTING.md](../CONTRIBUTING.md) describes.

## Goal

`bolt` is a terminal coding agent. You give it a task in plain English. It reads and edits code, runs commands in a loop until the task is done, and asks before doing anything risky.

We build it to learn how coding agents work: tool calling, the agent loop, context management and safety. We prefer readable code to clever code.

## Non-goals

- Competing with existing coding agents.
- A polished UI. A plain terminal is enough.
- Supporting every model. We use models reachable through OpenRouter and test a small set.
- Multi-user or server features.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Model access | **OpenRouter** (OpenAI-compatible API) | One key and one client reach many models. We don't depend on a single vendor. |
| Model choice | Set by config, with a default that works well for tool calling | Models differ a lot in tool-calling quality, so the default should be easy to change. |
| Language | TypeScript on Node 20+ | Already set up in `tsconfig.json` and `@types/node`. |
| Module format | Keep CommonJS for now | Switching to ESM is a separate, small task, and not worth doing mid-phase. |
| Dev run | `tsx` runs TypeScript directly | No build step during development. |
| Build | `tsc` writes to `dist/` | Produces the files we run as the packaged CLI. |
| Tests | Node's built-in `node:test` runner | Nothing extra to learn or maintain. |
| Plan home | This file, plus GitHub issues and milestones | This file holds the design. Issues hold the tasks. |
| Ownership | Phases are split between the two of us (see [Team](#team)) | No one ends up as the only person who understands a part of the code. |

### Why OpenRouter needs a provider interface

OpenRouter gives us one API, but models don't all handle tool calling the same way, and their responses differ in small ways. bolt therefore talks to a small internal `ModelClient` interface and never to OpenRouter's SDK types directly. We build one implementation, for OpenRouter. Adding a second one later is simple.

## Architecture (target, end of Phase 4)

```
src/
  cli/          argument parsing and command dispatch (bolt ask, bolt run ...)
  config/       load settings from env vars and a config file
  model/        ModelClient interface + OpenRouter implementation
  tools/        tool definitions (read_file, write_file, list_dir, run_shell) and their handlers
  agent/        the loop: model -> tool call -> tool result -> model
  safety/       permission prompts and path checks (Phase 5)
  context/      token counting and history trimming/summaries (Phase 6)
  index.ts      entry point
test/           node:test files, mirroring src/
```

Keep each folder small. If a module has to import another folder's internals, the boundary is in the wrong place.

## Configuration

- `OPENROUTER_API_KEY` (required). Read from the environment only. Never written to a file or logged.
- `BOLT_MODEL` (optional). An OpenRouter model id, for example `anthropic/claude-sonnet-4.5`. A Phase 2 spike picks the default.
- `BOLT_MAX_STEPS` (optional, default 20). Stops the agent loop from running forever.

## Phase 1: CLI skeleton

**What we learn:** command parsing, config, and loading secrets from the environment.

**Goal:** `bolt` runs from the terminal, understands a few commands, and fails with a clear message when config is missing.

**Tasks**

1. Add `tsx` and a `build` script (`tsc -p .`, output to `dist/`). Set `bin` in `package.json` to the built entry.
2. Create `src/index.ts` as the entry point. Print usage when run with no arguments or with `--help`.
3. Add a command parser. Use `node:util`'s `parseArgs`, not a dependency, so the parsing stays visible.
4. Add `bolt ask "<prompt>"` as a stub that prints the prompt back. Phase 2 makes it real.
5. Add config loading in `src/config/`. It reads `OPENROUTER_API_KEY` and `BOLT_MODEL`, validates them, and returns a typed object. A missing key prints a clear error and exits with code 1.
6. Set the `test` script to `node --test` and add the first tests, for the parser and the config.
7. Add run and build instructions to the README's "Getting started" section.

**Acceptance criteria**

- [ ] `npm run build` succeeds with no TypeScript errors.
- [ ] `npx tsx src/index.ts --help` prints usage and exits with code 0.
- [ ] `npx tsx src/index.ts ask "hello"` prints `hello` (the stub) and exits with code 0.
- [ ] With `OPENROUTER_API_KEY` unset, `ask` prints a message that names the missing variable and exits with code 1.
- [ ] `npm test` runs and passes, with tests for argument parsing and config validation.
- [ ] No API key value appears in any output, error message or test snapshot.

**Out of scope:** network calls, config files on disk, colours and spinners.

**Suggested issues (size S or M)**

- `feat: add tsx dev runner and build script`
- `feat: add argument parsing and bolt ask stub`
- `feat: load and validate config from env`
- `chore: set up node:test`

## Phase 2: First LLM call

**What we learn:** calling a model API and streaming the response to the terminal. We also see how the choice of model affects behaviour.

**Goal:** `bolt ask "<prompt>"` sends the prompt to a model through OpenRouter and streams the reply.

**Tasks**

1. **Spike first, time-boxed to about half a day.** Call OpenRouter with a few candidate models, using the same prompt and one dummy tool. Record which models return well-formed tool calls, along with their latency and cost. Put the results in the issue as a short table. The spike result sets the default for `BOLT_MODEL`.
2. Define the `ModelClient` interface in `src/model/`, with a `complete` method (no streaming) and a `stream` method. Use our own message and tool types, not the vendor's.
3. Implement the OpenRouter client. It calls `https://openrouter.ai/api/v1/chat/completions` with `fetch` and parses the SSE stream by hand. Keep the parser small and tested. Don't add an SDK yet.
4. Connect `bolt ask` to the client. Stream text to stdout as it arrives.
5. Handle the errors that matter: a missing key (401), a rate limit (429), a network failure, and a stream that ends early. Each prints one clear line and exits with a non-zero code.
6. Tests use a fake `ModelClient` for the command tests and a saved response for the SSE parser. `npm test` makes no live network calls.
7. Add a manual smoke-test script, or a README section that shows the real call. Someone runs it by hand. It isn't part of CI.

**Acceptance criteria**

- [ ] `bolt ask "hello"` prints a streamed response and exits with code 0, matching the example in CONTRIBUTING.md.
- [ ] Changing `BOLT_MODEL` changes the model that gets called. A visible model name in verbose output or the response metadata confirms it.
- [ ] An invalid key prints an auth error and exits with code 1. It doesn't print a stack trace.
- [ ] Tests cover SSE parsing using a saved response, including a response split across chunks.
- [ ] `npm test` makes no network calls.
- [ ] The spike results are written up in the spike issue, with the chosen default model and the reason for it.

**Open questions for this phase**

- Does OpenRouter's model list change often enough that the default model id belongs in config rather than in code? Recommendation: config, with a sensible default.
- Do we keep a per-run log of requests and responses for learning? Recommendation: a `--verbose` flag, off by default, with the API key always redacted.

**Suggested issues (size M each)**

- `spike: compare OpenRouter models for tool calling` (learning spike, write-up in the issue)
- `feat: define ModelClient interface and message types`
- `feat: OpenRouter client with streaming`
- `feat: wire bolt ask to the model client`
- `test: SSE parser and fake client tests`

## Phase 3: Tool use (rough)

Define `read_file`, `write_file`, `list_dir` and `run_shell` as tools, each with a JSON schema. Parse the tool calls in the model's response and dispatch them. Send each tool result back to the model. Tool definitions are plain data, so tests can check them without calling a model.

Open: the tool-call format varies between models on OpenRouter. We may need a normaliser inside `src/model/`.

## Phase 4: Agent loop (rough)

The loop runs model, then tool call, then tool result, then model again. It stops when the model returns plain text or when `BOLT_MAX_STEPS` is reached. Each step gets logged so the loop is visible. Test the loop with a fake model that returns scripted tool calls.

## Phase 5: Safety (rough)

- Ask before `write_file` and `run_shell`. Support `--yes` for scripted use.
- Resolve every path against the working directory and refuse any path outside it, including `..` tricks and symlinks.
- Decide which shell commands count as risky. Start with a short deny list, and prompt for everything else.

Open: should `--yes` skip the path checks? Recommendation: no, never.

## Phase 6: Context management (rough)

Count tokens. An approximate count is fine to start. When the history nears the model's limit, summarise old turns, or drop tool output first. Decide which files get included automatically and which only on request.

Open: which tokenizer to use. Start with a rough character-based estimate, then decide whether an exact tokenizer is worth the dependency.

## Phase 7: Polish and evals (rough)

- Better output: colours, a spinner and a clear end-of-task summary.
- A small task suite. Each task is a folder with a starting repo state and a check script. Run the suite before and after a change to see whether it helps.

## Team

Two people. Each phase has one owner for its core piece. Owners rotate, so both of us understand the whole codebase.

| Phase | Core piece | Owner |
|---|---|---|
| 1 | CLI skeleton and config | TBD |
| 2 | ModelClient and OpenRouter client | TBD (the other person) |
| 3 | Tool definitions and handlers | TBD |
| 4 | Agent loop | TBD (the other person) |
| 5 | Safety | TBD |
| 6 | Context management | TBD |
| 7 | Evals | TBD |

Owners are set on the GitHub Project board, not in this file.

## Workflow

This follows [CONTRIBUTING.md](../CONTRIBUTING.md). In short: pick an issue from Todo, branch as `<type>/<number>-<short-name>`, open a PR early, link it with `Closes #n`, get a review, and squash-merge.

## Milestones and board

- One GitHub milestone per phase, Phase 1 to Phase 7.
- Issues for Phases 1 and 2 are created now. Each of Phases 3 to 7 gets one placeholder issue, with the rough notes above copied in.
- Board columns: Backlog, Todo, In Progress, In Review, Done.

## Open questions

None of these block Phase 1. Each should be answered before the phase it belongs to.

1. Which default OpenRouter model? The Phase 2 spike answers this.
2. Should bolt store any local state, such as history or a config file, or stay stateless in the first versions? Recommendation: stateless until Phase 6.
3. Which operating systems do we support? Development happens on Windows. Recommendation: Windows and Linux, tested by hand, with `run_shell` handled per platform in Phase 5.
4. Who owns each phase? See [Team](#team).
