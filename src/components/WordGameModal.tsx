"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Heart, Coins, Lightbulb, RefreshCw, AlertCircle, Play } from "lucide-react";
import { TRANSPORT_WORDS } from "@/lib/transportWords";
import { toast } from "react-hot-toast";

const MAX_WRONG_GUESSES = 6;
const COOLDOWN_MS = 40 * 60 * 1000; // 40 minutes

interface WordGameModalProps {
  onClose: () => void;
}

export default function WordGameModal({ onClose }: WordGameModalProps) {
  const [mounted, setMounted] = useState(false);
  const [word, setWord] = useState("");
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [money, setMoney] = useState(0);
  const [lives, setLives] = useState(3);
  const [hints, setHints] = useState(8);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [gameState, setGameState] = useState<"playing" | "won" | "lost" | "cooldown">("playing");
  const [timeLeft, setTimeLeft] = useState("");
  const [customAlert, setCustomAlert] = useState<{ title: string, message: string, type: "error" | "success" } | null>(null);

  const showAlert = (title: string, message: string, type: "error" | "success" = "error") => {
    setCustomAlert({ title, message, type });
  };

  // Load state from local storage on mount
  useEffect(() => {
    const savedData = localStorage.getItem("nomo_word_game");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setMoney(parsed.money ?? 0);
        setLives(parsed.lives ?? 3);
        setHints(parsed.hints ?? 8);

        if (parsed.cooldownUntil && Date.now() < parsed.cooldownUntil) {
          setCooldownUntil(parsed.cooldownUntil);
          setGameState("cooldown");
        } else if (parsed.cooldownUntil && Date.now() >= parsed.cooldownUntil) {
          // Cooldown finished, reset lives
          setLives(3);
          setCooldownUntil(null);
          saveState(parsed.money ?? 0, 3, parsed.hints ?? 8, null);
        }
      } catch (e) {
        console.error("Failed to parse game data", e);
      }
    }
    startNewGame();
    setMounted(true);
  }, []);

  // Save state helper
  const saveState = (m: number, l: number, h: number, c: number | null) => {
    localStorage.setItem("nomo_word_game", JSON.stringify({
      money: m,
      lives: l,
      hints: h,
      cooldownUntil: c
    }));
  };

  // Cooldown timer
  useEffect(() => {
    if (gameState !== "cooldown" || !cooldownUntil) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now >= cooldownUntil) {
        setGameState("playing");
        setCooldownUntil(null);
        setLives(3);
        saveState(money, 3, hints, null);
        startNewGame();
        clearInterval(interval);
      } else {
        const diff = cooldownUntil - now;
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${m}m ${s}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, cooldownUntil, money, hints]);

  const startNewGame = useCallback(() => {
    const randomWord = TRANSPORT_WORDS[Math.floor(Math.random() * TRANSPORT_WORDS.length)].toUpperCase();
    setWord(randomWord);
    setGuessedLetters(new Set());
    setGameState("playing");
  }, []);

  const handleGuess = useCallback((letter: string) => {
    if (gameState !== "playing" || guessedLetters.has(letter)) return;

    const newGuessed = new Set(guessedLetters);
    newGuessed.add(letter);
    setGuessedLetters(newGuessed);

    // Check win/loss condition
    const wrongGuesses = Array.from(newGuessed).filter(l => !word.includes(l)).length;
    const isWon = word.split("").every(l => newGuessed.has(l));

    if (isWon) {
      setGameState("won");
      let reward = 3;
      if (word.length >= 10) reward = 8;
      else if (word.length >= 5) reward = 5;

      const newMoney = money + reward;
      setMoney(newMoney);
      saveState(newMoney, lives, hints, cooldownUntil);
      toast.success(`You won ${reward} game money!`);
    } else if (wrongGuesses >= MAX_WRONG_GUESSES) {
      setGameState("lost");
      const newLives = lives - 1;
      setLives(newLives);

      if (newLives <= 0) {
        const cooldown = Date.now() + COOLDOWN_MS;
        setCooldownUntil(cooldown);
        setGameState("cooldown");
        saveState(money, 0, hints, cooldown);
        toast.error("You are out of lives! Try again in 40 minutes.");
      } else {
        saveState(money, newLives, hints, cooldownUntil);
        toast.error("You lost this round!");
      }
    }
  }, [gameState, guessedLetters, word, money, lives, hints, cooldownUntil]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.match(/^[a-zA-Z]$/)) {
        handleGuess(e.key.toUpperCase());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleGuess]);

  const buyLife = () => {
    if (money >= 20) {
      const newMoney = money - 20;
      const newLives = lives + 1;
      setMoney(newMoney);
      setLives(newLives);
      saveState(newMoney, newLives, hints, cooldownUntil);
      toast.success("Bought 1 Life!");
    } else {
      showAlert("Not Enough Coins", "You need 20 game coins to buy a life.", "error");
    }
  };

  const buyHint = () => {
    if (money >= 30) {
      const newMoney = money - 30;
      const newHints = hints + 1;
      setMoney(newMoney);
      setHints(newHints);
      saveState(newMoney, lives, newHints, cooldownUntil);
      toast.success("Bought 1 Hint!");
    } else {
      showAlert("Not Enough Coins", "You need 30 game coins to buy a hint.", "error");
    }
  };

  const useHint = () => {
    if (gameState !== "playing") return;
    if (hints <= 0) {
      showAlert("Out of Hints", "You have no hints left! Buy more from the store below.", "error");
      return;
    }

    const unrevealed = word.split("").filter(l => !guessedLetters.has(l));
    if (unrevealed.length === 0) return;

    const randomLetter = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const newHints = hints - 1;
    setHints(newHints);
    saveState(money, lives, newHints, cooldownUntil);
    handleGuess(randomLetter);
    toast.success("Hint used!");
  };

  if (!mounted) return null;

  const wrongGuesses = Array.from(guessedLetters).filter(l => !word.includes(l)).length;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  let difficultyTag = "Easy (3 Coins)";
  let difficultyColor = "bg-green-100 text-green-700 border-green-200";
  if (word.length >= 10) {
    difficultyTag = "Hard (8 Coins)";
    difficultyColor = "bg-red-100 text-red-700 border-red-200";
  } else if (word.length >= 5) {
    difficultyTag = "Medium (5 Coins)";
    difficultyColor = "bg-yellow-100 text-yellow-700 border-yellow-200";
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-6 md:p-8 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl mt-8 md:mt-0">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 md:-right-12 md:top-0 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-all z-[310] backdrop-blur-md shadow-lg border border-white/20"
        >
          <X className="w-4 h-4 md:w-6 md:h-6" />
        </button>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto relative">

          {/* Custom Alert Overlay */}
          {customAlert && (
            <div className="absolute inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl p-6 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-200 text-center">
                <button
                  onClick={() => setCustomAlert(null)}
                  className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${customAlert.type === 'error' ? 'bg-rose-100 text-rose-500' : 'bg-green-100 text-green-500'}`}>
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">{customAlert.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">{customAlert.message}</p>
                <button
                  onClick={() => setCustomAlert(null)}
                  className={`w-full py-3 font-bold rounded-xl text-white shadow-md transition-all flex items-center justify-center gap-2 ${customAlert.type === 'error' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-green-500 hover:bg-green-600'}`}
                >
                  Okay
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-center mb-4 md:mb-6 gap-3 md:gap-4 border-b border-slate-100 dark:border-slate-800 pb-3 md:pb-4 mt-1 md:mt-2">
            <h2 className="text-lg md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              Transport Word Guesser
            </h2>
            <div className="flex gap-2 md:gap-3">
              <div className="flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-3 md:py-1.5 bg-rose-100 text-rose-700 rounded-lg md:rounded-xl font-bold text-xs md:text-sm">
                <Heart className="w-3 h-3 md:w-4 md:h-4 fill-rose-500 text-rose-500" /> {lives}
              </div>
              <div className="flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-3 md:py-1.5 bg-amber-100 text-amber-700 rounded-lg md:rounded-xl font-bold text-xs md:text-sm">
                <Coins className="w-3 h-3 md:w-4 md:h-4 fill-amber-500 text-amber-500" /> {money}
              </div>
              <div className="flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-3 md:py-1.5 bg-sky-100 text-sky-700 rounded-lg md:rounded-xl font-bold text-xs md:text-sm cursor-pointer hover:bg-sky-200 transition-colors" onClick={useHint} title="Click to use hint">
                <Lightbulb className="w-3 h-3 md:w-4 md:h-4 fill-sky-500 text-sky-500" /> {hints}
              </div>
            </div>
          </div>

          {gameState === "cooldown" ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Heart className="w-10 h-10 text-rose-500" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Out of Lives!</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
                You've exhausted all your lives. You can either wait for the cooldown to finish or purchase a life with your game money.
              </p>
              <div className="text-4xl font-black text-brand-primary mb-8 tracking-wider">
                {timeLeft}
              </div>
              <button
                onClick={buyLife}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2"
              >
                <Coins className="w-5 h-5" /> Buy 1 Life for 20 Coins
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center flex-1">
              <div className="flex justify-between w-full mb-2">
                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${difficultyColor}`}>
                  {difficultyTag}
                </div>
                <div className="text-sm font-bold text-slate-500">
                  Mistakes: <span className={wrongGuesses >= MAX_WRONG_GUESSES - 1 ? "text-rose-500" : ""}>{wrongGuesses} / {MAX_WRONG_GUESSES}</span>
                </div>
              </div>

              {/* Word Display */}
              <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 my-4 md:my-8">
                {word.split("").map((letter, i) => (
                  <div key={i} className={`w-8 h-10 md:w-14 md:h-16 flex items-center justify-center text-xl md:text-3xl font-black rounded-lg md:rounded-xl shadow-sm border-2 ${guessedLetters.has(letter) || gameState === "lost"
                    ? "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    : "bg-slate-200 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800/50 text-transparent"
                    }`}>
                    {guessedLetters.has(letter) ? letter : (gameState === "lost" ? <span className="text-rose-500 opacity-50">{letter}</span> : "")}
                  </div>
                ))}
              </div>

              {/* Game Over States */}
              {gameState === "won" && (
                <div className="mb-8 text-center animate-in zoom-in duration-300">
                  <h3 className="text-2xl font-black text-green-500 mb-2">Awesome! Correct!</h3>
                  <button onClick={startNewGame} className="mt-4 px-8 py-3 bg-brand-primary text-white font-bold rounded-xl shadow-lg hover:bg-brand-primary/90 hover:-translate-y-1 transition-all flex items-center gap-2 mx-auto">
                    <Play className="w-5 h-5 fill-white" /> Next Word
                  </button>
                </div>
              )}

              {gameState === "lost" && (
                <div className="mb-8 text-center animate-in zoom-in duration-300">
                  <h3 className="text-2xl font-black text-rose-500 mb-2">Game Over!</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">The word was <strong className="text-slate-900 dark:text-white">{word}</strong></p>
                  <button onClick={startNewGame} className="mt-2 px-8 py-3 bg-brand-primary text-white font-bold rounded-xl shadow-lg hover:bg-brand-primary/90 hover:-translate-y-1 transition-all flex items-center gap-2 mx-auto">
                    <RefreshCw className="w-5 h-5" /> Try Again (-1 Life)
                  </button>
                </div>
              )}

              {/* Keyboard */}
              {gameState === "playing" && (
                <div className="flex flex-wrap justify-center gap-1 md:gap-2 w-full max-w-lg mx-auto">
                  {alphabet.map((letter) => {
                    const isGuessed = guessedLetters.has(letter);
                    const isCorrect = isGuessed && word.includes(letter);
                    const isWrong = isGuessed && !word.includes(letter);

                    let btnClass = "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800";
                    if (isCorrect) btnClass = "bg-green-500 border-green-600 text-white opacity-50 cursor-not-allowed";
                    if (isWrong) btnClass = "bg-slate-300 dark:bg-slate-800 border-slate-400 dark:border-slate-700 text-slate-500 opacity-50 cursor-not-allowed";

                    return (
                      <button
                        key={letter}
                        onClick={() => handleGuess(letter)}
                        disabled={isGuessed}
                        className={`w-7 h-9 md:w-12 md:h-14 rounded-lg md:rounded-xl border-b-2 md:border-b-4 font-bold text-sm md:text-lg transition-all ${btnClass} ${!isGuessed ? 'active:border-b-0 active:translate-y-1' : ''}`}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Store Area */}
              <div className="mt-auto w-full pt-6 flex flex-wrap justify-center gap-3 md:gap-4">
                <button
                  onClick={buyLife}
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-lg md:rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 md:gap-2 text-xs md:text-sm border border-slate-200 dark:border-slate-700"
                >
                  Buy Life (20 <Coins className="w-3 h-3 md:w-3 md:h-3 text-amber-500" />)
                </button>
                <button
                  onClick={buyHint}
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-lg md:rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 md:gap-2 text-xs md:text-sm border border-slate-200 dark:border-slate-700"
                >
                  Buy Hint (30 <Coins className="w-3 h-3 md:w-3 md:h-3 text-amber-500" />)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
