const manifest = await fetch("./manifest.json").then((response) => response.json());
const families = Object.values(manifest.vendors).flatMap((vendor) => Object.values(vendor));
const set = (id, value) => {
  document.getElementById(id).textContent = value;
};
set("vendors", Object.keys(manifest.vendors).length);
set("families", families.length);
set("releases", families.reduce((total, family) => total + family.releases.length, 0));
set("freshness", new Date(manifest.generated_at).toLocaleString());
