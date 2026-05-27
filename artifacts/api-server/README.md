# SendPrint API server

HTTP bridge that receives ZPL print jobs from Promesse and forwards them to a Zebra GK420d label printer over TCP:9100.

## Storage modes

The server supports two storage backends, selected by the `STORAGE` environment variable:

| Mode | Use case | Default location |
| --- | --- | --- |
| `sqlite` | **Local install at the customer (shipped default).** Single file on disk, no separate database service. | `./data/sendprint.db` |
| `postgres` | Development inside Replit, or any environment where a Postgres database is already available. | Reads `DATABASE_URL` |

### Default
- If `STORAGE` is not set, the server uses **SQLite**.
- In the Replit dev workflow, `STORAGE=postgres` is set automatically by the `dev` script so Postgres is used during development.

### Configuring SQLite
- The database file is created automatically on first start; no manual migration step is required.
- The directory containing the file is created if it does not exist.
- Override the location with `DATA_DIR` (e.g. `DATA_DIR=/var/lib/sendprint` puts the DB at `/var/lib/sendprint/sendprint.db`).

### Configuring Postgres
- Set `DATABASE_URL` to a standard Postgres connection string.
- Apply the schema with `pnpm --filter @workspace/db run push` before starting the server.

### Switching between modes
Each backend stores its own data; switching modes does not migrate existing data. A fresh install for each customer is expected.

### Native binaries for SQLite
`libsql` resolves a prebuilt native binary at install time via its `optionalDependencies` (one of `@libsql/<os>-<arch>-<libc>`). This package pins `@libsql/linux-x64-gnu` explicitly because that is the target Docker image (Task #6). If you build for a different platform (arm64, musl, macOS, Windows), replace that pin with the matching `@libsql/*` package, or remove the pin and ensure `pnpm install` resolves optional dependencies on the build host.

## Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/print` | `X-API-Key` header | Promesse-compatible endpoint. Receives `{ zpl, source? }`, forwards to the configured printer. |
| `POST` | `/api/test-print` | none | Sends a built-in test label. |
| `GET`  | `/api/printer/status` | none | TCP reachability check against the configured printer. |
| `GET`  | `/api/config` | none | Returns the current configuration. |
| `PUT`  | `/api/config` | none | Updates printer IP/port, server port, or API key. |
| `POST` | `/api/config/rotate-key` | none | Generates a new random API key. |
| `GET`  | `/api/logs` | none | Recent print jobs (most recent first). |
| `GET`  | `/api/logs/stats` | none | Aggregated counters. |
| `POST` | `/api/logs/clear` | none | Deletes all print job history. |
