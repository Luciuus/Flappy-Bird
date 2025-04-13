import { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";

interface FlappyBirdProps {
  musicVolume: number;
  setMusicVolume: (volume: number) => void;
}

export default function FlappyBird({
  musicVolume,
  setMusicVolume,
}: FlappyBirdProps) {
  // Game settings
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const gravity = isMobile ? 0.2 : 0.3;
  const pipeSpeed = isMobile ? 1 : 2;
  const jumpForce = isMobile ? -3 : -5;
  const pipeWidth = 80;
  const pipeGap = 150;
  const birdSize = 40;
  const birdX = 100;
  const minPipeHeight = 50;
  const maxPipeHeight = 300;

  // Game state
  const [birdY, setBirdY] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [pipes, setPipes] = useState<
    { id: number; x: number; height: number; passed: boolean }[]
  >([]);
  const [birdPosition, setBirdPosition] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [birdVisible, setBirdVisible] = useState(false);
  const [gameHeight, setGameHeight] = useState(0);
  const [gameWidth, setGameWidth] = useState(0);
  const [birdFlap, setBirdFlap] = useState(false);
  const [soundVolume, setSoundVolume] = useState(0.3); // Default to 30% volume
  const [isMenuOpen, setIsMenuOpen] = useState(false); // State for menu visibility

  // Sound references
  const jumpSoundRef = useRef<HTMLAudioElement | null>(null);
  const scoreSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setBirdPosition((prev) => (prev === 0 ? -10 : 0));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Initialize game dimensions and high score
  useEffect(() => {
    const updateDimensions = () => {
      setGameHeight(window.innerHeight);
      setGameWidth(window.innerWidth);
    };

    // Load high score from localStorage if available
    const savedHighScore = localStorage.getItem("flappyBirdHighScore");
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore));
    }

    // Create audio elements for sounds
    jumpSoundRef.current = new Audio();
    jumpSoundRef.current.src =
      "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAB4eHh4eHh4eHh4";
    jumpSoundRef.current.volume = soundVolume;

    scoreSoundRef.current = new Audio();
    scoreSoundRef.current.src =
      "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAB8fHx8fHx8fHx8";
    scoreSoundRef.current.volume = soundVolume;

    // Load sound effects (using actual sound effects)
    jumpSoundRef.current.src = "flaps.mp3"; // Jump sound
    scoreSoundRef.current.src = "coin.mp3"; // Score sound

    // Pre-load the sounds
    jumpSoundRef.current.load();
    scoreSoundRef.current.load();

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => window.removeEventListener("resize", updateDimensions);
  }, [soundVolume]);

  // Play jump sound
  const playJumpSound = () => {
    if (jumpSoundRef.current) {
      jumpSoundRef.current.currentTime = 0;
      jumpSoundRef.current
        .play()
        .catch((e) => console.log("Audio play failed:", e));
    }
  };

  // Play score sound
  const playScoreSound = () => {
    if (scoreSoundRef.current) {
      scoreSoundRef.current.currentTime = 0;
      scoreSoundRef.current
        .play()
        .catch((e) => console.log("Audio play failed:", e));
    }
  };

  // Start game function
  const startGame = () => {
    setBirdVisible(true);
    setBirdY(gameHeight / 3);
    setVelocity(0); // Reset velocity to 0
    setPipes([]); // Clear pipes
    setGameOver(false); // Reset gameOver state
    setScore(0); // Reset score

    // Short delay before starting gameplay to let player see the bird appear
    setTimeout(() => {
      setGameStarted(true);
    }, 500);
  };

  // Bird jump function
  const jump = useCallback(() => {
    if (gameOver || !birdVisible) return;

    setVelocity(jumpForce);
    setBirdFlap(true);
    playJumpSound(); // Play jump sound when bird jumps
    setTimeout(() => setBirdFlap(false), 100);
  }, [gameOver, birdVisible]);

  // Handle keyboard controls
  useEffect(() => {
    interface KeyPressEvent extends KeyboardEvent {
      code: string;
    }

    const handleKeyPress = (e: KeyPressEvent): void => {
      if (e.code === "Space") {
        if (!birdVisible && !gameStarted && !gameOver) {
          startGame();
        } else {
          jump();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [jump, gameStarted, gameOver, birdVisible]);

  // Debounce function
  const debounce = <T extends (...args: any[]) => void>(
    func: T,
    delay: number
  ): T => {
    let debounceTimer: NodeJS.Timeout;
    return function (this: unknown, ...args: Parameters<T>) {
      const context = this;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => func.apply(context, args), delay);
    } as T;
  };

  // Handle touch for jumping - this is the optimized touch function
  const handleGameplayTouch = debounce((e) => {
    if (birdVisible && gameStarted && !gameOver && !isMenuOpen) {
      e.preventDefault(); // Prevent default only for gameplay
      jump();
    }
  }, 100); // Adjust the delay as needed

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver || !gameHeight || !gameWidth || isMenuOpen)
      return;

    let animationFrameId: number;

    const gameLoop = () => {
      // Update bird
      setBirdY((prev) => {
        const newY = prev + velocity;
        if (newY >= gameHeight - birdSize - 80) {
          handleGameOver();
          return gameHeight - birdSize - 80;
        }
        return newY;
      });
      setVelocity((prev) => prev + gravity);

      // Move pipes
      setPipes((prevPipes) => {
        const newPipes = prevPipes
          .map((pipe) => ({
            ...pipe,
            x: pipe.x - pipeSpeed,
            passed: pipe.passed || (pipe.x + pipeWidth < birdX && !pipe.passed),
          }))
          .filter((pipe) => pipe.x + pipeWidth > 0);

        // Increment score if a new pipe has just been passed
        const newScorePipe = newPipes.find(
          (pipe) =>
            pipe.passed && !prevPipes.find((p) => p.id === pipe.id)?.passed
        );
        if (newScorePipe) {
          setScore((prev) => prev + 1);
          playScoreSound();
        }

        // Add a new pipe if the distance is sufficient
        const lastPipeX =
          newPipes.length > 0 ? newPipes[newPipes.length - 1].x : null;
        if (lastPipeX === null || gameWidth - lastPipeX >= 300) {
          const pipeHeight = Math.floor(
            Math.random() * (maxPipeHeight - minPipeHeight) + minPipeHeight
          );
          newPipes.push({
            id: Date.now(),
            x: gameWidth,
            height: pipeHeight,
            passed: false,
          });
        }

        return newPipes;
      });

      // Check for collisions
      pipes.forEach((pipe) => {
        const birdRight = birdX + birdSize;
        const birdBottom = birdY + birdSize;
        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + pipeWidth;
        const topPipeBottom = pipe.height;
        const bottomPipeTop = pipe.height + pipeGap;

        if (
          birdRight > pipeLeft &&
          birdX < pipeRight &&
          (birdY + 12 < topPipeBottom || birdBottom + 11 > bottomPipeTop)
        ) {
          handleGameOver();
        }
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    velocity,
    pipes,
    gameOver,
    gameStarted,
    gameHeight,
    gameWidth,
    birdX,
    birdY,
    isMenuOpen,
  ]);

  // Update screen dimensions periodically
  useEffect(() => {
    const updateDimensions = () => {
      setGameHeight(window.innerHeight);
      setGameWidth(window.innerWidth);
    };

    updateDimensions();
    const resizeInterval = setInterval(updateDimensions, 500);

    return () => clearInterval(resizeInterval);
  }, []);

  // Handle game over
  const handleGameOver = () => {
    setGameOver(true);
    // Update high score if needed
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("flappyBirdHighScore", score.toString());
    }
  };

  // Restart game
  const restart = () => {
    setBirdVisible(true);
    setBirdY(gameHeight / 3);
    setVelocity(0);
    setPipes([]);
    setGameOver(false);
    setScore(0);
    setGameStarted(true);
  };

  // Handle menu actions
  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleQuit = () => {
    window.close();
  };

  const handleContinue = () => {
    setIsMenuOpen(false);
  };

  // Create animated clouds
  const clouds = [
    { id: 1, x: "10%", y: "15%", size: 80, speed: 0.5 },
    { id: 2, x: "30%", y: "10%", size: 60, speed: 0.3 },
    { id: 3, x: "60%", y: "20%", size: 100, speed: 0.4 },
    { id: 4, x: "80%", y: "15%", size: 70, speed: 0.6 },
  ];

  return (
    <div
      className="relative w-full h-screen overflow-hidden select-none touch-none"
      onTouchStart={handleGameplayTouch}
      onClick={() => {
        // Only handle gameplay clicks, not UI buttons
        if (birdVisible && gameStarted && !gameOver && !isMenuOpen) {
          jump();
        } else if (!birdVisible && !gameStarted && !gameOver) {
          startGame();
        }
      }}
      style={{ height: "100vh", width: "100vw" }}
    >
      {/* Sky background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-300 to-sky-500 w-full h-full" />

      {/* Animated clouds */}
      {clouds.map((cloud) => (
        <div
          key={cloud.id}
          className="absolute rounded-full bg-white opacity-80"
          style={{
            left: cloud.x,
            top: cloud.y,
            width: cloud.size,
            height: cloud.size / 2,
            animation: `moveCloud ${30 / cloud.speed}s linear infinite`,
            boxShadow: "0 0 20px 8px white",
            zIndex: 1,
          }}
        />
      ))}

      {/* Ground */}
      <div className="absolute bottom-0 w-full h-16 bg-green-800 z-10" />
      <div className="absolute bottom-16 w-full h-4 bg-green-700 z-10" />

      {/* Hidden audio elements for sounds */}
      <audio ref={jumpSoundRef} preload="auto"></audio>
      <audio ref={scoreSoundRef} preload="auto"></audio>

      {/* Bird - only show when birdVisible is true */}
      {birdVisible && (
        <div
          className="absolute transition-transform"
          style={{
            top: birdY,
            left: birdX,
            width: birdSize,
            height: birdSize,
            transform: `rotate(${
              velocity > 0
                ? Math.min(velocity * 2, 40)
                : Math.max(velocity * 6, -40)
            }deg) scale(${birdFlap ? 0.95 : 1})`,
            zIndex: 10,
            transition: "transform 0.1s ease-in-out, opacity 0.5s ease-in-out",
            opacity: 1,
            animation: !gameStarted ? "birdEntrance 0.5s ease-out" : "none",
          }}
        >
          <img
            src="bird.png" // Replace with the path to your image
            alt="Bird"
            style={{
              width: "160%",
              height: "160%",
              objectFit: "cover",
            }}
          />
        </div>
      )}

      {/* Pipes */}
      {pipes.map((pipe) => (
        <div
          key={pipe.id}
          style={{
            position: "absolute",
            left: pipe.x,
            width: pipeWidth,
            height: "100%",
            zIndex: 5,
          }}
        >
          {/* Top Pipe */}
          <div
            className="absolute top-0 w-full bg-green-600 border-r-4 border-l-4 border-green-700"
            style={{ height: pipe.height }}
          >
            <div
              className="absolute bottom-0 w-full h-8 bg-green-500 border-t-4 border-b-4 border-r-4 border-l-4 border-green-700"
              style={{ left: -8, width: pipeWidth + 8 }}
            ></div>
          </div>

          {/* Bottom Pipe */}
          <div
            className="absolute w-full bg-green-600 border-r-4 border-l-4 border-green-700"
            style={{
              top: pipe.height + pipeGap,
              height: gameHeight - pipe.height - pipeGap,
            }}
          >
            <div
              className="absolute top-0 w-full h-8 bg-green-500 border-b-4 border-t-4 border-r-4 border-l-4 border-green-700"
              style={{ left: -8, width: pipeWidth + 8 }}
            ></div>
          </div>
        </div>
      ))}

      {/* Score */}
      {gameStarted && (
        <div
          className="absolute top-8 left-0 right-0 text-center text-white text-6xl font-bold z-30"
          style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}
        >
          {score}
        </div>
      )}

      {!gameStarted && !gameOver && (
        <div
          className="bg-gradient-to-b from-blue-400 to-blue-600 min-h-screen flex items-center justify-center p-4"
          onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling up
          onKeyDown={(e) => e.stopPropagation()} // Prevent key events from bubbling up
        >
          {/* Main container */}
          <div className="bg-blue-500 p-8 rounded-xl border-4 border-blue-700 shadow-2xl w-4/5 max-w-lg relative z-10">
            {/* Game title with fancy effect */}
            <div className="relative">
              <h1 className="text-center text-3xl md:text-6xl font-black text-yellow-300 md:mb-2 tracking-wider drop-shadow-lg">
                DAZED BIRD
              </h1>
            </div>

            {/* Bird character */}
            <div
              className="flex justify-center"
              style={{ transform: `translateY(${birdPosition}px)` }}
            >
              <img
                src="bird.png" // Replace with the path to your bird image
                alt="Bird"
                className="w-42 h-42"
              />
            </div>

            {/* High score */}
            <div className="bg-blue-600 p-2 rounded-lg mb-6 border-2 border-blue-700">
              <p className="text-center text-white text-2xl md:text-3xl">
                High Score:{" "}
                <span className="font-bold text-yellow-300">{highScore}</span>
              </p>
            </div>

            {/* How to play section */}
            <div
              className="bg-blue-700 p-4 rounded-lg mb-6 border-2 border-blue-800 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation(); // Prevent clicks from bubbling up
                setShowControls(!showControls);
              }}
            >
              <h2 className="text-center text-xl md:text-3xl font-bold text-white mb-2 flex items-center justify-center">
                HOW TO PLAY
              </h2>

              {showControls && (
                <div className="text-white space-y-2">
                  <div className="flex items-center justify-center space-x-4 mb-2">
                    <div className="bg-gray-200 rounded px-3 py-1 text-blue-800">
                      SPACE
                    </div>
                    <span>or</span>
                    <div className="bg-gray-200 rounded px-2 py-2">
                      <svg
                        className="w-6 h-6 text-blue-800"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M8 4a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2V6a2 2 0 00-2-2H8z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-center text-[12px] md:text-sm">
                    Tap screen or press spacebar to fly.
                    <br />
                    Avoid pipes and don't hit the ground!
                  </p>
                </div>
              )}
            </div>

            {/* Start button with pulse effect - Only this should start the game */}
            <button
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white text-xl font-bold rounded-full transition-all hover:scale-105 active:scale-95 border-b-4 border-green-800 shadow-lg"
              onClick={(e) => {
                e.stopPropagation(); // Prevent clicks from bubbling up
                startGame();
              }}
            >
              START GAME
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-gray-900 to-gray-800 p-8 rounded-xl border-4 shadow-2xl w-4/5 md:h-[400px] max-w-md">
            <h1
              className="text-center text-4xl font-extrabold text-red-500 mb-2"
              style={{ textShadow: "0 0 10px rgba(255,0,0,0.3)" }}
            >
              GAME OVER
            </h1>

            <div className="flex justify-center my-6">
              {score > highScore ? (
                <div className="bg-yellow-400 px-4 py-2 rounded-full">
                  <span className="text-black font-bold">NEW HIGH SCORE!</span>
                </div>
              ) : (
                <div className="w-16 h-16 relative">
                  <div
                    className="absolute inset-0 bg-red-500 rounded-full opacity-100"
                    style={{ transform: "rotate(45deg)" }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <X size={50} />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 bg-gray-800 p-4 rounded-lg mb-6">
              <div className="text-center">
                <p className="text-gray-400 text-sm">SCORE</p>
                <p className="text-white text-3xl font-bold">{score}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">BEST</p>
                <p className="text-white text-3xl font-bold">
                  {Math.max(score, highScore)}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white md:text-lg text-[15px] text-base font-bold rounded-lg transition-all hover:scale-105 active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  setBirdVisible(false);
                  setGameStarted(false);
                  setGameOver(false);
                  setPipes([]);
                  setScore(0);
                }}
              >
                MENU
              </button>
              <button
                className="flex-1 py-4 bg-green-600 hover:bg-green-700 text-white md:text-lg text-[15px] font-bold rounded-lg transition-all hover:scale-105 active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  restart();
                }}
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu */}
      {isMenuOpen && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl border-4 shadow-2xl w-4/5 md:h-[400px] flex flex-col justify-center max-w-md">
            <h2 className="text-center text-4xl font-bold mb-4 text-black">
              Game Menu
            </h2>
            <div className="mb-4">
              <label className="block text-gray-700">Sound Volume</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={soundVolume}
                onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700">Music Volume</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={musicVolume}
                onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex justify-center gap-4">
              <button
                className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all hover:scale-105 active:scale-95"
                onClick={handleQuit}
              >
                Quit
              </button>
              <button
                className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all hover:scale-105 active:scale-95"
                onClick={handleContinue}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Button */}
      <button
        className="absolute top-4 right-4 p-3 bg-black/40 backdrop-blur-md text-white rounded-lg shadow-lg flex items-center justify-center z-50"
        onClick={(e) => {
          e.stopPropagation(); // Prevents jump trigger
          handleMenuToggle();
        }}
        aria-label="Pause Game"
      >
        <span className="block w-2 h-8 bg-white mx-1 rounded-sm"></span>
        <span className="block w-2 h-8 bg-white mx-1 rounded-sm"></span>
      </button>

      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes moveCloud {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(${gameWidth}px);
          }
        }

        @keyframes birdEntrance {
          0% {
            opacity: 0;
            transform: scale(0.5) translateY(50px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
