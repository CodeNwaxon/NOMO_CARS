"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Heart, Coins, Lightbulb, RefreshCw, AlertCircle, Play, SkipForward, Wallet, LogIn } from "lucide-react";
import { TRANSPORT_WORDS } from "@/lib/transportWords";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const PaystackCoinCard = dynamic(() => import('@/components/PaystackCoinCard'), { ssr: false });

const MAX_WRONG_GUESSES = 6;
const DAILY_REFILL_MS = 24 * 60 * 60 * 1000;

interface WordGameModalProps {
  onClose: () => void;
}

export default function WordGameModal({ onClose }: WordGameModalProps) {
  const { user, profile } = useAuth();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [word, setWord] = useState("");
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [money, setMoney] = useState(0);
  const [lives, setLives] = useState(3);
  const [hints, setHints] = useState(8);
  const [skips, setSkips] = useState(3);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [nextRefillTime, setNextRefillTime] = useState<number | null>(null);
  const [lastPick, setLastPick] = useState<string | null>(null);

  const [gameState, setGameState] = useState<"playing" | "won" | "lost" | "cooldown">("playing");
  const [timeLeft, setTimeLeft] = useState("");
  const [customAlert, setCustomAlert] = useState<{ title: string, message: string, type: "error" | "success" } | null>(null);

  const [coinPackages, setCoinPackages] = useState<{ coins: number, price: number }[]>([]);
  const [showCoinStore, setShowCoinStore] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [isProcessingCoins, setIsProcessingCoins] = useState<number | null>(null);

  const showAlert = (title: string, message: string, type: "error" | "success" = "error") => {
    setCustomAlert({ title, message, type });
  };

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const snap = await getDoc(doc(db, "adminSettings", "pricing"));
        if (snap.exists()) {
          const data = snap.data();
          if (data.coinPackages) {
            setCoinPackages(data.coinPackages);
            return;
          }
        }
        setCoinPackages([{ coins: 10, price: 100 }, { coins: 20, price: 150 }, { coins: 50, price: 200 }]);
      } catch (e) {
        setCoinPackages([{ coins: 10, price: 100 }, { coins: 20, price: 150 }, { coins: 50, price: 200 }]);
      }
    };
    fetchPrices();
  }, []);

  const saveState = async (m: number, l: number, h: number, s: number, gp: number, nrt: number | null) => {
    localStorage.setItem("nomo_word_game", JSON.stringify({
      money: m,
      lives: l,
      hints: h,
      skips: s,
      gamesPlayed: gp,
      nextRefillTime: nrt
    }));

    if (user?.uid) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          gameCoins: m
        });
      } catch (err) {
        console.error("Failed to sync game coins", err);
      }
    }
  };

  const startNewGame = useCallback((currentGp: number) => {
    let randomWord = "";
    if (currentGp < 5) {
      const easyWords = TRANSPORT_WORDS.filter(w => w.length < 5);
      if (easyWords.length > 0) {
        randomWord = easyWords[Math.floor(Math.random() * easyWords.length)].toUpperCase();
      } else {
        randomWord = TRANSPORT_WORDS[Math.floor(Math.random() * TRANSPORT_WORDS.length)].toUpperCase();
      }
    } else {
      randomWord = TRANSPORT_WORDS[Math.floor(Math.random() * TRANSPORT_WORDS.length)].toUpperCase();
    }
    setWord(randomWord);
    setGuessedLetters(new Set());
    setLastPick(null);
    setGameState("playing");
  }, []);

  useEffect(() => {
    const savedData = localStorage.getItem("nomo_word_game");
    let currentMoney = 0;
    let currentLives = 3;
    let currentHints = 8;
    let currentSkips = 3;
    let currentGamesPlayed = 0;
    let currentRefill = null;

    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        currentMoney = parsed.money ?? 0;
        currentLives = parsed.lives ?? 3;
        currentHints = parsed.hints ?? 8;
        currentSkips = parsed.skips ?? 3;
        currentGamesPlayed = parsed.gamesPlayed ?? 0;
        currentRefill = parsed.nextRefillTime ?? null;

        // Use older cooldown format if it exists instead of wiping it
        if (!currentRefill && parsed.cooldownUntil) {
          currentRefill = parsed.cooldownUntil;
        }

        if (currentRefill && Date.now() >= currentRefill) {
          if (currentLives < 3) currentLives = 3;
          currentRefill = null;
        }
      } catch (e) {
        console.error("Failed to parse game data", e);
      }
    }

    setMoney(currentMoney);
    setLives(currentLives);
    setHints(currentHints);
    setSkips(currentSkips);
    setGamesPlayed(currentGamesPlayed);
    setNextRefillTime(currentRefill);

    if (currentLives <= 0) {
      setGameState("cooldown");
    } else {
      startNewGame(currentGamesPlayed);
    }

    setMounted(true);
  }, [startNewGame]);

  useEffect(() => {
    if ((profile as any)?.gameCoins && (profile as any).gameCoins > money) {
      setMoney((profile as any).gameCoins);
      saveState((profile as any).gameCoins, lives, hints, skips, gamesPlayed, nextRefillTime);
    }
  }, [(profile as any)?.gameCoins]);

  useEffect(() => {
    if (!nextRefillTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now >= nextRefillTime) {
        if (lives < 3) setLives(3);
        setNextRefillTime(null);
        if (gameState === "cooldown") {
          setGameState("playing");
          startNewGame(gamesPlayed);
        }
        saveState(money, Math.max(3, lives), hints, skips, gamesPlayed, null);
        clearInterval(interval);
      } else {
        if (gameState === "cooldown") {
          const diff = nextRefillTime - now;
          const h = Math.floor(diff / (60 * 60 * 1000));
          const m = Math.floor((diff % (60 * 60 * 1000)) / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${h}h ${m}m ${s}s`);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, nextRefillTime, money, lives, hints, skips, gamesPlayed, startNewGame]);

  const handleGuess = useCallback((letter: string) => {
    if (gameState !== "playing") return;

    if (guessedLetters.has(letter)) {
      if (lastPick === letter) {
        const newGuessed = new Set(guessedLetters);
        newGuessed.delete(letter);
        setGuessedLetters(newGuessed);
        setLastPick(null);
        toast.success("Pick undone!");
      } else {
        toast.error("You can only undo your very last pick!");
      }
      return;
    }

    const newGuessed = new Set(guessedLetters);
    newGuessed.add(letter);
    setGuessedLetters(newGuessed);
    setLastPick(letter);

    const wrongGuesses = Array.from(newGuessed).filter(l => !word.includes(l)).length;
    const isWon = word.split("").every(l => newGuessed.has(l));

    if (isWon) {
      setGameState("won");
      let reward = 3;
      if (word.length >= 10) reward = 8;
      else if (word.length >= 5) reward = 5;

      const newMoney = money + reward;
      const newGp = gamesPlayed + 1;
      setMoney(newMoney);
      setSkips(3);
      setGamesPlayed(newGp);
      saveState(newMoney, lives, hints, 3, newGp, nextRefillTime);
      toast.success(`You won ${reward} game money! Skips reset to 3!`);
    } else if (wrongGuesses >= MAX_WRONG_GUESSES) {
      setGameState("lost");
      const newLives = lives - 1;
      const newGp = gamesPlayed + 1;
      setLives(newLives);
      setGamesPlayed(newGp);

      let newRefill = nextRefillTime;
      if (!newRefill && newLives < 3) {
        newRefill = Date.now() + DAILY_REFILL_MS;
        setNextRefillTime(newRefill);
      }

      if (newLives <= 0) {
        setGameState("cooldown");
        saveState(money, 0, hints, skips, newGp, newRefill);
        toast.error("You are out of lives! Refill in 24 hours.");
      } else {
        saveState(money, newLives, hints, skips, newGp, newRefill);
        toast.error("You lost this round!");
      }
    }
  }, [gameState, guessedLetters, word, money, lives, hints, skips, gamesPlayed, nextRefillTime, lastPick]);

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

      let newRefill = nextRefillTime;
      if (newLives >= 3) newRefill = null;
      setNextRefillTime(newRefill);

      saveState(newMoney, newLives, hints, skips, gamesPlayed, newRefill);
      toast.success("Bought 1 Life!");

      if (gameState === "cooldown") {
        setGameState("playing");
        startNewGame(gamesPlayed);
      }
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
      saveState(newMoney, lives, newHints, skips, gamesPlayed, nextRefillTime);
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
    saveState(money, lives, newHints, skips, gamesPlayed, nextRefillTime);
    handleGuess(randomLetter);
    toast.success("Hint used!");
  };

  const useSkip = () => {
    if (gameState !== "playing") return;
    if (skips <= 0) {
      showAlert("Out of Skips", "You have no skips left! Answer a word correctly to reset your skips.", "error");
      return;
    }
    const newSkips = skips - 1;
    setSkips(newSkips);
    saveState(money, lives, hints, newSkips, gamesPlayed, nextRefillTime);
    startNewGame(gamesPlayed);
    toast.success("Word skipped!");
  };

  const handleBuyCoinsClick = () => {
    if (!user) {
      showAlert(
        "Login Required",
        "You must be signed in to purchase game coins so you don't lose them.",
        "error"
      );
      return;
    }
    setShowCoinStore(true);
  };

  if (!mounted) return null;

  const wrongGuesses = Array.from(guessedLetters).filter(l => !word.includes(l)).length;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  let difficultyTag = "Easy (3)";
  let difficultyColor = "bg-green-100 text-green-700 border-green-200";
  if (word.length >= 10) {
    difficultyTag = "Hard (8)";
    difficultyColor = "bg-red-100 text-red-700 border-red-200";
  } else if (word.length >= 5) {
    difficultyTag = "Mid (5)";
    difficultyColor = "bg-yellow-100 text-yellow-700 border-yellow-200";
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=2070&auto=format&fit=crop')" }}
      >
        <div className="absolute inset-0 dark:bg-black/80 bg-white/90 z-0 transition-colors duration-300"></div>

        <div className="relative w-full max-w-2xl mt-4 md:mt-0 z-10 flex flex-col items-center">

          <div className="flex justify-between items-center mb-3 w-full px-2 max-w-2xl">
            <button
              onClick={handleBuyCoinsClick}
              className="h-10 px-4 md:px-5 flex items-center gap-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-lg font-black text-xs md:text-sm shadow-amber-500/20 border border-amber-400"
            >
              <Wallet className="w-4 h-4 md:w-5 md:h-5" /> Buy Coins
            </button>

            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition-all shadow-lg border border-slate-200 dark:border-slate-700"
            >
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg md:rounded-3xl px-3 py-6 md:p-6 w-full shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto relative">

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
                  {customAlert.title === "Login Required" ? (
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-brand-primary/10 text-brand-primary">
                      <LogIn className="w-8 h-8" />
                    </div>
                  ) : (
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${customAlert.type === 'error' ? 'bg-rose-100 text-rose-500' : 'bg-green-100 text-green-500'}`}>
                      <AlertCircle className="w-8 h-8" />
                    </div>
                  )}
                  <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">{customAlert.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">{customAlert.message}</p>

                  {customAlert.title === "Login Required" ? (
                    <button
                      onClick={() => router.push("/auth")}
                      className="w-full py-3 font-bold rounded-xl text-white shadow-md transition-all flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/90"
                    >
                      Sign In Now
                    </button>
                  ) : (
                    <button
                      onClick={() => setCustomAlert(null)}
                      className={`w-full py-3 font-bold rounded-xl text-white shadow-md transition-all flex items-center justify-center gap-2 ${customAlert.type === 'error' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-green-500 hover:bg-green-600'}`}
                    >
                      Okay
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Store Overlay */}
            {showCoinStore && (
              <div className="absolute inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl p-6 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 text-center flex flex-col max-h-full">
                  <button
                    onClick={() => setShowCoinStore(false)}
                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all z-10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4 text-amber-500 mt-2">
                    <Wallet className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Buy Game Coins</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Select a coin package to purchase.</p>

                  <div className="flex-1 overflow-y-auto space-y-3 pb-2 px-1">
                    {coinPackages.map((pkg, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedPkg(pkg)}
                        className="w-full flex justify-between items-center p-4 rounded-xl border-2 border-slate-100 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all"
                      >
                        <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-500">
                          <Coins className="w-5 h-5" /> {pkg.coins} Coins
                        </div>
                        <div className="font-black text-slate-900 dark:text-white">
                          ₦{pkg.price.toLocaleString()}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-center mb-4 md:mb-6 gap-3 md:gap-4 border-b border-slate-100 dark:border-slate-800 pb-3 md:pb-4 mt-1 md:mt-2">
              <h2 className="text-lg md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Transport Word Guesser
              </h2>
              <div className="flex gap-2 md:gap-3">
                <div className="flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-3 md:py-1.5 bg-rose-100 text-rose-700 rounded-lg md:rounded-xl font-bold text-xs md:text-sm shadow-sm border border-rose-200">
                  <Heart className="w-3 h-3 md:w-4 md:h-4 fill-rose-500 text-rose-500" /> {lives}
                </div>
                <div className="flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-3 md:py-1.5 bg-amber-100 text-amber-700 rounded-lg md:rounded-xl font-bold text-xs md:text-sm shadow-sm border border-amber-200">
                  <Coins className="w-3 h-3 md:w-4 md:h-4 fill-amber-500 text-amber-500" /> {money}
                </div>
                <div className="flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-3 md:py-1.5 bg-sky-100 text-sky-700 rounded-lg md:rounded-xl font-bold text-xs md:text-sm cursor-pointer hover:bg-sky-200 transition-colors shadow-sm border border-sky-200" onClick={useHint} title="Click to use hint">
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
                  You've exhausted all your lives. You can either wait for your daily refill to finish or purchase a life with your game money.
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
                <div className="flex justify-between items-center w-full mb-2">
                  <div className="flex gap-2 items-center">
                    <div className={`px-2 py-1 md:px-3 md:py-1 rounded-lg md:rounded-full text-[10px] md:text-xs font-bold border ${difficultyColor}`}>
                      {difficultyTag}
                    </div>
                    <button
                      onClick={useSkip}
                      className="flex items-center gap-1 px-2 py-1 md:px-3 md:py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors rounded-lg md:rounded-full text-[10px] md:text-xs font-bold border border-purple-200 shadow-sm"
                      title="Skip word (resets on correct guess)"
                    >
                      <SkipForward className="w-3 h-3 md:w-4 md:h-4" /> Skip ({skips})
                    </button>
                  </div>
                  <div className="text-[10px] md:text-sm font-bold text-slate-500">
                    Misses: <span className={wrongGuesses >= MAX_WRONG_GUESSES - 1 ? "text-rose-500" : ""}>{wrongGuesses} / {MAX_WRONG_GUESSES}</span>
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
                    <button onClick={() => startNewGame(gamesPlayed)} className="mt-4 px-8 py-3 bg-brand-primary text-white font-bold rounded-xl shadow-lg hover:bg-brand-primary/90 hover:-translate-y-1 transition-all flex items-center gap-2 mx-auto">
                      <Play className="w-5 h-5 fill-white" /> Next Word
                    </button>
                  </div>
                )}

                {gameState === "lost" && (
                  <div className="mb-8 text-center animate-in zoom-in duration-300">
                    <h3 className="text-2xl font-black text-rose-500 mb-2">Game Over!</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">The word was <strong className="text-slate-900 dark:text-white">{word}</strong></p>
                    <button onClick={() => startNewGame(gamesPlayed)} className="mt-2 px-8 py-3 bg-brand-primary text-white font-bold rounded-xl shadow-lg hover:bg-brand-primary/90 hover:-translate-y-1 transition-all flex items-center gap-2 mx-auto">
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

      {selectedPkg && (
        <PaystackCoinCard
          pkg={selectedPkg}
          user={user}
          isProcessing={isProcessingCoins}
          setProcessing={setIsProcessingCoins}
          onClose={() => setSelectedPkg(null)}
          onSuccess={(ref: any, purchasedPkg: any) => {
            const newMoney = money + purchasedPkg.coins;
            setMoney(newMoney);
            saveState(newMoney, lives, hints, skips, gamesPlayed, nextRefillTime);
            setSelectedPkg(null);
            setShowCoinStore(false);
            showAlert("Payment Successful", `You successfully purchased ${purchasedPkg.coins} Game Coins!`, "success");
          }}
        />
      )}
    </>
  );
}
