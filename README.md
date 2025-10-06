# asstus-sites
landing pages to describe asstus's products and professional services 

# Technolog

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

```bash
cd codebase && yarn
```

## Local Development

```bash
cd codebase && yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
cd codebase && yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

Using SSH:

```bash
USE_SSH=true cd codebase && yarn deploy
```

Not using SSH:

```bash
GIT_USER=<Your GitHub username> cd codebase && yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.
