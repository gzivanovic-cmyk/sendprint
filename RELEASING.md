# Releasing SendPrint Bridge

The bridge ships as a single multi-arch Docker image published to GitHub
Container Registry (GHCR). The image name is **always the GitHub
repository slug** — `.github/workflows/release.yml` publishes to
`ghcr.io/${{ github.repository }}`, so you never have to configure it.

```
ghcr.io/OWNER/REPO
```

Throughout this document, replace `OWNER/REPO` with whatever appears
after `github.com/` in the repo URL (e.g. `acme/sendprint` →
`ghcr.io/acme/sendprint`).

Releases are fully automated by `.github/workflows/release.yml`. You cut
a release by pushing a git tag; the workflow builds for
`linux/amd64` **and** `linux/arm64` and pushes the resulting image with
all the relevant tags.

## Versioning

We use [Semantic Versioning](https://semver.org/):

- **MAJOR** — breaking change for operators (env var renamed, volume
  layout changed, manual migration required).
- **MINOR** — new feature, backwards-compatible.
- **PATCH** — bug fix, no behaviour change for operators.

Tags are always prefixed with `v`: `v1.0.0`, `v1.2.0`, `v1.2.1`.

## Cutting a release

1. Make sure `main` is green and contains everything you want to ship.
2. Update any user-facing notes (CHANGELOG, INSTALL.md if env vars
   changed, etc.) and merge that PR.
3. Tag the merge commit and push the tag:

   ```bash
   git checkout main
   git pull
   git tag -a v1.2.3 -m "v1.2.3"
   git push origin v1.2.3
   ```

4. The **Release bridge image** workflow runs automatically. When it
   finishes, the following tags are published:

   | Git tag  | Image tags pushed                                                 |
   | -------- | ----------------------------------------------------------------- |
   | `v1.2.3` | `1.2.3`, `1.2`, `1`, `latest`, `sha-<short>`                      |

   - `latest` always points at the newest tagged release.
   - `1` / `1.2` let operators pin to a major or minor line and still
     get patch updates.
   - `sha-<short>` is the immutable, exact build for that commit.

5. Verify the image exists and pulls on both architectures:

   ```bash
   docker buildx imagetools inspect ghcr.io/OWNER/REPO:1.2.3
   ```

   You should see both `linux/amd64` and `linux/arm64` in the manifest
   list.

## One-off / pre-release builds

Use the workflow's **Run workflow** button (`workflow_dispatch`) to
build an image from any branch without cutting a real release. The
optional `tag` input becomes an additional image tag — useful for
beta builds, e.g. `1.3.0-rc1`. `latest` is **not** moved by manual
runs.

## Mirroring to another registry

Operators who don't want to pull from GHCR can re-tag and push to
Docker Hub or a private registry:

```bash
docker pull ghcr.io/OWNER/REPO:1.2.3
docker tag  ghcr.io/OWNER/REPO:1.2.3  registry.example.com/sendprint:1.2.3
docker push registry.example.com/sendprint:1.2.3
```

## Rolling back

Every release stays in GHCR. To roll back, pull the previous tag and
recreate the container — the `/data` volume is preserved across
versions:

```bash
docker pull ghcr.io/OWNER/REPO:1.2.2
docker compose up -d
```

If a release is genuinely broken, additionally re-point `latest`:

```bash
docker buildx imagetools create \
  --tag ghcr.io/OWNER/REPO:latest \
  ghcr.io/OWNER/REPO:1.2.2
```
