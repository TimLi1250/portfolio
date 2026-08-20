import { useEffect, useState } from "react";
import aiImageDetectionImage from "./assets/project-ai-image-detection.png";
import ballotBridgeImage from "./assets/project-ballot-bridge.png";
import golfCardsImage from "./assets/project-golf-cards.png";
import mathSolverImage from "./assets/project-math-solver.png";
import pixelTankImage from "./assets/project-pixel-tank-duel.png";
import rateMyDayImage from "./assets/project-rate-my-day.png";

const FEATURED_REPOSITORIES = [
  { repository: "golf_cards",
    name: "Four Card Golf",
    description: "Built a multiplayer online Four Card Golf game with real-time tables, private invites, chat, scoring, and special card mechanics for up to 12 players. Designed it as a mobile-friendly progressive web app with pixel-art visuals, music, and self-hosted deployment on Oracle Cloud. LINK HERE: https://golf-cards.duckdns.org/",
    languages: ["TypeScript", "JavaScript", "Dockerfile"],
    image: golfCardsImage },

  { repository: "rate_my_day",
    name: "Rate My Day",
    description: "A private, installable diary for rating each day and saving notes in a year-at-a-glance calendar. Uses Neon Postgres with server-side routes and a personal access code to keep entries available across devices",
    languages: ["TypeScript", "JavaScript", "CSS"],
    image: rateMyDayImage },

  { repository: "MathSolverLLMs",
    name: "Math Solver using LLMs",
    description: "A verifier-guided math-solving pipeline built on on pretrained model, supervised fine-tuning, and reinforcement learning. (CPSC 4770 Final Project)",
    languages: ["Python"],
    image: mathSolverImage },

  { repository: "YHack2026",
    name: "Ballot Bridge",
    description: "A full-stack civic-information app that makes elections, ballots, candidates, legislation, and congressional meetings easier to understand. FastAPI backend combines public civic data with neutral, plain-language LLM summaries, while a React frontend presents the information accessibly. (Built for YHack 2026)",
    languages: ["TypeScript", "Python", "React"],
    image: ballotBridgeImage },

  { repository: "Workday_Auto",
    name: "Workday Autocomplete",
    description: "CLI tool that uses Playwright to fill Workday job-application fields from local answer mappings. Preserves browser sessions, captures debugging artifacts, pauses for CAPTCHAs, and stops at review until submission is confirme [IN PROGRESS]",
    languages: ["TypeScript", "JavaScript"] },

  { repository: "Pixel-Tank-Duel",
    name: "Pixel Tank Duel",
    description: "A two-player tank game built for an Arduino-based digital-systems project. The project runs on an ILI9488 TFT display with button controls and includes the supporting hardware schematic and Arduino sketches. (CPSC 3480 Final Project)",
    languages: ["C++"],
    image: pixelTankImage },

  { repository: "AI-Image-Detection",
    name: "AI Image Detection",
    description: "Explores CNN-based detection of AI-generated images. It includes a VGGNet-11-based classification pipeline and employs a VAE for image verification (CPSC 3810 Final Project)",
    languages: ["Python"],
    image: aiImageDetectionImage },
];

function ProjectIcon({ name }) {
  const initials = name.split(/[-_ ]/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return <span className="project-icon" aria-hidden="true"><span>{initials || "•"}</span><i /></span>;
}

function ProjectCard({ project, repository }) {
  return (
    <article className="project-card">
      <a className="project-icon-link" href={repository.html_url} target="_blank" rel="noreferrer" aria-label={`Open ${project.name} repository`}><ProjectIcon name={project.name} /></a>
      <div className="project-copy">
        <h3>{project.name}</h3>
        <div className="project-details">
          <div className="project-details-content">
            <p>{project.description}</p>
            {project.image && <img className="project-visual" src={project.image} alt={`${project.name} project preview`} />}
            <p className="project-languages">{project.languages.join(" · ")}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Projects({ githubUsername, githubUrl }) {
  const [repositories, setRepositories] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const controller = new AbortController();
    async function loadProjects() {
      try {
        const response = await fetch(`https://api.github.com/users/${githubUsername}/repos?per_page=100&sort=updated`, { signal: controller.signal });
        if (!response.ok) throw new Error("GitHub API request failed");
        const nextRepositories = await response.json();
        const repositoriesByName = new Map(nextRepositories.map((repository) => [repository.name, repository]));
        setRepositories(FEATURED_REPOSITORIES.map((project) => ({ project, repository: repositoriesByName.get(project.repository) })).filter(({ repository }) => repository));
        setStatus("ready");
      } catch (error) {
        if (error.name !== "AbortError") setStatus("error");
      }
    }
    loadProjects();
    return () => controller.abort();
  }, [githubUsername]);

  return (
    <section id="projects" className="content-section">
      <p className="section-title">Projects</p>
      <div className="section-body">
        {status === "loading" && <p className="quiet-message">Loading projects...</p>}
        {status === "error" && <p className="quiet-message">Projects are available on <a href={githubUrl} target="_blank" rel="noreferrer">GitHub</a>.</p>}
        {status === "ready" && <div className="project-gallery">{repositories.map(({ project, repository }) => <ProjectCard key={repository.id} project={project} repository={repository} />)}</div>}
        {status === "ready" && <a className="arrow-link" href={`${githubUrl}?tab=repositories`} target="_blank" rel="noreferrer"><strong>All repositories</strong></a>}
      </div>
    </section>
  );
}
