# Tasks: Integración de Graphify CLI para Análisis y Navegación del Repositorio

**Input**: Design documents from `specs/007-integrate-graphify-cli/` (`plan.md`, `spec.md`, `data-model.md`, `research.md`, `quickstart.md`, `contracts/`)

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Testing for this tooling integration focuses on CLI command validation (`scripts/graphify.sh scan|report|view|query|clean`), Git isolation verification (`git status --short`), and regression verification of existing backend and frontend test suites per Constitution Principles III & IV.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Repository Root**: Tooling scripts in `scripts/`, documentation in `docs/` and `README.md`, personalizaciones in `.agents/skills/`
- **Web App Components**: `backend/src/`, `frontend/src/` (analyzed by Graphify; existing code and tests untouched)
- **Generated Artifacts**: `graphify-out/` (ephemeral, ignored by Git)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, Git hygiene, and script scaffolding

- [ ] T001 Configure Git exclusion rules for `graphify-out/`, `.graphify_*.json`, `.graphify_cache/`, and `.venv-graphify/` in `.gitignore`
- [ ] T002 [P] Create root `package.json` with npm convenience script `"graphify": "./scripts/graphify.sh"` and repository metadata
- [ ] T003 [P] Create project scripts directory and initialize executable runner shell script skeleton in `scripts/graphify.sh`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core execution runtime, environment detection, and offline safety enforcement for Graphify CLI that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Implement Python runtime version validation (`python3 >= 3.10`) and package management detection (`pipx`, `uv`, or local isolated `.venv-graphify`) in `scripts/graphify.sh`
- [ ] T005 [P] Implement offline safety enforcement, strict rejection of MCP flags/servers (`--mcp`, `graphify-mcp`), and rejection of cloud endpoints/hosted sync in `scripts/graphify.sh`
- [ ] T006 [P] Implement command-line argument parsing, subcommands dispatcher (`scan`, `report`, `view`, `query`, `clean`), and `--help` CLI interface in `scripts/graphify.sh` per `specs/007-integrate-graphify-cli/contracts/cli-runner.contract.md`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Generación Local del Grafo de Conocimiento del Repositorio (Priority: P1) 🎯 MVP

**Goal**: Analizar el código y documentación del repositorio generando de forma local y determinística los artefactos del grafo (`graphify-out/graph.json`, `graphify-out/graph.html`, `graphify-out/GRAPH_REPORT.md`) en menos de 2 minutos sin conexión a internet.

**Independent Test**: Ejecutar `./scripts/graphify.sh scan` en una copia limpia del repositorio y verificar que genera `graphify-out/graph.json`, `graphify-out/graph.html` y `graphify-out/GRAPH_REPORT.md` en < 2 minutos sin peticiones de red ni credenciales externas.

### Implementation for User Story 1

- [ ] T007 [US1] Implement repository target paths configuration (`target_paths: ['backend/src', 'frontend/src', 'specs', 'docs', 'docker-compose.yml']`) and ignore rules (`ignore_patterns: ['node_modules/**', 'dist/**', 'build/**', '.git/**', 'coverage/**', 'logs/**', 'postgres_data/**']`) in `scripts/graphify.sh`
- [ ] T008 [US1] Implement Tree-sitter AST scan execution and output directory management (`output_dir: graphify-out/`) in `scripts/graphify.sh`
- [ ] T009 [US1] Implement deterministic mode (`deterministic_mode: true`) and clean rerun flag `--clean` (clearing cache and regenerating `graph.json`, `graph.html`, and `GRAPH_REPORT.md`) in `scripts/graphify.sh`
- [ ] T010 [US1] Add error handling and return codes (0=success, 1=prerequisite failure, 2=scan failure) for the `scan` subcommand in `scripts/graphify.sh`

**Checkpoint**: At this point, User Story 1 is fully functional and can generate local repository knowledge graphs as an independent MVP.

---

## Phase 4: User Story 2 - Navegación y Consulta Local del Conocimiento del Repositorio (Priority: P2)

**Goal**: Consultar e inspeccionar interactivamente el grafo de conocimiento local, sus nodos de dominio (`Jugador`), controladores, servicios y relaciones arquitectónicas desde la terminal y desde Antigravity IDE sin servidores MCP.

**Independent Test**: Ejecutar `./scripts/graphify.sh report`, `./scripts/graphify.sh query jugador`, y `./scripts/graphify.sh view` sobre `graphify-out/`, y probar la invocación de la skill `/graphify` en Antigravity IDE.

### Implementation for User Story 2

- [ ] T011 [P] [US2] Implement `report` subcommand in `scripts/graphify.sh` to output central nodes (god nodes), Leiden communities, and architectural metrics from `graphify-out/GRAPH_REPORT.md` to stdout
- [ ] T012 [P] [US2] Implement `query <término>` subcommand in `scripts/graphify.sh` to search nodes and traverse relationships in `graphify-out/graph.json`
- [ ] T013 [US2] Implement `view` subcommand in `scripts/graphify.sh` to launch a zero-dependency local HTTP static server or open `graphify-out/graph.html` in the default browser without internet access
- [ ] T014 [US2] Create Antigravity Workspace Skill definition in `.agents/skills/graphify/SKILL.md` with trigger `/graphify`, prompt handling, offline rules, and architectural context navigation per `specs/007-integrate-graphify-cli/contracts/antigravity-skill.contract.md`

