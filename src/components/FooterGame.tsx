import { useEffect, useId, useState } from "react";

const SYMBOLS = ["✳", "◉", "▧", "♥"];
function newDeck() {
  const deck = SYMBOLS.flatMap((symbol) => [symbol, symbol]);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export default function FooterGame() {
  const regionId = useId();
  const [open, setOpen] = useState(false);
  const [deck, setDeck] = useState(newDeck);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [message, setMessage] = useState("Find the four matching pairs.");
  const waiting = flipped.length === 2;

  useEffect(() => {
    if (flipped.length !== 2) return;
    const [a, b] = flipped;
    if (deck[a] === deck[b]) {
      setMatched((prev) => [...prev, a, b]);
      setFlipped([]);
      setMessage(
        matched.length === 6
          ? "All four pairs found. Nicely done!"
          : "A match! Keep going.",
      );
      return;
    }
    setMessage("Different designs — try another pair.");
    const timer = setTimeout(() => setFlipped([]), 750);
    return () => clearTimeout(timer);
  }, [flipped, deck, matched.length]);

  function restart() {
    setDeck(newDeck());
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setMessage("Find the four matching pairs.");
  }
  function flip(index: number) {
    if (waiting || matched.includes(index) || flipped.includes(index)) return;
    if (flipped.length === 1) setMoves((value) => value + 1);
    setFlipped((prev) => [...prev, index]);
  }
  const complete = matched.length === deck.length;
  return (
    <section className="footer-game" aria-label="Poster pairs game">
      <div className="footer-game-intro">
        <div>
          <p className="game-kicker">A tiny art break</p>
          <h2>Good walls. Good play.</h2>
          <p>Eight tiles. Four pairs. A little joy.</p>
        </div>
        <button
          type="button"
          className="funk-button"
          aria-expanded={open}
          aria-controls={regionId}
          onClick={() => {
            setOpen(!open);
            if (!open) restart();
          }}
        >
          {open ? "Hide game" : "Play poster pairs"}
          <span aria-hidden="true">{open ? "−" : "↗"}</span>
        </button>
      </div>
      <div id={regionId} hidden={!open} className="poster-pairs">
        <div className="game-status">
          <span>
            Pairs <b>{matched.length / 2}/4</b>
          </span>
          <span>
            Moves <b>{moves}</b>
          </span>
          <button type="button" onClick={restart}>
            Start again ↻
          </button>
        </div>
        <p id={regionId + "-help"} className="game-help">
          Tap two tiles to find a pair. You can also use Tab and Enter.
        </p>
        <div
          className="game-board"
          role="group"
          aria-label="Eight poster tiles"
          aria-describedby={regionId + "-help"}
        >
          {deck.map((symbol, index) => {
            const found = matched.includes(index),
              revealed = found || flipped.includes(index);
            return (
              <button
                key={index}
                type="button"
                className={
                  "game-tile" +
                  (revealed ? " revealed" : "") +
                  (found ? " matched" : "")
                }
                onClick={() => flip(index)}
                aria-label={
                  revealed
                    ? "Tile " +
                      (index + 1) +
                      ": " +
                      symbol +
                      (found ? ", matched" : "")
                    : "Reveal tile " + (index + 1)
                }
                aria-pressed={revealed}
                disabled={found || flipped.includes(index) || waiting}
              >
                <span aria-hidden="true">{revealed ? symbol : "?"}</span>
              </button>
            );
          })}
        </div>
        <p role="status" aria-live="polite" className="game-feedback">
          {complete
            ? "All four pairs found in " + moves + " moves. ✳"
            : message}
        </p>
      </div>
    </section>
  );
}
