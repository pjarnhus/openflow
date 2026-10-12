# Agents
The *openflow* design implements several agents.
All but the `Junior Developer` are part of the flow.
`Junior Developer` is simply a utility agent for doing quick, simple tasks.

| Agent name | Agent description |
|---|---|
| Developer | Implements code solutions that strictly adhere to task requirements. Focuses on minimal, efficient, and maintainable code that passes the provided test suite. Follows tool stack and code standards. |
| Junior Developer | Executes instructions literally with minimal agency. Follows core rules: follow instructions literally, do not make decisions, do not problem-solve creatively, ask when unclear, do not invent requirements, stay in scope, be honest about limits, and report rather than explain. |
| Lead Developer | Breaks down implementation plans into executable tasks for each phase. Translates high-level plans into actionable, testable units of work. Focuses on task decomposition and documentation. |
| Mental Model Checker | Checks that the user's mental model of the solution is still valid after a phase. Finds drift through conversation and documents the phase. Questions the user about structure and design decisions. |
| Phase Reviewer | Reviews finished phases against acceptance criteria. Updates progress checklists and writes agent-facing coding standards. Reports findings and lets the user decide. |
| Requirement Analyst | Uncovers and documents non-technical requirements from the user. Produces the system requirements specification in `docs/specs.md` using the project's ubiquitous language (glossary). Focuses exclusively on user needs, constraints, and expectations without technical implementation details. |
| Technical Architect | Interprets non-technical requirements and designs technical solutions in phases. Produces `docs/tool_stack.md`, `docs/architecture.md` (C4-model), `docs/plan.md`, and `docs/code_standards.md`. Records architecture decisions in ADRs. Ensures phases are testable and contained within user stories. |
| Test Writer | Writes executable unit tests for each task. Ensures implementation meets acceptance criteria and adheres to the test framework. Focuses on minimal, focused tests that verify correctness. |
| User Story Writer | Converts non-technical requirements from `docs/specs.md` into clear, actionable user stories. Phrases each story from the end user's perspective using the format "As a [role], I want [goal], so that [benefit]." Reviews user personas, functional requirements, and success criteria to derive stories that capture all system functionality. |

# Tools
The core of the persistent information sits in the business terms and their link to the
code. This is kept in the `terms/` directory.
The agents never directly reads or writes from this folder, but interact with it through
the tool set below.

| Tool name | Tool description |
|---|---|
| setDefinition | Set the business-language DEFINITION of a glossary term. Owner: requirements agent. Creates new terms (status=proposed). Fails with the current value if a different definition exists unless force=true. Cannot modify deprecated terms. |
| setImplementation | Set the IMPLEMENTATION mapping of a glossary term: where in the codebase the term is relevant and how, as responsibilities and module names, not file paths. Owner: phase reviewer. Fails with the current value if a different implementation exists unless force=true. Cannot modify deprecated terms. |
| proposeChange | Propose a change to an existing term's definition or implementation. Append-only: the proposal lands in the term's proposals[] buffer and is NOT applied. Applied only at sprint-end consolidation. Available to requirements, technical_architect, and phase_reviewer. Cannot modify status, aliases, or related_terms; those are consolidation-only. |
| getTerms | Free-text search over all term files. Returns matching terms with status, definition, and matching lines. Use this to look up terms by name, alias, or any text in the definition/implementation. |
| listTerms | List all glossary terms from the generated index (name, status, aliases, open proposal count). Suitable for compact injection of the term list into an agent's context. |
| applyProposal | CONSOLIDATION ONLY. Apply a specific proposal to a term's ratified field, with rationale. If multiple proposals target the same field, they must be resolved one by one explicitly. The applied proposal is recorded in the decision log. |
| rejectProposal | CONSOLIDATION ONLY. Reject a proposal with rationale, recorded in the decision log. |
| regenerateIndex | Regenerate docs/terms/_index.json from the term files: name, status, aliases, open proposal count. Run at sprint end after consolidation. Also used to change status (active/deprecated) via promoteStatus. |
| promoteStatus | CONSOLIDATION ONLY. Change a term's status: proposed->active, active->deprecated, or deprecated->active (reactivation). Deprecation requires a rationale. Regenerates the index automatically. |