**Checkpoint**: At this point, User Stories 1 AND 2 work independently, enabling terminal and IDE knowledge navigation.

---

## Phase 5: User Story 3 - Integración en el Flujo de Desarrollo y Estandarización de Comandos (Priority: P3)

**Goal**: Estandarizar comandos en `package.json`, proveer limpieza de artefactos y documentar exhaustivamente el uso en español para desarrolladores y colaboradores.

**Independent Test**: Ejecutar `npm run graphify`, ejecutar `./scripts/graphify.sh clean`, verificar `git status --short` limpio sin archivos sin seguimiento, y revisar las guías en español en `docs/graphify.md` y `README.md`.

### Implementation for User Story 3

- [ ] T015 [US3] Implement `clean` subcommand in `scripts/graphify.sh` to wipe `graphify-out/`, `.graphify_cache/`, `.venv-graphify/`, and temporary JSON analysis files
- [ ] T016 [P] [US3] Configure npm execution script `"graphify": "./scripts/graphify.sh"` and executable file permissions (`chmod +x`) in `package.json` and `scripts/graphify.sh`
- [ ] T017 [P] [US3] Create comprehensive developer and architecture documentation in Spanish in `docs/graphify.md` covering prerequisites, installation, subcommands, exclusions, and offline guarantees
- [ ] T018 [US3] Update `README.md` with the new Graphify CLI section, architectural navigation instructions, and developer tooling guide in Spanish

**Checkpoint**: All user stories are now independently functional, integrated into npm scripts, and fully documented in Spanish.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation, hygiene, and non-regression guarantees across the entire repository

- [ ] T019 Verify Git isolation rules by running `git status --short` after executing all Graphify subcommands to confirm zero untracked artifacts per SC-004
- [ ] T020 [P] Run backend regression test suite via `npm --prefix backend run test:unit` to verify 100% test immutability and zero regressions (Constitution Principle IV)
- [ ] T021 [P] Run frontend test suite via `npm --prefix frontend test` to verify zero regressions on frontend components
- [ ] T022 Execute end-to-end quickstart validation following all scenarios in `specs/007-integrate-graphify-cli/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T001-T003) - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion (T004-T006)
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Uses `graphify-out/` artifacts generated by US1 `scan` or sample test graph
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Wraps runner commands in `package.json` and documents features

### Within Each User Story

- Prerequisites checks before implementation
- Core logic before interface integration
- Individual commands complete and verifiable before moving to next priority

### Parallel Opportunities

- **Phase 1**: T002 (`package.json`) and T003 (`scripts/graphify.sh`) can run in parallel with T001 (`.gitignore`).
- **Phase 2**: T005 (offline safety) and T006 (dispatcher/help) can proceed in parallel once T004 establishes runtime detection.
- **Phase 4**: T011 (`report` subcommand) and T012 (`query` subcommand) can be developed in parallel in `scripts/graphify.sh`.
- **Phase 5**: T016 (`package.json`) and T017 (`docs/graphify.md`) can proceed in parallel.
- **Phase 6**: T020 (backend tests) and T021 (frontend tests) can run in parallel.

---

## Parallel Example: User Story 2

```bash
# Developer A implements the report and query CLI handlers in scripts/graphify.sh:
Task: "T011 [P] [US2] Implement report subcommand in scripts/graphify.sh"
Task: "T012 [P] [US2] Implement query <término> subcommand in scripts/graphify.sh"

# Developer B crafts the Antigravity IDE Workspace Skill definition:
Task: "T014 [US2] Create Antigravity Workspace Skill definition in .agents/skills/graphify/SKILL.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`.gitignore`, `package.json`, `scripts/` skeleton)
2. Complete Phase 2: Foundational (runtime detection, offline enforcement, CLI dispatcher)
3. Complete Phase 3: User Story 1 (`scan` subcommand, AST extraction, deterministic output)
4. **STOP and VALIDATE**: Run `./scripts/graphify.sh scan` and verify that `graphify-out/graph.json`, `graphify-out/graph.html`, and `graphify-out/GRAPH_REPORT.md` are generated in < 2 minutes.
5. Deploy/commit MVP increment.

### Incremental Delivery

1. Complete Setup + Foundational → Tooling engine and security guards ready
2. Add User Story 1 → Local knowledge graph generation works (MVP!)
3. Add User Story 2 → Terminal inspection (`report`, `query`, `view`) and Antigravity IDE `/graphify` skill ready
4. Add User Story 3 → `npm run graphify`, `clean` subcommand, and complete documentation in Spanish in `docs/` and `README.md`
5. Run Phase 6 Polish → Verify zero Git contamination and 100% test immutability across backend and frontend suites.

---

## Notes

- `[P]` tasks = different files or decoupled functions, no blocking dependencies
- `[Story]` label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Adheres strictly to Constitution v1.1.0 (offline CLI only, no MCP, no cloud)
