// The v2 catalog serves Windows x64 clients. Signed bytes can still be wrong for
// that platform. The app also checks PE Machine before modifying a game.
export function validateArchitecturePolicy(manifest) {
  for (const [vendor, families] of Object.entries(manifest.vendors ?? {})) {
    for (const [family, entry] of Object.entries(families)) {
      for (const release of entry.releases ?? []) {
        const identity = `${vendor}/${family}/${release.filename}/${release.version}`;
        const source = `${release.cdn_url} ${release.zip_entry ?? ""}`.toLowerCase();
        if (/aarch64|arm64|(?:^|[/.\s-])win32(?:[/.\s-]|$)|(?:^|[/.\s-])x86(?:[/.\s-]|$)/.test(source)) {
          throw new Error(`incompatible architecture in x64 catalog: ${identity}`);
        }
        if (release.zip_entry) {
          const path = release.zip_entry.replaceAll("\\", "/");
          if (path.startsWith("/") || path.includes(":") || path.split("/").includes("..")) {
            throw new Error(`unsafe archive path: ${identity}`);
          }
          if (path.split("/").at(-1).toLowerCase() !== release.filename.toLowerCase()) {
            throw new Error(`archive entry does not match artifact identity: ${identity}`);
          }
        }
      }
    }
  }
}
