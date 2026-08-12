# GitHub Portfolio

A dependency-free GitHub Pages portfolio with a minimal, retro black-and-white visual style. It pulls public profile and repository data from the GitHub API at page load, so the project index remains current.

## Customize

Change `GITHUB_USERNAME` near the top of `script.js` to point the site at another GitHub account. The project limit and sort order are in the same file.

## Publish with GitHub Pages

1. Push these files to the repository's default branch.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**, then choose the default branch and `/ (root)`.

GitHub will publish the site at `https://<username>.github.io/<repository>/`. For the root `https://<username>.github.io/` URL, the repository must be named `<username>.github.io`.
