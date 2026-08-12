// Edit this value to reuse the site for a different GitHub account.
const GITHUB_USERNAME = "TimLi1250";
const REPO_LIMIT = 12;

const grid = document.querySelector("#project-grid");
const repoCount = document.querySelector("#repo-count");
let repositories = [];
let activeFilter = "all";

const setText = (selector, text) => {
  const element = document.querySelector(selector);
  if (element && text) element.textContent = text;
};

const escapeHtml = (value = "") =>
  value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

function renderProjects() {
  const visible = repositories.filter((repo) => activeFilter === "all" || (activeFilter === "fork" ? repo.fork : !repo.fork));

  if (!visible.length) {
    grid.innerHTML = '<p class="loading">No projects in this section.</p>';
    return;
  }

  grid.innerHTML = visible.map((repo, index) => {
    const language = repo.language || "Unclassified";
    const description = repo.description || "An in-progress experiment from the project archive.";
    const number = String(index + 1).padStart(2, "0");
    return `
      <article class="project-card">
        <div>
          <div class="card-top"><span class="repo-number">${number} / ${repo.fork ? "FORK" : "SOURCE"}</span><a class="repo-link" href="${repo.html_url}" target="_blank" rel="noreferrer" aria-label="Open ${escapeHtml(repo.name)} on GitHub">↗</a></div>
          <h3 class="repo-name">${escapeHtml(repo.name)}</h3>
          <p class="repo-description">${escapeHtml(description)}</p>
        </div>
        <div class="card-footer"><span><i class="language-dot"></i>${escapeHtml(language)}</span><span>★ ${repo.stargazers_count}</span></div>
      </article>`;
  }).join("");
}

function showError() {
  grid.innerHTML = `<p class="loading">The project index is taking a break.<br /><a class="text-link" href="https://github.com/${GITHUB_USERNAME}?tab=repositories" target="_blank" rel="noreferrer">Visit GitHub instead ↗</a></p>`;
}

async function loadPortfolio() {
  const profileUrl = `https://api.github.com/users/${GITHUB_USERNAME}`;
  const reposUrl = `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`;
  try {
    const [profileResponse, reposResponse] = await Promise.all([fetch(profileUrl), fetch(reposUrl)]);
    if (!profileResponse.ok || !reposResponse.ok) throw new Error("GitHub API request failed");
    const profile = await profileResponse.json();
    repositories = (await reposResponse.json())
      .filter((repo) => !repo.archived)
      .sort((a, b) => Number(b.stargazers_count) - Number(a.stargazers_count) || new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, REPO_LIMIT);

    const displayName = profile.name || GITHUB_USERNAME;
    setText("#profile-name", displayName);
    setText("#footer-name", displayName.toUpperCase());
    setText("#profile-bio", profile.bio);
    setText("#profile-location", profile.location ? profile.location.toUpperCase() : "INTERNET");
    repoCount.textContent = repositories.length;

    const githubUrl = profile.html_url || `https://github.com/${GITHUB_USERNAME}`;
    ["#github-nav-link", "#all-repos-link", "#footer-github"].forEach((selector) => document.querySelector(selector).href = selector === "#all-repos-link" ? `${githubUrl}?tab=repositories` : githubUrl);
    const contact = document.querySelector("#profile-contact");
    contact.href = profile.blog || githubUrl;
    contact.textContent = profile.blog ? "VISIT WEBSITE ↗" : "GET IN TOUCH ↗";
    renderProjects();
  } catch (error) {
    console.error(error);
    showError();
  }
}

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".filter").forEach((filter) => filter.classList.toggle("is-active", filter === button));
    renderProjects();
  });
});

const year = new Date().getFullYear();
setText("#current-year", year);
setText("#footer-year", year);
loadPortfolio();
