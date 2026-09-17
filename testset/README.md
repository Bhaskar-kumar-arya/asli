# testset/

Local test images and fixtures for the accuracy harness (lane E) and scanning work (lane C/A3).

- `strips/` - photos of medicine strips (30 target, see plan/INTEGRATION_LOG.md lane E row)
- `bills/` - pharmacy bill photos (10 target)
- `expected.json` - expected extraction/match results per file, used by `tools/accuracy`

None of these files are committed with real patient data. Do not put personal info in filenames or fixtures - see docs/PRIVACY.md.
