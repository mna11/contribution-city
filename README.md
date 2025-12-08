# GitHub Contribution City

![Contribution City](./example.svg)

[English](README.md) | [한국어](docs/README.ko.md)

---

## Overview

This project generates an isometric 3D city based on your GitHub commits from the last 7 days. Each building represents a day's commits — the more commits, the bigger the building!

<br>

## Building Types

| Commits | Building | Preview |
|---------|----------|---------|
| 0 | No building | - |
| 1-3 | Lantern (Xsmall.svg) | ![Xsmall](./assets/Xsmall.svg) |
| 4-6 | Blue House (Small.svg) | ![Small](./assets/Small.svg) |
| 7-9 | Mansion (Middle.svg) | ![Middle](./assets/Middle.svg) |
| 10+ | Red Tower (Big.svg) | ![Big](./assets/Big.svg) |

<br>

## Setup

### Step 1. Create Repository

- Fork this repository.

### Step 2. Create Personal Access Token

1. GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` scope
3. Add the token to repository Secrets as `PAT_TOKEN`

### Step 3. Run Workflow

1. Actions → Generate Contribution City → Run workflow
2. After completion, add to your README.md:

```md
![Contribution City](https://raw.githubusercontent.com/{{USERNAME}}/{{REPO_NAME}}/main/contribution-city.svg)
```

> Replace `{{USERNAME}}` and `{{REPO_NAME}}` with your GitHub username and repository name.

## Project Structure

```
your-repo/
├── .github/
│   └── workflows/
│       └── generate-city.yml
├── assets/
│   ├── font/
│   │   └── Galmuri11.ttf
│   ├── Base.svg
│   ├── Xsmall.svg, Small.svg, Middle.svg, Big.svg
│   ├── MON.svg ~ SUN.svg
│   └── 0.svg ~ 9.svg
├── generate-city.js
└── README.md
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PAT_TOKEN` | Yes | Access token |
| `GITHUB_USERNAME` | Yes | Target GitHub username |

## Acknowledgements

This project was heavily inspired by [github-profile-3d-contrib](https://github.com/yoshi389111/github-profile-3d-contrib) by yoshi389111.

## License

MIT License

## Font

- [Galmuri11](https://github.com/quiple/galmuri) by quiple