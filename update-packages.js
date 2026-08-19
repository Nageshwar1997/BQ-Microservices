// Updates every `@beautinique/*` dependency, in every microservice, to its
// latest published version.
//
// Default (no args) - `npm update <matched @beautinique/* deps>` per service:
// picks up a newer version within the existing `^x.y.z` range in that
// service's package.json (e.g. after `BQ-Packages` gets republished) without
// touching any other dependency. `npm update` only rewrites package-lock.json
// by design - it deliberately leaves the saved range in package.json alone -
// so afterwards this also rewrites each updated dep's saved range in
// package.json to `^<the version actually installed>`, so the manifest
// itself shows the new floor instead of silently drifting out of sync with
// the lockfile.
//
//   node update-packages.js
//
// Optional target (patch|minor|major) - rewrites the `^x.y.z` range itself
// via `npm-check-updates`, scoped to just `@beautinique/*`, then installs:
//
//   node update-packages.js minor
//
const { spawnSync } = require("child_process");
const { existsSync, readdirSync, readFileSync, writeFileSync } = require("fs");
const { join } = require("path");

const root = __dirname;
const isWindows = process.platform === "win32";

const SCOPE = "@beautinique/";
const VALID_TARGETS = ["patch", "minor", "major"];
const target = process.argv[2];

if (target && !VALID_TARGETS.includes(target)) {
  console.error(`Invalid target "${target}" - expected one of: ${VALID_TARGETS.join(", ")}.`);
  process.exit(1);
}

function getServices() {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(root, name, "package.json")))
    .sort((left, right) => left.localeCompare(right));
}

function getBeautiniqueDeps(servicePath) {
  const pkg = JSON.parse(readFileSync(join(servicePath, "package.json"), "utf8"));
  const names = new Set();

  for (const field of ["dependencies", "devDependencies"]) {
    for (const name of Object.keys(pkg[field] || {})) {
      if (name.startsWith(SCOPE)) {
        names.add(name);
      }
    }
  }

  return [...names];
}

// `npm`/`npx` are `.cmd` shims on Windows - `child_process.spawnSync` can't
// exec those directly (`EINVAL`) without `shell: true`, so route through
// `cmd.exe /c` there, same as `install-all.js`/`run-all.js` already do.
function run(args, cwd) {
  const result = isWindows
    ? spawnSync("cmd.exe", ["/c", ...args], { cwd, stdio: "inherit" })
    : spawnSync(args[0], args.slice(1), { cwd, stdio: "inherit" });

  return result.status === 0;
}

// After a plain `npm update`, rewrites each dep's saved range in
// package.json to `^<version actually installed in node_modules>` -
// `npm update` alone never touches package.json, only package-lock.json.
function syncPackageJsonToInstalled(servicePath, deps) {
  const pkgPath = join(servicePath, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  let changed = false;

  for (const dep of deps) {
    const installedPkgPath = join(servicePath, "node_modules", dep, "package.json");

    if (!existsSync(installedPkgPath)) {
      continue;
    }

    const { version } = JSON.parse(readFileSync(installedPkgPath, "utf8"));
    const newRange = `^${version}`;

    for (const field of ["dependencies", "devDependencies"]) {
      if (pkg[field]?.[dep] && pkg[field][dep] !== newRange) {
        console.log(`  ${dep}: ${pkg[field][dep]} -> ${newRange}`);
        pkg[field][dep] = newRange;
        changed = true;
      }
    }
  }

  if (changed) {
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }

  return changed;
}

const services = getServices();

if (services.length === 0) {
  console.error("No microservice folders with package.json were found in the repository root.");
  process.exit(1);
}

console.log(
  target
    ? `Bumping @beautinique/* ranges (${target}) across ${services.length} service(s)...`
    : `Updating @beautinique/* packages to their latest version within range, across ${services.length} service(s)...`,
);

let hadFailure = false;

for (const service of services) {
  const servicePath = join(root, service);
  const beautiniqueDeps = getBeautiniqueDeps(servicePath);

  if (beautiniqueDeps.length === 0) {
    console.log(`\n--- ${service}: no @beautinique/* dependencies, skipping ---`);
    continue;
  }

  console.log(`\n--- ${service}: ${beautiniqueDeps.join(", ")} ---`);

  const ok = target
    ? run(
        [
          "npx",
          "npm-check-updates",
          "-u",
          "--target",
          target,
          "--filter",
          beautiniqueDeps.join(","),
        ],
        servicePath,
      ) && run(["npm", "install"], servicePath)
    : run(["npm", "update", ...beautiniqueDeps], servicePath);

  if (!ok) {
    console.error(`\nUpdate failed for ${service}.`);
    hadFailure = true;
    continue;
  }

  // `ncu -u` (target mode) already rewrites package.json itself - only the
  // default `npm update` path needs the manifest synced by hand.
  if (!target) {
    syncPackageJsonToInstalled(servicePath, beautiniqueDeps);
  }
}

if (hadFailure) {
  console.error("\nSome services failed to update - see above.");
  process.exit(1);
}

console.log("\nAll @beautinique/* packages are up to date.");
