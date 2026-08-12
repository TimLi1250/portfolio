import { useEffect, useMemo, useState } from "react";

// Change this one value to reuse the site for another GitHub account.
const GITHUB_USERNAME = "TimLi1250";
const REPO_LIMIT = 12;

const initialProfile = {
  name: "Tim Li",
  bio: "I make practical software and keep an active archive of things I am curious enough to build.",
  location: "INTERNET",
  html_url: `https://github.com/${GITHUB_USERNAME}`,
  blog: "",
};

function ProjectCard({ repo, index }) {
  const language = repo.language || "Unclassified";
  const description = repo.description;

  return (
    <article className="project-card">
      <div>
        <div className="card-top">
          <span className="repo-number">{String(index + 1).padStart(2, "0")}</span>
          <a className="repo-link" href={repo.html_url} target="_blank" rel="noreferrer" aria-label={`Open ${repo.name} on GitHub`}>↗</a>
        </div>
        <h3 className="repo-name">{repo.name}</h3>
        {description && <p className="repo-description">{description}</p>}
      </div>
      <div className="card-footer">
        <span><i className="language-dot" />{language}</span>
        <span>★ {repo.stargazers_count}</span>
      </div>
    </article>
  );
}

function App() {
  const [profile, setProfile] = useState(initialProfile);
  const [repositories, setRepositories] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [status, setStatus] = useState("loading");
  const year = new Date().getFullYear();
  const githubUrl = profile.html_url || `https://github.com/${GITHUB_USERNAME}`;

  useEffect(() => {
    const controller = new AbortController();

    async function loadPortfolio() {
      try {
        const [profileResponse, repositoriesResponse] = await Promise.all([
          fetch(`https://api.github.com/users/${GITHUB_USERNAME}`, { signal: controller.signal }),
          fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`, { signal: controller.signal }),
        ]);
        if (!profileResponse.ok || !repositoriesResponse.ok) throw new Error("GitHub API request failed");

        const [nextProfile, nextRepositories] = await Promise.all([profileResponse.json(), repositoriesResponse.json()]);
        setProfile((current) => ({ ...current, ...nextProfile }));
        setRepositories(
          nextRepositories
            .filter((repository) => !repository.archived)
            .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.updated_at) - new Date(a.updated_at))
            .slice(0, REPO_LIMIT),
        );
        setStatus("ready");
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(error);
          setStatus("error");
        }
      }
    }

    loadPortfolio();
    return () => controller.abort();
  }, []);

  const visibleRepositories = useMemo(
    () => repositories.filter((repository) => activeFilter === "all" || (activeFilter === "fork" ? repository.fork : !repository.fork)),
    [activeFilter, repositories],
  );

  return (
    <>
      <div className="page-grain" aria-hidden="true" />
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Home">TL<span>_</span></a>
        <nav aria-label="Primary navigation">
          <a href={githubUrl} target="_blank" rel="noreferrer">GitHub ↗</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero section-rule">
          <div className="hero-title-wrap">
            <h1>{profile.name || "Tim Li"}</h1>
          </div>
          <div className="hero-bottom">
            <p className="intro">{profile.bio || "A collection of projects and experiments."}</p>
            <a className="round-link" href="#work" aria-label="Jump to projects">↓</a>
          </div>
        </section>

        <section className="projects section-rule" id="work">
          <div className="section-heading">
            <h2>Projects</h2>
            <div className="repo-controls" aria-label="Filter projects">
              {["all", "source", "fork"].map((filter) => (
                <button key={filter} className={`filter ${activeFilter === filter ? "is-active" : ""}`} type="button" onClick={() => setActiveFilter(filter)}>
                  {filter === "all" ? <>All <span>{repositories.length || "—"}</span></> : filter === "source" ? "Source" : "Forks"}
                </button>
              ))}
            </div>
          </div>
          <div className="project-grid" aria-live="polite">
            {status === "loading" && <p className="loading">Loading project index<span className="loading-dots">...</span></p>}
            {status === "error" && <p className="loading">The project index is taking a break.<br /><a className="text-link" href={`${githubUrl}?tab=repositories`} target="_blank" rel="noreferrer">Visit GitHub instead ↗</a></p>}
            {status === "ready" && !visibleRepositories.length && <p className="loading">No projects in this section.</p>}
            {status === "ready" && visibleRepositories.map((repository, index) => <ProjectCard key={repository.id} repo={repository} index={index} />)}
          </div>
          <a className="text-link all-repos-link" href={`${githubUrl}?tab=repositories`} target="_blank" rel="noreferrer">View all repositories <span>↗</span></a>
        </section>
      </main>

      <footer>
        <p>© {year} {profile.name || GITHUB_USERNAME}</p>
        <a href={githubUrl} target="_blank" rel="noreferrer">GITHUB ↗</a>
      </footer>
    </>
  );
}

export default App;
