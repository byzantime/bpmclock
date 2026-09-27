# Agent notes

- Python 3.12, managed with uv (`uv sync`, `uv run python main.py` builds into `build/`).
- Python code carries no comments and no docstrings over 7 content lines. Pragmas
  (`# noqa`, `# type:`, `# pragma:` etc.) are exempt. Enforced by the `stifle` gate in
  `.sekreton/config.toml`; Jinja, JS and CSS are out of scope. New Python files must be
  added to the stifle command there.
- Formatting and linting use ruff only (dev dependency), not black.

Local commands:

```sh
uvx --python 3.12 stifle==1.1.0 check --isolated --max-doc-lines 7 main.py
uvx --python 3.12 stifle==1.1.0 format --isolated --max-doc-lines 7 main.py
uv run ruff format .
uv run ruff check --fix .
```
