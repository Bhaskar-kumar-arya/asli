# services/

Each Lambda service lives in its own package here, e.g. `services/scan-api/`, `services/ingestion/`.
Lanes add a package folder with its own `package.json` (add it to the pnpm workspace glob `services/*`
automatically - no root config edit needed) and a matching CDK construct under `infra/lib/lanes/`.
