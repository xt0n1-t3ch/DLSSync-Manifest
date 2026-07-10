# DLSSync Signed Runtime Catalog

[![Catalog freshness](https://img.shields.io/github/last-commit/xt0n1-t3ch/DLSSync-Manifest/main?label=catalog%20freshness)](https://github.com/xt0n1-t3ch/DLSSync-Manifest/commits/main)
[![Schema and signature](https://github.com/xt0n1-t3ch/DLSSync-Manifest/actions/workflows/validate.yml/badge.svg)](https://github.com/xt0n1-t3ch/DLSSync-Manifest/actions/workflows/validate.yml)
[![Ed25519](https://img.shields.io/badge/catalog-Ed25519%20signed-19c37d)](manifest.json.sig)
[![JSON Schema 2020-12](https://img.shields.io/badge/schema-2020--12-5b8cff)](manifest.schema.json)
[![License](https://img.shields.io/github/license/xt0n1-t3ch/DLSSync-Manifest)](LICENSE)

DLL catalog consumed by [DLSSync](https://github.com/xt0n1-t3ch/DLSSync) — an open-source Windows updater that keeps DLSS, FSR, XeSS and DirectStorage DLLs in sync with NVIDIA, AMD, Intel and Microsoft publisher releases.

This repository holds nothing but the catalog data. The application code, manifest builder, and tests live in the [DLSSync](https://github.com/xt0n1-t3ch/DLSSync) repository.

Current app release line: `v1.7.0`. The public manifest remains `schema_version: 2` and is independently verifiable without installing DLSSync.

## Why this catalog is different

- **Detached Ed25519 signature:** a CDN cannot replace both payload and hash metadata without the private signing key.
- **Exact-byte verification:** the signature covers the precise `manifest.json` bytes cached by the application.
- **Declared provenance:** every release retains its source and download URL; binaries are never hosted in this repository.
- **Apply-time checks:** DLSSync verifies the expected file hash and requires the declared Authenticode publisher before changing a game.
- **Atomic recovery:** an invalid, empty, older, or unsigned refresh never replaces the last trusted catalog.
- **Public contract:** schema, signing key, verification script, semantic-diff gate, and live catalog page are all inspectable.

[Browse the live catalog](https://xt0n1-t3ch.github.io/DLSSync-Manifest/) or read the compact [`llms.txt`](llms.txt) index.

## What's in here

| File | Purpose |
|---|---|
| `manifest.json` | Canonical catalog. Generated hourly from declared upstream sources by CI. Do not hand-edit. |
| `manifest.json.sig` | Detached Ed25519 signature over the exact `manifest.json` bytes. |
| `manifest.schema.json` | JSON Schema (Draft 2020-12) that the manifest must validate against. |
| `.github/workflows/poll-upstream.yml` | Hourly cron that rebuilds `manifest.json` via the Rust `manifest-builder` from the DLSSync app repo. |
| `.github/workflows/validate.yml` | Schema, signature, and semantic validation on every push / PR. |
| `package.json` | Pinned validator toolchain used locally and in CI. |

## Public endpoint

The catalog is served via [jsDelivr](https://www.jsdelivr.com/), which mirrors GitHub raw content over a global CDN with a 12-hour edge cache:

```
https://cdn.jsdelivr.net/gh/xt0n1-t3ch/DLSSync-Manifest@main/manifest.json
```

DLSSync consumes this URL by default. Override at runtime via the `DLSSYNC_MANIFEST_URL` environment variable.

## Upstream sources

| Vendor | Family | Upstream | DLL filenames |
|---|---|---|---|
| NVIDIA | DLSS Super Resolution (`dlss_sr`) | [beeradmoore/dlss-swapper](https://github.com/beeradmoore/dlss-swapper) community archive | `nvngx_dlss.dll` |
| NVIDIA | DLSS Frame Generation (`dlss_fg`) | [beeradmoore/dlss-swapper](https://github.com/beeradmoore/dlss-swapper) community archive | `nvngx_dlssg.dll`, `sl.dlss_g.dll` |
| NVIDIA | DLSS Ray Reconstruction (`dlss_rr`) | [beeradmoore/dlss-swapper](https://github.com/beeradmoore/dlss-swapper) community archive | `nvngx_dlssd.dll`, `sl.dlss_d.dll` |
| NVIDIA | Streamline (`streamline`, `reflex`, `streamline_*`) | [NVIDIA-RTX/Streamline](https://github.com/NVIDIA-RTX/Streamline/releases) | `sl.interposer.dll`, `sl.reflex.dll`, `sl.common.dll`, `sl.pcl.dll`, `sl.nis.dll`, `sl.directsr.dll` |
| Intel | XeSS (`xess_sr`, `xess_sr_dx11`, `xess_fg`, `xell`) | [intel/xess](https://github.com/intel/xess/releases) | `libxess.dll`, `libxess_dx11.dll`, `libxess_fg.dll`, `libxell.dll` |
| AMD | FidelityFX SDK (`fsr_upscaler`, `fsr_fg`, `fsr_loader`) | [GPUOpen-LibrariesAndSDKs/FidelityFX-SDK](https://github.com/GPUOpen-LibrariesAndSDKs/FidelityFX-SDK/releases) | `amd_fidelityfx_*.dll`, `ffx_fsr3upscaler_x64.dll`, `ffx_frameinterpolation_x64.dll` |
| Microsoft | DirectStorage (`direct_storage`, `direct_storage_core`) | [Microsoft.Direct3D.DirectStorage on NuGet](https://www.nuget.org/packages/Microsoft.Direct3D.DirectStorage) | `dstorage.dll`, `dstoragecore.dll` |

The `cdn_url` field on every release points to its declared upstream asset. This repo does **not** mirror DLL binaries. Historical NVIDIA DLSS records, along with much of the AMD FSR and Intel XeSS back-catalog, currently use the established `dlss-swapper` community archive (MD5-hashed) because those vendors do not publish every historical redistributable as a stable first-party asset; those entries are labeled by source rather than being presented as vendor-direct. DLSSync still verifies their recorded hash and Authenticode publisher at install time.

## Independent verification

```pwsh
npm ci
npm run validate
npm run verify-signature
npm run semantic-diff
```

Production Ed25519 public key:

```text
e9dd0828f9ee5ecb72e0a811723a79c6e5373ca1c20bd5b255d68a2b3928fcd3
```

## Schema

The manifest validates against `manifest.schema.json` (Draft 2020-12). The current schema version is `2`. Each release entry carries:

```json
{
  "version": "310.6.0",
  "version_packed": 87169138736103424,
  "filename": "nvngx_dlss.dll",
  "sha256": "<64-hex SHA-256, or 32-hex MD5 for dlss-swapper-sourced entries>",
  "size_bytes": 1234567,
  "signed": true,
  "released_at": "2026-04-15T00:00:00Z",
  "source": "NVIDIA/DLSS@v310.6.0",
  "cdn_url": "https://github.com/.../release/asset.zip",
  "release_notes": "...",
  "signature_subject": "NVIDIA Corporation",
  "channel": "stable",
  "is_dev": false,
  "min_driver": null
}
```

Optional top-level `anti_cheat_binaries` entries carry manifest-supplied anti-cheat binary filename signatures. The DLSSync builder omits the field when it is empty, and the app treats a missing field as an empty list for backward compatibility.

## Why a separate repository

1. The manifest rebuilds on an hourly cron. Keeping it in the app repo would pollute the git log of the application code with hundreds of `chore: rebuild manifest` commits.
2. jsDelivr caches per commit SHA. Refreshing the catalog should not invalidate the app's CDN entries.
3. The catalog is a public service — other tools (Vortex extensions, CLIs, mod managers) can consume it without depending on the app codebase.

## Build locally

The builder lives in the app repo, not here:

```pwsh
git clone https://github.com/xt0n1-t3ch/DLSSync.git
cd DLSSync
cargo run --release -p manifest-builder -- --out manifest.json
```

Then validate against the schema:

```pwsh
npx --yes -p ajv-cli@5.0.0 -p ajv-formats@3.0.1 ajv validate -c ajv-formats -s manifest.schema.json -d manifest.json --strict=false --spec=draft2020 --all-errors
node .github/scripts/verify-manifest-signature.mjs manifest.json manifest.json.sig
```

## License

Apache-2.0 for the catalog metadata, schema and workflows. Each linked DLL retains the EULA of its original publisher (NVIDIA, AMD, Intel, Microsoft). The manifest does not redistribute DLL binaries; it indexes their authoritative upstream locations.
