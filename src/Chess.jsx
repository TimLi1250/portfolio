import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";

const ENGINE_THINK_TIME_MS = 820;
const ENGINE_MAX_DEPTH = 6;
const QUIESCENCE_MAX_DEPTH = 5;
const ENGINE_CACHE_LIMIT = 12000;
const SEARCH_TIMEOUT = Symbol("search-timeout");

const pieces = {
  w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" },
  b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
};
const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

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

function materialValue(game, color) {
  return game.board().flat().reduce((total, piece) => total + (piece?.color === color && piece.type !== "k" ? pieceValues[piece.type] : 0), 0);
}

function findKingSquare(game, color) {
  for (const rank of "12345678") {
    for (const file of "abcdefgh") {
      const piece = game.get(`${file}${rank}`);
      if (piece?.type === "k" && piece.color === color) return `${file}${rank}`;
    }
  }
  return null;
}

function moveOrderScore(move) {
  return (move.captured ? pieceValues[move.captured] * 12 - pieceValues[move.piece] : 0)
    + (move.promotion ? pieceValues[move.promotion] * 10 : 0)
    + (move.san.includes("+") ? 40 : 0);
}

function orderedMoves(game) {
  return game.moves({ verbose: true }).sort((a, b) => moveOrderScore(b) - moveOrderScore(a));
}

function positionKey(game) {
  return game.fen().split(" ").slice(0, 4).join(" ");
}

function positionalBonus(piece, rank, file) {
  const center = Math.max(0, 6 - (Math.abs(file - 3.5) + Math.abs(rank - 3.5)) * 2);
  const advance = piece.color === "w" ? 7 - rank : rank;
  if (piece.type === "p") return advance * 8 + center * 2;
  if (piece.type === "n") return center * 11 - (file === 0 || file === 7 ? 12 : 0);
  if (piece.type === "b") return center * 7;
  if (piece.type === "r") return advance * 2 + (advance === 6 ? 22 : 0);
  return piece.type === "q" ? center * 2 : 0;
}

function pawnStructureScore(pawns, opposingPawns, color) {
  const pawnsByFile = Array.from({ length: 8 }, () => 0);
  pawns.forEach(({ file }) => { pawnsByFile[file] += 1; });
  return pawns.reduce((score, pawn) => {
    const hasNeighbour = pawnsByFile[pawn.file - 1] || pawnsByFile[pawn.file + 1];
    const isPassed = !opposingPawns.some((opponent) => Math.abs(opponent.file - pawn.file) <= 1
      && (color === "w" ? opponent.rank < pawn.rank : opponent.rank > pawn.rank));
    const advance = color === "w" ? 7 - pawn.rank : pawn.rank;
    return score - (pawnsByFile[pawn.file] - 1) * 14 - (hasNeighbour ? 0 : 12) + (isPassed ? (advance + 1) * 8 : 0);
  }, 0);
}

function kingSafetyScore(board, color) {
  const homeKingRank = color === "w" ? 7 : 0;
  const pawnRank = color === "w" ? 6 : 1;
  const kingRank = board.findIndex((rank) => rank.some((piece) => piece?.color === color && piece.type === "k"));
  if (kingRank !== homeKingRank) return 0;
  const kingFile = board[kingRank].findIndex((piece) => piece?.color === color && piece.type === "k");
  return [kingFile - 1, kingFile, kingFile + 1].reduce((score, file) => {
    const piece = board[pawnRank]?.[file];
    return score + (piece?.color === color && piece.type === "p" ? 12 : 0);
  }, 0);
}

function evaluatePosition(game, botColor) {
  if (game.isCheckmate()) return game.turn() === botColor ? -100000 : 100000;
  if (game.isDraw()) return 0;
  const board = game.board();
  const pawns = { w: [], b: [] };
  const bishops = { w: 0, b: 0 };
  let whiteScore = 0;
  board.forEach((rank, rankIndex) => rank.forEach((piece, fileIndex) => {
    if (!piece) return;
    const value = pieceValues[piece.type] + positionalBonus(piece, rankIndex, fileIndex);
    whiteScore += piece.color === "w" ? value : -value;
    if (piece.type === "p") pawns[piece.color].push({ rank: rankIndex, file: fileIndex });
    if (piece.type === "b") bishops[piece.color] += 1;
  }));
  whiteScore += pawnStructureScore(pawns.w, pawns.b, "w") - pawnStructureScore(pawns.b, pawns.w, "b");
  whiteScore += (bishops.w >= 2 ? 28 : 0) - (bishops.b >= 2 ? 28 : 0);
  whiteScore += kingSafetyScore(board, "w") - kingSafetyScore(board, "b");
  return botColor === "w" ? whiteScore : -whiteScore;
}

