import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";

const GITHUB_USERNAME = "TimLi1250";
const EMAIL = "tim.li0521@gmail.com";
// Replace this with your public LinkedIn profile URL.
const LINKEDIN_URL = "https://www.linkedin.com/";
const REPO_LIMIT = 12;
const BOT_RATING = 1700;

const initialProfile = {
  name: "Tim Li",
  bio: "I make practical software and keep an active archive of things I am curious enough to build.",
  html_url: `https://github.com/${GITHUB_USERNAME}`,
};

const pieces = {
  w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" },
  b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
};
const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
const squareBonus = [
  [0, 5, 5, 0, 5, 10, 50, 0], [0, 10, -5, 0, 5, 10, 50, 0], [0, 10, -10, 0, 10, 20, 50, 0], [0, -20, 0, 20, 25, 30, 50, 0],
  [0, 10, 15, 25, 25, 30, 50, 0], [0, 10, -10, 0, 10, 20, 50, 0], [0, 10, -5, 0, 5, 10, 50, 0], [0, 5, 5, 0, 5, 10, 50, 0],
];

let moveAudioContext;

function playMoveSound(isCapture = false) {
  try {
    moveAudioContext ||= new AudioContext();
    const now = moveAudioContext.currentTime;
    const gain = moveAudioContext.createGain();
    const oscillator = moveAudioContext.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(isCapture ? 156 : 206, now);
    oscillator.frequency.exponentialRampToValueAtTime(isCapture ? 95 : 145, now + 0.075);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    oscillator.connect(gain).connect(moveAudioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.13);
  } catch {
    // Sound is an enhancement; gameplay remains available if browser audio is blocked.
  }
}

function evaluatePosition(game) {
  if (game.isCheckmate()) return game.turn() === "b" ? -100000 : 100000;
  if (game.isDraw()) return 0;

  let score = 0;
  for (let rank = 0; rank < 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      const piece = game.get(`${"abcdefgh"[file]}${8 - rank}`);
      if (!piece) continue;
      const value = pieceValues[piece.type] + squareBonus[file][piece.color === "b" ? rank : 7 - rank];
      score += piece.color === "b" ? value : -value;
    }
  }
  return score;
}

