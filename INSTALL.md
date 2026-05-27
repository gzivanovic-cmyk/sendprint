# Installing SendPrint Bridge

SendPrint is a small web service that runs **next to** the Zebra label
printer on the customer's own network. Promesse POSTs ZPL to it over
HTTP; the bridge forwards each job to the printer over TCP:9100 and
keeps a local history.

The bridge ships as a single Docker image. It runs on any machine that
can run Docker — a Linux server, a Windows machine with Docker Desktop,
a Synology NAS, a Raspberry Pi 4/5, an Intel NUC, etc.

## Prerequisites

- A machine on the **same LAN as the Zebra printer**, reachable from
  Promesse (typically by static IP).
- Docker Engine 20.10+ (or Docker Desktop on Windows / macOS).
- The printer's IP address and TCP port (default `9100`).

## Quick start — `docker run`

```bash
docker run -d \
  --name sendprint \
  --restart unless-stopped \
  -p 8080:8080 \
  -v sendprint-data:/data \
  -e ADMIN_PASSWORD='choose-a-strong-password' \
  sendprint:latest
```

That's it. Open `http://<host-ip>:8080` in a browser, sign in with the
password you just set, and on the **Configuration** page enter the
printer's IP. Use the **Test print** button to send a label.

## Quick start — `docker compose`

A ready-to-edit `docker-compose.yml` ships with the project:

```bash
# Edit ADMIN_PASSWORD first, then:
docker compose up -d
```

## Pointing Promesse at the bridge

On the dashboard's **Configuration** page you'll find an **API key**.
Configure Promesse to POST raw ZPL to:

```
POST  http://<host-ip>:8080/api/print
Content-Type: text/plain
X-API-Key: <the key shown on the dashboard>

^XA
... your ZPL ...
^XZ
```

Promesse is the only endpoint that talks to `/api/print`; the rest of
the dashboard is locked behind the admin password.

## Environment variables

| Variable           | Default     | Description |
| ------------------ | ----------- | ----------- |
| `PORT`             | `8080`      | Port the bridge listens on inside the container. |
| `ADMIN_PASSWORD`   | _(unset)_   | Seeds the admin password on first start. Ignored once an admin already exists — change the password from the dashboard after that. |
| `PROMESSE_ORIGIN`  | _(any)_     | If set, only requests from this `Origin` may CORS-call `/api/print`. Recommended in production. |
| `SESSION_TTL_DAYS` | `7`         | How long a dashboard login stays valid. |
| `STORAGE`          | `sqlite`    | Storage backend. Leave as `sqlite` for the local install. |
| `DATA_DIR`         | `/data`     | Where the SQLite database file lives inside the container. |

## Data, backups & upgrades

All persistent state — the SQLite database with configuration, the
admin password hash, and the print history — lives in the
**`/data` volume**. That is the only thing you need to back up.

- **Back up:**
  ```bash
  docker run --rm -v sendprint-data:/data -v "$PWD":/backup alpine \
    tar czf /backup/sendprint-backup.tgz -C /data .
  ```
- **Restore:**
  ```bash
  docker run --rm -v sendprint-data:/data -v "$PWD":/backup alpine \
    tar xzf /backup/sendprint-backup.tgz -C /data
  ```
- **Upgrade:** pull the new image and recreate the container. The
  volume is preserved.
  ```bash
  docker pull sendprint:latest
  docker compose up -d   # or: docker rm -f sendprint && docker run ...
  ```

`restart: unless-stopped` (set in the compose file, or via
`--restart unless-stopped` on `docker run`) means the bridge comes back
automatically after a host reboot or a crash.

## Building the image yourself

The repository contains the multi-stage `Dockerfile` used to produce
the image. To build for the host architecture:

```bash
docker build -t sendprint:local .
```

To build a multi-architecture image (x86 servers **and** Raspberry Pi)
and push it to your own registry, use `docker buildx`:

```bash
docker buildx create --use --name sendprint-builder   # one-time
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag your-registry.example.com/sendprint:1.0.0 \
  --push \
  .
```

## Troubleshooting

- **Dashboard shows "printer offline":** confirm the printer IP/port
  from the host running the container with
  `nc -vz <printer-ip> 9100`. The bridge can only reach what the host
  can reach.
- **Forgot the admin password:** stop the container, delete the SQLite
  file (`docker run --rm -v sendprint-data:/data alpine rm /data/sendprint.db`)
  and start again with a fresh `ADMIN_PASSWORD`. This also wipes the
  print history, so back up first if you care about it.
- **Logs:** `docker logs -f sendprint`.
