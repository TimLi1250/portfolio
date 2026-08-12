import { useEffect, useMemo, useState } from "react";

// Change this one value to reuse the site for another GitHub account.
const GITHUB_USERNAME = "TimLi1250";
const REPO_LIMIT = 12;

const initialProfile = {
  name: "Tim Li",
  bio: "I make practical software and keep an active archive of things I am curious enough to build.",
  html_url: `https://github.com/${GITHUB_USERNAME}`,
};

function ProjectPiece({ repo, index, isSelected, onSelect }) {
  return (
    <button
      className={`project-piece ${isSelected ? "is-selected" : ""}`}
      type="button"
      onClick={() => onSelect(repo.id)}
      aria-pressed={isSelected}
    >
      <span className="piece-number">{String(index + 1).padStart(2, "0")}</span>
      <span className="piece-name">{repo.name}</span>
      <span className="piece-language">{repo.language || "Code"}</span>
    </button>
  );
}

function App() {
  const [profile, setProfile] = useState(initialProfile);
  const [repositories, setRepositories] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedRepositoryId, setSelectedRepositoryId] = useState(null);
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
        const nextProjectList = nextRepositories
          .filter((repository) => !repository.archived)
          .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.updated_at) - new Date(a.updated_at))
          .slice(0, REPO_LIMIT);

        setProfile((current) => ({ ...current, ...nextProfile }));
        setRepositories(nextProjectList);
        setSelectedRepositoryId(nextProjectList[0]?.id ?? null);
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
  const selectedRepository = visibleRepositories.find((repository) => repository.id === selectedRepositoryId) || visibleRepositories[0];

  function selectFilter(filter) {
    setActiveFilter(filter);
    const firstMatchingRepository = repositories.find((repository) => filter === "all" || (filter === "fork" ? repository.fork : !repository.fork));
    setSelectedRepositoryId(firstMatchingRepository?.id ?? null);
  }

  return (
    <>
      <div className="page-grain" aria-hidden="true" />
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Home">TL<span>_</span></a>
        <a className="github-link" href={githubUrl} target="_blank" rel="noreferrer">GitHub ↗</a>
      </header>

      <main id="top">
        <section className="hero section-rule">
          <div className="hero-copy">
            <p>{profile.name || "Tim Li"}</p>
            <h1>One whole,<br />many pieces.</h1>
          </div>
          <div className="whole-piece" aria-label={`${profile.name || "Tim Li"}'s monogram`}>
            <span>T</span><span>L</span><span>+</span><span>+</span>
          </div>
          <p className="intro">{profile.bio || "A collection of projects and experiments."}</p>
        </section>

        <section className="projects" id="work" aria-label="Projects">
          <div className="section-heading">
            <h2>Pieces</h2>
            <div className="repo-controls" aria-label="Filter projects">
              {["all", "source", "fork"].map((filter) => (
                <button key={filter} className={`filter ${activeFilter === filter ? "is-active" : ""}`} type="button" onClick={() => selectFilter(filter)}>
                  {filter === "all" ? <>All <span>{repositories.length || "—"}</span></> : filter === "source" ? "Source" : "Forks"}
                </button>
              ))}
            </div>
          </div>

          <div className="puzzle-grid" aria-live="polite">
            {status === "loading" && <p className="loading">Loading pieces<span className="loading-dots">...</span></p>}
            {status === "error" && <p className="loading">Unable to load projects.<br /><a className="text-link" href={`${githubUrl}?tab=repositories`} target="_blank" rel="noreferrer">Visit GitHub ↗</a></p>}
            {status === "ready" && !visibleRepositories.length && <p className="loading">No pieces here.</p>}
            {status === "ready" && visibleRepositories.map((repository, index) => (
              <ProjectPiece key={repository.id} repo={repository} index={index} isSelected={selectedRepository?.id === repository.id} onSelect={setSelectedRepositoryId} />
            ))}
          </div>

          {selectedRepository && (
            <article className="project-detail" aria-live="polite">
              <div className="detail-mark" aria-hidden="true">+</div>
              <div>
                <p className="detail-label">Selected piece</p>
                <h3>{selectedRepository.name}</h3>
              </div>
              <p>{selectedRepository.description || "A project from the archive."}</p>
              <a className="detail-link" href={selectedRepository.html_url} target="_blank" rel="noreferrer">Open project ↗</a>
            </article>
          )}
        </section>
      </main>

      <footer>
        <p>© {year} {profile.name || GITHUB_USERNAME}</p>
        <a href={githubUrl} target="_blank" rel="noreferrer">All repositories ↗</a>
      </footer>
    </>
  );
}

export default App;