function search(game, depth, alpha, beta, isBotTurn) {
  if (depth === 0 || game.isGameOver()) return evaluatePosition(game);
  const moves = game.moves({ verbose: true }).sort((a, b) => Number(Boolean(b.captured)) - Number(Boolean(a.captured)));

  if (isBotTurn) {
    let best = -Infinity;
    for (const move of moves) {
      game.move(move);
      best = Math.max(best, search(game, depth - 1, alpha, beta, false));
      game.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const move of moves) {
    game.move(move);
    best = Math.min(best, search(game, depth - 1, alpha, beta, true));
    game.undo();
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

function chooseBotMove(game) {
  const moves = game.moves({ verbose: true });
  const depth = moves.length > 26 ? 3 : 4;
  const scoredMoves = moves.map((move) => {
    game.move(move);
    const score = search(game, depth - 1, -Infinity, Infinity, false);
    game.undo();
    return { move, score };
  }).sort((a, b) => b.score - a.score);

  // A small choice among near-equal moves keeps the engine from playing perfectly.
  const candidates = scoredMoves.filter(({ score }) => score >= scoredMoves[0].score - 22).slice(0, 3);
  return candidates[Math.floor(Math.random() * candidates.length)].move;
}

function ChessGame() {
  const [game, setGame] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [botThinking, setBotThinking] = useState(false);
  const [moveHistory, setMoveHistory] = useState([]);
  const boardState = game.board();
  const legalTargets = useMemo(() => selectedSquare ? game.moves({ square: selectedSquare, verbose: true }).map((move) => move.to) : [], [game, selectedSquare]);
  const gameStatus = game.isCheckmate()
    ? `${game.turn() === "w" ? "Tim" : "You"} wins by checkmate.`
    : game.isDraw()
      ? "Draw."
      : botThinking
        ? "Tim is thinking…"
        : game.turn() === "w" ? "Your move" : "Tim to move";

  function resetGame() {
    setGame(new Chess());
    setSelectedSquare(null);
    setMoveHistory([]);
    setBotThinking(false);
  }

  function makeBotMove(nextGame) {
    setBotThinking(true);
    window.setTimeout(() => {
      const botMove = chooseBotMove(nextGame);
      nextGame.move(botMove);
      playMoveSound(Boolean(botMove.captured));
      setMoveHistory((current) => [...current, botMove.san]);
      setGame(new Chess(nextGame.fen()));
      setBotThinking(false);
    }, 180);
  }

  function selectSquare(square, piece) {
    if (botThinking || game.isGameOver() || game.turn() !== "w") return;

    if (selectedSquare && legalTargets.includes(square)) {
      const nextGame = new Chess(game.fen());
      const userMove = nextGame.move({ from: selectedSquare, to: square, promotion: "q" });
      if (!userMove) return;
      playMoveSound(Boolean(userMove.captured));
      setMoveHistory((current) => [...current, userMove.san]);
      setSelectedSquare(null);
      setGame(new Chess(nextGame.fen()));
      if (!nextGame.isGameOver()) makeBotMove(nextGame);
      return;
    }

    setSelectedSquare(piece?.color === "w" ? square : null);
  }

  return (
    <section className="chess-game" aria-label="Play chess against Tim's bot">
      <div className="chess-heading">
        <div><p className="small-label">Play a game</p><p>Tim.bot <span>~{BOT_RATING}</span></p></div>
        <button type="button" onClick={resetGame}>New</button>
      </div>
      <div className="chessboard" role="grid" aria-label="Interactive chess board">
        {boardState.flatMap((rank, rankIndex) => rank.map((piece, fileIndex) => {
          const square = `${"abcdefgh"[fileIndex]}${8 - rankIndex}`;
          const isSelected = selectedSquare === square;
          const isTarget = legalTargets.includes(square);
          return (
            <button
              type="button"
              role="gridcell"
              aria-label={`${square}${piece ? ` ${piece.color === "w" ? "white" : "black"} ${piece.type}` : ""}`}
              key={square}
              className={`chess-square ${(rankIndex + fileIndex) % 2 ? "dark" : "light"} ${isSelected ? "is-selected" : ""} ${isTarget ? "is-target" : ""}`}
              onClick={() => selectSquare(square, piece)}
            >
              {piece && <span className={piece.color === "w" ? "white-piece" : "black-piece"}>{pieces[piece.color][piece.type]}</span>}
            </button>
          );
        }))}
      </div>
      <p className="game-status" aria-live="polite">{gameStatus}</p>
      <p className="move-history">{moveHistory.length ? moveHistory.join(" · ") : "You play White."}</p>
      <p className="engine-note">Local engine; approximate strength, not a rated Chess.com match.</p>
    </section>
  );
}

function ProjectIcon({ name, index }) {
  const initials = name.split(/[-_ ]/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return <div className={`project-icon icon-${index % 6}`} aria-hidden="true"><span>{initials || "•"}</span><i /></div>;
}

function SocialIcon({ type }) {
  if (type === "email") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1" /><path d="m4 7 8 6 8-6" /></svg>;
  if (type === "github") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8a9.2 9.2 0 0 0-2.9 17.9c.46.08.62-.2.62-.44v-1.72c-2.54.55-3.08-1.08-3.08-1.08-.42-1.06-1.02-1.34-1.02-1.34-.84-.57.06-.56.06-.56.92.06 1.4.94 1.4.94.83 1.4 2.16 1 2.68.76.08-.58.32-1 .59-1.24-2.03-.23-4.16-1-4.16-4.5 0-1 .36-1.8.94-2.43-.1-.23-.4-1.17.1-2.42 0 0 .77-.24 2.5.93a8.7 8.7 0 0 1 4.55 0c1.74-1.17 2.5-.93 2.5-.93.5 1.25.2 2.19.1 2.42.59.63.94 1.43.94 2.43 0 3.5-2.13 4.27-4.17 4.5.33.28.62.82.62 1.66v2.47c0 .24.16.53.63.44A9.2 9.2 0 0 0 12 2.8Z" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 9.2V18M6.5 6.2v.02M10.2 18v-5.1c0-1.85 1-3 2.7-3 1.65 0 2.6 1.12 2.6 3V18M10.2 13.1v-3.9" /><rect x="4.5" y="4.2" width="15" height="15.6" rx="1.2" /></svg>;
}

function ProjectCard({ repository, index }) {
  return (
    <a className="project-card" href={repository.html_url} target="_blank" rel="noreferrer">
      <ProjectIcon name={repository.name} index={index} />
      <h3>{repository.name}</h3>
      <p>{repository.description || repository.language || "Open source project"}</p>
    </a>
  );
}

function App() {
  const [profile, setProfile] = useState(initialProfile);
  const [repositories, setRepositories] = useState([]);
  const [status, setStatus] = useState("loading");
  const githubUrl = profile.html_url || `https://github.com/${GITHUB_USERNAME}`;
  const socialLinks = [
    { label: "Email", type: "email", href: `mailto:${EMAIL}` },
    { label: "GitHub", type: "github", href: githubUrl, external: true },
    { label: "LinkedIn", type: "linkedin", href: LINKEDIN_URL, external: true },
  ];

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
        setRepositories(nextRepositories.filter((repository) => !repository.archived && !repository.fork).sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.updated_at) - new Date(a.updated_at)).slice(0, REPO_LIMIT));
        setStatus("ready");
      } catch (error) {
        if (error.name !== "AbortError") setStatus("error");
      }
    }
    loadPortfolio();
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
        <section className="intro-section"><p className="small-label">Hello, I’m {profile.name || "Tim Li"}.</p><h1>I build things<br />for the internet.</h1><p className="lead">{profile.bio || "A collection of projects, notes, and work."}</p></section>
        <section id="resume" className="content-section resume-section"><p className="section-title">Resume</p><div className="section-body resume-body"><p>Software builder with an interest in making useful, understandable tools.</p><a className="arrow-link" href={githubUrl} target="_blank" rel="noreferrer">GitHub profile <span>↗</span></a></div></section>
        <section id="projects" className="content-section"><p className="section-title">Projects</p><div className="section-body">{status === "loading" && <p className="quiet-message">Loading projects...</p>}{status === "error" && <p className="quiet-message">Projects are available on <a href={githubUrl} target="_blank" rel="noreferrer">GitHub ↗</a>.</p>}{status === "ready" && <div className="project-gallery">{repositories.map((repository, index) => <ProjectCard key={repository.id} repository={repository} index={index} />)}</div>}{status === "ready" && <a className="arrow-link" href={`${githubUrl}?tab=repositories`} target="_blank" rel="noreferrer">All repositories <span>↗</span></a>}</div></section>
        <section id="research" className="content-section"><p className="section-title">Research</p><div className="section-body prose"><p>A small collection of questions, experiments, and things worth understanding more deeply.</p><p className="muted">Notes and publications coming soon.</p></div></section>
        <section id="education" className="content-section"><p className="section-title">Education</p><div className="section-body prose"><p>Learning through coursework, independent projects, and research.</p><p className="muted">Education details coming soon.</p></div></section>
        <footer><span>© {new Date().getFullYear()} {profile.name || GITHUB_USERNAME}</span><a href={githubUrl} target="_blank" rel="noreferrer">GitHub ↗</a></footer>
      </main>
    </div>
  );
}

export default App;
