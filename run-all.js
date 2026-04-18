const { spawn } = require("child_process");
const { readdirSync, statSync, existsSync } = require("fs");
const { join } = require("path");

const root = __dirname;
const mode = process.argv[2] === "start" ? "start:dev" : "dev";

const services = readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => existsSync(join(root, name, "package.json")));

if (services.length === 0) {
  console.error("No microservice folders found in the repository root.");
  process.exit(1);
}

console.log(
  `Starting ${services.length} service${services.length > 1 ? "s" : ""} in ${mode} mode...`,
);

const children = services.map((service) => {
  const servicePath = join(root, service);
  console.log(`\n--- ${service} ---`);
  const child = spawn("npm", ["run", mode], {
    cwd: servicePath,
    shell: true,
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    console.log(`\n${service} exited with code ${code}`);
  });

  return child;
});

process.on("SIGINT", () => {
  children.forEach((child) => {
    if (!child.killed) child.kill("SIGINT");
  });
  process.exit();
});
