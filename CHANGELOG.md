# Changelog

## v1.0.0 - 2026-03-22

### Added

- `opengoat why` to resolve active intervention prompts.
- Automatic weekly mission generation from the active path.
- Shared progress calculation utilities for gap, dashboard, and log flows.
- Release-focused tests for migrations, intervention resolution, and progress math.

### Fixed

- Unified CLI versioning around `1.0.0`.
- Fixed `doctor` to inspect the real `opengoat.db` location.
- Added database migration support for legacy `paths`, `missions`, `week_scores`, and `logs` layouts.
- Fixed mission persistence to use the live schema and record completion timestamps.
- Fixed provider preference drift between `init` and the interactive shell.
- Fixed score rank thresholds so `Recruit`, `Operator`, `Ghost`, and `Apex` map consistently.
- Fixed `reset` so missions are cleared with other goal data.
- Fixed package exports and runtime dependency declarations for release packaging.

### Changed

- `opengoat` with no arguments now shows help instead of dropping into the experimental shell.
- `interactive` is now an explicit command.
- README has been rewritten to match the shipped feature set and release workflow.
- Build no longer executes the CLI as a post-build side effect.
