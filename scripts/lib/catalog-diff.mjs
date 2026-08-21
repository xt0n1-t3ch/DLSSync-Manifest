export const MAX_REMOVAL_RATIO = 0.15;

export function collectReleases(manifest) {
  const result = new Map();
  for (const [vendor, families] of Object.entries(manifest?.vendors ?? {})) {
    for (const [family, entry] of Object.entries(families ?? {})) {
      for (const release of entry?.releases ?? []) {
        result.set(`${vendor}/${family}/${release.filename}/${release.version}`, release.sha256);
      }
    }
  }
  return result;
}

export function diffCatalogs(before, after, { allowLargeRemoval = false } = {}) {
  const next = collectReleases(after);
  if (next.size === 0) throw new Error("refusing an empty catalog");
  if (!before) return { before: 0, after: next.size, added: next.size, removed: 0, changed: 0 };

  if (Date.parse(after.generated_at) < Date.parse(before.generated_at)) {
    throw new Error(`generated_at regressed: ${before.generated_at} -> ${after.generated_at}`);
  }

  const previous = collectReleases(before);
  const removed = [...previous.keys()].filter((key) => !next.has(key));
  const added = [...next.keys()].filter((key) => !previous.has(key));
  const changed = [...next].filter(([key, hash]) => previous.has(key) && previous.get(key) !== hash);
  const removalRatio = previous.size === 0 ? 0 : removed.length / previous.size;
  if (removalRatio > MAX_REMOVAL_RATIO && !allowLargeRemoval) {
    throw new Error(
      `refusing ${(removalRatio * 100).toFixed(1)}% release removal without ALLOW_LARGE_CATALOG_REMOVAL=1`,
    );
  }

  return {
    before: previous.size,
    after: next.size,
    added: added.length,
    removed: removed.length,
    changed: changed.length,
  };
}
