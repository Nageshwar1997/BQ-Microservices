const { spawnSync } = require("child_process");
const { existsSync, readdirSync } = require("fs");
const { join } = require("path");

const root = __dirname;
const isWindows = process.platform === "win32";

function getServices() {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(root, name, "package.json")))
    .sort((left, right) => left.localeCompare(right));
}

const services = getServices();

if (services.length === 0) {
  console.error(
    "No microservice folders with package.json were found in the repository root.",
  );
  process.exit(1);
}

console.log(
  `Found ${services.length} microservice${services.length > 1 ? "s" : ""}: ${services.join(", ")}`,
);

for (const service of services) {
  const servicePath = join(root, service);
  console.log(`\nInstalling dependencies for ${service}...`);

  const result = isWindows
    ? spawnSync("cmd.exe", ["/c", "npm", "install"], {
        cwd: servicePath,
        stdio: "inherit",
      })
    : spawnSync("npm", ["install"], {
        cwd: servicePath,
        stdio: "inherit",
      });

  if (result.status !== 0) {
    console.error(`\nInstallation failed for ${service}.`);
    process.exit(result.status || 1);
  }
}

console.log("\nAll microservice dependencies are installed.");
