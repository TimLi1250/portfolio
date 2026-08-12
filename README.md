# Tim Li's GitHub Portfolio

A React + Vite portfolio with a minimal, retro black-and-white visual style. It fetches public profile and repository data from the GitHub API at page load, keeping the project index current.

## Run locally

```bash
npm install
npm run dev
```

Vite will print a local URL to open in your browser. Use `npm run build` to create a production build in `dist/`.

## Customize

Set `GITHUB_USERNAME` near the top of `src/App.jsx` to reuse the site for another account. `REPO_LIMIT` controls how many repositories appear.

## Deploy to GitHub Pages

The included [deployment workflow](.github/workflows/deploy.yml) builds and deploys the site whenever changes are pushed to `main`.

1. Push the project to GitHub.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. Push to `main` (or run the workflow from the **Actions** tab).

GitHub will show the published URL in **Settings → Pages** after the workflow succeeds.
