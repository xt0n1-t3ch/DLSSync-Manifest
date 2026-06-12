# DLSSync-Manifest

DLL catalog consumed by [DLSSync](https://github.com/xt0n1-t3ch/DLSSync) — an open-source Windows updater that keeps DLSS, FSR, XeSS and DirectStorage DLLs in sync with NVIDIA, AMD, Intel and Microsoft publisher releases.

This repository holds nothing but the catalog data. The application code, manifest builder, and tests live in the [DLSSync](https://github.com/xt0n1-t3ch/DLSSync) repository.

Current app release line: `v1.6.9`. The manifest schema remains `schema_version: 2`; v1.6.9 only hardens validation, signing, and the generated catalog shape.

## What's in here

| File | Purpose |
|---|---|
| `manifest.json` | Canonical catalog. Generated hourly from upstream sources by CI. Do not hand-edit. |
| `manifest.json.sig` | Detached Ed25519 signature over the exact `manifest.json` bytes. |
| `manifest.schema.json` | JSON Schema (Draft 2020-12) that the manifest must validate against. |
| `.github/workflows/poll-upstream.yml` | Hourly cron that rebuilds `manifest.json` via the Rust `manifest-builder` from the DLSSync app repo. |
| `.github/workflows/validate.yml` | Schema validation on every push / PR. |

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

The `cdn_url` field on every release points to the upstream GitHub release asset or NuGet flat-container URL. This repo does **not** mirror DLL binaries — DLSSync downloads them directly from the publisher, verifies the SHA-256 against the manifest, and verifies the Authenticode publisher subject at install time.

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
