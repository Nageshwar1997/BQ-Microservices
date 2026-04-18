const { existsSync, readdirSync } = require("fs");
const { join } = require("path");
const { spawn } = require("child_process");

const root = __dirname;
const scriptName = process.argv[2] === "start" ? "start:dev" : "dev";
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";

function getServices() {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(root, name, "package.json")))
    .sort((left, right) => left.localeCompare(right));
}

function toGitBashPath(windowsPath) {
  return windowsPath
    .replace(/\\/g, "/")
    .replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);
}

function findBashExecutable() {
  const candidates = [
    "C:\\Program Files\\Git\\git-bash.exe",
    "C:\\Program Files\\Git\\bin\\bash.exe",
    "C:\\Program Files (x86)\\Git\\git-bash.exe",
    "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
  ];

  return candidates.find((candidate) => existsSync(candidate)) || null;
}

function escapePowerShellString(value) {
  return value.replace(/'/g, "''");
}

const services = getServices();

if (services.length === 0) {
  console.error(
    "No microservice folders with package.json were found in the repository root.",
  );
  process.exit(1);
}

console.log(
  `Opening ${services.length} service${services.length > 1 ? "s" : ""} from the root folder...`,
);

const bashExecutable = isWindows ? findBashExecutable() : null;

services.forEach((service) => {
  const servicePath = join(root, service);
  console.log(`\n--- ${service}: npm run ${scriptName} ---`);

  if (isWindows && bashExecutable) {
    const bashCommand = `cd '${toGitBashPath(servicePath)}' && npm run ${scriptName}; exec bash`;
    const powerShellCommand = [
      "Start-Process",
      `-FilePath '${escapePowerShellString(bashExecutable)}'`,
      `-WorkingDirectory '${escapePowerShellString(servicePath)}'`,
      `-ArgumentList '-lc', '${escapePowerShellString(bashCommand)}'`,
    ].join(" ");

    spawn("powershell.exe", ["-NoProfile", "-Command", powerShellCommand], {
      shell: false,
      windowsHide: true,
    });
    return;
  }

  if (isWindows) {
    const powerShellCommand = [
      "Start-Process",
      "-FilePath 'cmd.exe'",
      `-WorkingDirectory '${escapePowerShellString(servicePath)}'`,
      `-ArgumentList '/k', 'npm run ${scriptName}'`,
    ].join(" ");

    spawn("powershell.exe", ["-NoProfile", "-Command", powerShellCommand], {
      shell: false,
      windowsHide: true,
    });
    return;
  }

  const child = spawn(npmCommand, ["run", scriptName], {
    cwd: servicePath,
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    console.log(`\n${service} exited with code ${code}`);
  });
});

if (isWindows && !bashExecutable) {
  console.log(
    "\nGit Bash was not found, so the services were opened in cmd windows instead.",
  );
}