function quiescenceSearch(game, alpha, beta, botColor, deadline, depth = 0) {
  if (performance.now() >= deadline) throw SEARCH_TIMEOUT;
  const standPat = evaluatePosition(game, botColor);
  if (game.isGameOver() || depth >= QUIESCENCE_MAX_DEPTH) return standPat;
  const isBotTurn = game.turn() === botColor;
  if (isBotTurn) {
    if (standPat >= beta) return standPat;
    alpha = Math.max(alpha, standPat);
  } else {
    if (standPat <= alpha) return standPat;
    beta = Math.min(beta, standPat);
  }
  let bestScore = standPat;
  for (const move of orderedMoves(game).filter((candidate) => candidate.captured || candidate.promotion)) {
    game.move(move);
    let score;
    try { score = quiescenceSearch(game, alpha, beta, botColor, deadline, depth + 1); } finally { game.undo(); }
    if (isBotTurn) { bestScore = Math.max(bestScore, score); alpha = Math.max(alpha, bestScore); }
    else { bestScore = Math.min(bestScore, score); beta = Math.min(beta, bestScore); }
    if (beta <= alpha) break;
  }
  return bestScore;
}

function searchPosition(game, depth, alpha, beta, botColor, deadline, cache) {
  if (performance.now() >= deadline) throw SEARCH_TIMEOUT;
  if (game.isGameOver()) return evaluatePosition(game, botColor);
  if (depth === 0) return quiescenceSearch(game, alpha, beta, botColor, deadline);
  const cacheKey = `${positionKey(game)}:${depth}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    if (cached.bound === "exact") return cached.score;
    if (cached.bound === "lower") alpha = Math.max(alpha, cached.score);
    if (cached.bound === "upper") beta = Math.min(beta, cached.score);
    if (alpha >= beta) return cached.score;
  }
  const originalAlpha = alpha;
  const originalBeta = beta;
  const isBotTurn = game.turn() === botColor;
  let bestScore = isBotTurn ? -Infinity : Infinity;
  for (const move of orderedMoves(game)) {
    game.move(move);
    let score;
    try { score = searchPosition(game, depth - 1, alpha, beta, botColor, deadline, cache); } finally { game.undo(); }
    if (isBotTurn) { bestScore = Math.max(bestScore, score); alpha = Math.max(alpha, bestScore); }
    else { bestScore = Math.min(bestScore, score); beta = Math.min(beta, bestScore); }
    if (beta <= alpha) break;
  }
  if (cache.size >= ENGINE_CACHE_LIMIT) cache.clear();
  cache.set(cacheKey, { score: bestScore, bound: bestScore <= originalAlpha ? "upper" : bestScore >= originalBeta ? "lower" : "exact" });
  return bestScore;
}

function chooseBotMove(game, botColor) {
  const moves = orderedMoves(game);
  if (!moves.length) return null;
  const deadline = performance.now() + ENGINE_THINK_TIME_MS;
  const cache = new Map();
  let bestMove = moves[0];
  let rootMoves = moves;
  for (let depth = 1; depth <= ENGINE_MAX_DEPTH; depth += 1) {
    try {
      let bestScore = -Infinity;
      let depthBestMove = bestMove;
      for (const move of rootMoves) {
        game.move(move);
        let score;
        try { score = searchPosition(game, depth - 1, -Infinity, Infinity, botColor, deadline, cache); } finally { game.undo(); }
        if (score > bestScore) { bestScore = score; depthBestMove = move; }
      }
      bestMove = depthBestMove;
      // Search the previous iteration's principal variation first, improving pruning at deeper depths.
      rootMoves = [bestMove, ...rootMoves.filter((move) => move.from !== bestMove.from || move.to !== bestMove.to || move.promotion !== bestMove.promotion)];
    } catch (error) {
      if (error !== SEARCH_TIMEOUT) throw error;
      break;
    }
  }
  return bestMove;
}

export default function ChessGame() {
  const [game, setGame] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [botThinking, setBotThinking] = useState(false);
  const [moveHistory, setMoveHistory] = useState([]);
  const [lastMoveSquares, setLastMoveSquares] = useState([]);
  const [playerColor, setPlayerColor] = useState("w");
  const [capturedPieces, setCapturedPieces] = useState({ w: [], b: [] });
  const botTimer = useRef();
  const boardState = game.board();
  const botColor = playerColor === "w" ? "b" : "w";
  const displayedBoard = playerColor === "w" ? boardState : boardState.slice().reverse().map((rank) => rank.slice().reverse());
  const legalTargets = useMemo(() => selectedSquare ? game.moves({ square: selectedSquare, verbose: true }).map((move) => move.to) : [], [game, selectedSquare]);
  const materialDifference = Math.round((materialValue(game, playerColor) - materialValue(game, botColor)) / 100);
  const checkedKingSquare = game.isCheck() ? findKingSquare(game, game.turn()) : null;
  const gameStatus = game.isCheckmate() ? game.turn() === playerColor ? "Tim wins by checkmate." : "You win by checkmate."
    : game.isDraw() ? "Draw." : botThinking ? "Tim is thinking…" : game.turn() === playerColor ? "Your move" : "Tim to move";

  function recordCapture(move) {
    if (move.captured) setCapturedPieces((current) => ({ ...current, [move.color === "w" ? "b" : "w"]: [...current[move.color === "w" ? "b" : "w"], move.captured] }));
  }
  function applyBotMove(nextGame, nextMove) {
    if (!nextGame || !nextMove) { setBotThinking(false); return; }
    const botMove = nextGame.move({ from: nextMove.from, to: nextMove.to, promotion: nextMove.promotion || "q" });
    if (!botMove) { setBotThinking(false); return; }
    recordCapture(botMove);
    playMoveSound(Boolean(botMove.captured));
    setMoveHistory((current) => [...current, botMove.san]);
    setLastMoveSquares([botMove.from, botMove.to]);
    setGame(new Chess(nextGame.fen()));
    setBotThinking(false);
  }
  function makeBotMove(nextGame, nextBotColor) {
    setBotThinking(true);
    botTimer.current = window.setTimeout(() => applyBotMove(nextGame, chooseBotMove(nextGame, nextBotColor)), 20);
  }
  function resetGame() {
    window.clearTimeout(botTimer.current);
    const nextPlayerColor = Math.random() < 0.5 ? "w" : "b";
    const nextGame = new Chess();
    setGame(nextGame);
    setSelectedSquare(null);
    setMoveHistory([]);
    setLastMoveSquares([]);
    setCapturedPieces({ w: [], b: [] });
    setBotThinking(false);
    setPlayerColor(nextPlayerColor);
    if (nextPlayerColor === "b") makeBotMove(nextGame, "w");
  }
  useEffect(() => { resetGame(); return () => window.clearTimeout(botTimer.current); }, []);
  function selectSquare(square, piece) {
    if (botThinking || game.isGameOver() || game.turn() !== playerColor) return;
    if (selectedSquare && legalTargets.includes(square)) {
      const nextGame = new Chess(game.fen());
      const userMove = nextGame.move({ from: selectedSquare, to: square, promotion: "q" });
      if (!userMove) return;
      recordCapture(userMove);
      playMoveSound(Boolean(userMove.captured));
      setMoveHistory((current) => [...current, userMove.san]);
      setLastMoveSquares([userMove.from, userMove.to]);
      setSelectedSquare(null);
      setGame(new Chess(nextGame.fen()));
      if (!nextGame.isGameOver()) makeBotMove(nextGame, botColor);
      return;
    }
    setSelectedSquare(piece?.color === playerColor ? square : null);
  }
  return (
    <section className="chess-game" aria-label="Play chess against Tim's bot">
      <div className="chess-heading"><div><p>Play a game of chess with me</p></div><button type="button" onClick={resetGame}>New</button></div>
      <div className="capture-row bot-captures"><span>Tim</span><i>{capturedPieces[playerColor].map((type, index) => <b key={`${type}-${index}`}>{pieces[playerColor][type]}</b>)}</i>{materialDifference < 0 && <strong>+{Math.abs(materialDifference)}</strong>}</div>
      <div className="chess-board-wrap"><div className="chessboard" role="grid" aria-label="Interactive chess board">
        {displayedBoard.flatMap((rank, rankIndex) => rank.map((piece, fileIndex) => {
          const square = playerColor === "w" ? `${"abcdefgh"[fileIndex]}${8 - rankIndex}` : `${"abcdefgh"[7 - fileIndex]}${rankIndex + 1}`;
          return <button type="button" role="gridcell" aria-label={`${square}${piece ? ` ${piece.color === "w" ? "white" : "black"} ${piece.type}` : ""}`} key={square} className={`chess-square ${(rankIndex + fileIndex) % 2 ? "dark" : "light"} ${lastMoveSquares.includes(square) ? "is-last-move" : ""} ${selectedSquare === square ? "is-selected" : ""} ${legalTargets.includes(square) ? "is-target" : ""} ${checkedKingSquare === square ? "is-in-check" : ""}`} onClick={() => selectSquare(square, piece)}>{piece && <span className={piece.color === "w" ? "white-piece" : "black-piece"}>{pieces[piece.color][piece.type]}</span>}</button>;
        }))}
      </div>{game.isCheckmate() && <div className="game-over-banner"><strong>Checkmate</strong><span>{game.turn() === playerColor ? "Tim wins" : "You win"}</span><button type="button" onClick={resetGame}>Play again</button></div>}</div>
      <div className="capture-row player-captures"><span>You</span><i>{capturedPieces[botColor].map((type, index) => <b key={`${type}-${index}`}>{pieces[botColor][type]}</b>)}</i>{materialDifference > 0 && <strong>+{materialDifference}</strong>}</div>
      <p className="game-status" aria-live="polite">{gameStatus}</p>
      <p className="move-history">{moveHistory.length ? moveHistory.join(" · ") : `You play ${playerColor === "w" ? "White" : "Black"}.`}</p>
    </section>
  );
}
