# BQ-Microservices
Microservices for Beautinique

## Update All Dependency Packages => (npx npm-check-updates -u)


## Run all services from root

1. Install every microservice from the main folder:

```bash
npm run install:all
```

2. To run every service in separate VS Code integrated Bash terminals, use the root workspace task:

- Open Command Palette: `Ctrl+Shift+P`
- Run: `Tasks: Run Task`
- Select: `Install and run all microservices in VS Code`

3. If you only want to start the services without reinstalling, use:

- Open Command Palette: `Ctrl+Shift+P`
- Run: `Tasks: Run Task`
- Select: `Run all microservices in VS Code terminals`

Each service will open in its own VS Code integrated Bash terminal.

4. If you still want a single root command that installs and then starts everything outside VS Code tasks:

```bash
npm run all
```

This will:
- install dependencies for each microservice folder
- run the root scripts configured in `package.json`

You can also use:

```bash
npm run bootstrap
```

5. If you want to run all services without reinstalling from the root script:

```bash
npm run dev:all
```

6. To start all services in production mode using the root script:

```bash
npm run start:all
```
