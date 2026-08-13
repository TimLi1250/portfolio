import { useEffect, useState } from "react";
import ChessGame from "./Chess.jsx";
import Education from "./Education.jsx";
import Projects from "./Projects.jsx";
import Research from "./Research.jsx";
import Resume from "./Resume.jsx";

const GITHUB_USERNAME = "TimLi1250";
const EMAIL = "tim.li@yale.edu";
const LINKEDIN_URL = "https://www.linkedin.com/in/tim-li1250/";

const initialProfile = {
  name: "Tim Li",
  bio: "I make practical software and keep an active archive of things I am curious enough to build.",
  html_url: `https://github.com/${GITHUB_USERNAME}`,
};

function SocialIcon({ type }) {
  if (type === "email") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1" /><path d="m4 7 8 6 8-6" /></svg>;
  if (type === "github") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8a9.2 9.2 0 0 0-2.9 17.9c.46.08.62-.2.62-.44v-1.72c-2.54.55-3.08-1.08-3.08-1.08-.42-1.06-1.02-1.34-1.02-1.34-.84-.57.06-.56.06-.56.92.06 1.4.94 1.4.94.83 1.4 2.16 1 2.68.76.08-.58.32-1 .59-1.24-2.03-.23-4.16-1-4.16-4.5 0-1 .36-1.8.94-2.43-.1-.23-.4-1.17.1-2.42 0 0 .77-.24 2.5.93a8.7 8.7 0 0 1 4.55 0c1.74-1.17 2.5-.93 2.5-.93.5 1.25.2 2.19.1 2.42.59.63.94 1.43.94 2.43 0 3.5-2.13 4.27-4.17 4.5.33.28.62.82.62 1.66v2.47c0 .24.16.53.63.44A9.2 9.2 0 0 0 12 2.8Z" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="1.5" /><path d="M8 10.25V16M8 7.7v.05M11.25 16v-3.2c0-1.65.85-2.7 2.35-2.7s2.15 1.05 2.15 2.7V16" /></svg>;
}

export default function App() {
  const [profile, setProfile] = useState(initialProfile);
  const githubUrl = profile.html_url || initialProfile.html_url;
  const socialLinks = [
    { label: "Email", type: "email", href: `mailto:${EMAIL}` },
    { label: "GitHub", type: "github", href: githubUrl, external: true },
    { label: "LinkedIn", type: "linkedin", href: LINKEDIN_URL, external: true },
  ];

  useEffect(() => {
    const controller = new AbortController();
    fetch(`https://api.github.com/users/${GITHUB_USERNAME}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("GitHub API request failed")))
      .then((nextProfile) => setProfile((current) => ({ ...current, ...nextProfile })))
      .catch((error) => { if (error.name !== "AbortError") return null; });
    return () => controller.abort();
  }, []);

  return (
    <div className="site-shell" id="top">
      <aside className="chess-dock"><a className="dock-mark" href="#top" aria-label="Back to top">TL</a><ChessGame /></aside>
      <main className="content">
        <header className="site-header">
          <nav className="section-nav" aria-label="Sections"><a href="#resume">Resume</a><a href="#projects">Projects</a><a href="#research">Research</a><a href="#education">Education</a></nav>
          <nav className="social-nav" aria-label="Contact links">{socialLinks.map((link) => <a key={link.label} href={link.href} aria-label={link.label} title={link.label} target={link.external ? "_blank" : undefined} rel={link.external ? "noreferrer" : undefined}><SocialIcon type={link.type} /></a>)}</nav>
        </header>
        <section className="intro-section"><p className="small-label">Hello, I’m {profile.name || "Tim Li"}.</p><h1 className="intro-heading">I love to build<br />for efficiency,<br />simplicity &amp; fun!</h1><p className="lead">{profile.bio || "A collection of projects, notes, and work."}</p></section>
        <Resume />
        <Projects githubUsername={GITHUB_USERNAME} githubUrl={githubUrl} />
        <Research />
        <Education />
        <footer><span>© {new Date().getFullYear()} {profile.name || GITHUB_USERNAME}</span></footer>
      </main>
    </div>
  );
}
