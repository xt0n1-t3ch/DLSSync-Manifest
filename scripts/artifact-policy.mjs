export function validateArtifactPolicy(manifest) {
  const ids = new Set();
  const artifacts = [];
  for (const [vendor, families] of Object.entries(manifest.vendors)) {
    for (const [family, entry] of Object.entries(families)) {
      for (const release of entry.releases) {
        const length = release.hash_algorithm === "md5" ? 32 : release.hash_algorithm === "sha256" ? 64 : 0;
        if (!length || !new RegExp(`^[0-9a-f]{${length}}$`, "i").test(release.sha256)) {
          throw new Error(`declared hash algorithm mismatch: ${vendor}/${family}/${release.filename}`);
        }
        const artifact = release.artifact;
        if (!artifact) continue; // Explicit legacy entries retain their recorded hash algorithm.
        if (artifact.family !== family || artifact.filename !== release.filename
            || artifact.file_version !== release.version || artifact.architecture !== "x64"
            || artifact.source_url !== release.cdn_url || artifact.archive_entry !== (release.zip_entry ?? null)
            || artifact.hash.algorithm !== release.hash_algorithm || artifact.hash.digest !== release.sha256
            || BigInt(artifact.size_bytes) !== BigInt(release.size_bytes)) {
          throw new Error(`artifact identity mismatch: ${artifact.id}`);
        }
        if (artifact.signature_status === "verified" && !artifact.observed_publisher) {
          throw new Error(`verified signature has no observed publisher: ${artifact.id}`);
        }
        if (ids.has(artifact.id)) throw new Error(`duplicate artifact: ${artifact.id}`);
        ids.add(artifact.id);
        artifacts.push(artifact);
      }
    }
  }
  for (const artifact of artifacts) {
    for (const dependency of artifact.dependencies) {
      if (dependency === artifact.id || !ids.has(dependency)) throw new Error(`invalid dependency: ${artifact.id} -> ${dependency}`);
    }
  }
}
