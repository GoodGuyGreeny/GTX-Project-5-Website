// =============================================
// GAME STATE MANAGEMENT
// =============================================

let gameState = {
  currentScreen: 'start', // 'start', 'game', 'paused', 'win', 'game-over'
  difficulty: 'normal', // 'easy', 'normal', 'hard'
  score: 0,
  timeRemaining: 45,
  targetScore: 20,
  gameRunning: false,
  dropMaker: null,
  gameTimer: null,
  milestones: [
    { score: 5, message: "Great start!", shown: false },
    { score: 10, message: "Nice work!", shown: false },
    { score: 15, message: "Halfway there!", shown: false },
    { score: 18, message: "Almost there!", shown: false },
    { score: 20, message: "You did it!", shown: false }
  ]
};

// Difficulty configurations
const DIFFICULTIES = {
  easy: {
    timeLimit: 60,
    targetScore: 15,
    spawnRate: 1200, // milliseconds
    dropSpeed: 1.2,
    name: 'Easy'
  },
  normal: {
    timeLimit: 45,
    targetScore: 20,
    spawnRate: 900,
    dropSpeed: 1.0,
    name: 'Normal'
  },
  hard: {
    timeLimit: 30,
    targetScore: 25,
    spawnRate: 600,
    dropSpeed: 0.8,
    name: 'Hard'
  }
};

// =============================================
// AUDIO SYSTEM
// =============================================

let audioContext;
let sounds = {};

function initAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Create simple sound generators
    sounds.collect = createTone(800, 0.1, 'sine');
    sounds.miss = createTone(200, 0.2, 'sawtooth');
    sounds.win = createChord([523, 659, 784], 0.5);
    sounds.lose = createTone(150, 0.8, 'sawtooth');
    sounds.milestone = createTone(1000, 0.15, 'sine');
  } catch (e) {
    console.log('Audio not supported');
  }
}

function createTone(frequency, duration, type = 'sine') {
  return { frequency, duration, type };
}

function createChord(frequencies, duration) {
  return { frequencies, duration, type: 'chord' };
}

function playSound(soundName) {
  if (!audioContext || !sounds[soundName]) return;

  try {
    if (soundName === 'win') {
      // Play chord for win
      sounds[soundName].frequencies.forEach((freq, index) => {
        setTimeout(() => playTone(freq, sounds[soundName].duration, 'sine'), index * 100);
      });
    } else if (soundName === 'lose') {
      // Play descending tones for lose
      [300, 250, 200, 150].forEach((freq, index) => {
        setTimeout(() => playTone(freq, 0.15, 'sawtooth'), index * 150);
      });
    } else {
      // Play single tone
      const sound = sounds[soundName];
      playTone(sound.frequency, sound.duration, sound.type);
    }
  } catch (e) {
    console.log('Error playing sound:', e);
  }
}

function playTone(frequency, duration, type) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  oscillator.type = type;

  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

// =============================================
// DOM ELEMENTS
// =============================================

const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const pauseOverlay = document.getElementById('pause-overlay');
const winOverlay = document.getElementById('win-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');

const startGameBtn = document.getElementById('start-game-btn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const restartBtn = document.getElementById('restart-btn');
const quitBtn = document.getElementById('quit-btn');
const quitToMenuBtn = document.getElementById('quit-to-menu-btn');
const playAgainWinBtn = document.getElementById('play-again-win-btn');
const menuWinBtn = document.getElementById('menu-win-btn');
const replayBtn = document.getElementById('replay-btn');
const menuGameOverBtn = document.getElementById('menu-game-over-btn');

const gameContainer = document.getElementById('game-container');
const scoreDisplay = document.getElementById('score');
const timeDisplay = document.getElementById('time');
const targetScoreDisplay = document.getElementById('target-score');
const messageDisplay = document.getElementById('message-display');
const finalScoreWin = document.getElementById('final-score-win');
const timeLeftWin = document.getElementById('time-left-win');
const finalScoreGameOver = document.getElementById('final-score');
const targetMessage = document.getElementById('target-message');

const difficultyBtns = document.querySelectorAll('.difficulty-btn');

// =============================================
// EVENT LISTENERS
// =============================================

startGameBtn.addEventListener('click', () => startGame());
pauseBtn.addEventListener('click', () => setGameState('paused'));
resumeBtn.addEventListener('click', () => resumeGame());
restartBtn.addEventListener('click', () => restartGame());
quitBtn.addEventListener('click', () => quitToMenu());
quitToMenuBtn.addEventListener('click', () => quitToMenu());
playAgainWinBtn.addEventListener('click', () => restartGame());
menuWinBtn.addEventListener('click', () => quitToMenu());
replayBtn.addEventListener('click', () => restartGame());
menuGameOverBtn.addEventListener('click', () => quitToMenu());

// Difficulty selection
difficultyBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    difficultyBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gameState.difficulty = btn.dataset.difficulty;
  });
});

// =============================================
// GAME STATE MANAGEMENT
// =============================================

function setGameState(newState) {
  gameState.currentScreen = newState;

  // Hide all screens
  startScreen.classList.add('hidden');
  gameScreen.classList.add('hidden');
  pauseOverlay.classList.add('hidden');
  winOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');

  // Show current screen
  switch (newState) {
    case 'start':
      startScreen.classList.remove('hidden');
      break;
    case 'game':
      gameScreen.classList.remove('hidden');
      break;
    case 'paused':
      gameScreen.classList.remove('hidden');
      pauseOverlay.classList.remove('hidden');
      break;
    case 'win':
      gameScreen.classList.remove('hidden');
      winOverlay.classList.remove('hidden');
      break;
    case 'game-over':
      gameScreen.classList.remove('hidden');
      gameOverOverlay.classList.remove('hidden');
      break;
  }
}

// =============================================
// GAME FUNCTIONS
// =============================================

function startGame() {
  const difficulty = DIFFICULTIES[gameState.difficulty];

  // Initialize game state
  gameState.score = 0;
  gameState.timeRemaining = difficulty.timeLimit;
  gameState.targetScore = difficulty.targetScore;
  gameState.gameRunning = true;

  // Reset milestones
  gameState.milestones.forEach(milestone => milestone.shown = false);

  // Update displays
  updateScore(0);
  updateTimer();
  updateTargetScore();

  // Clear any existing drops
  clearDrops();

  // Start spawning drops
  gameState.dropMaker = setInterval(createDrop, difficulty.spawnRate);

  // Start countdown timer
  gameState.gameTimer = setInterval(countdown, 1000);

  // Change to game screen
  setGameState('game');

  // Initialize audio on first interaction
  if (!audioContext) {
    initAudio();
  }
}

function resumeGame() {
  gameState.gameRunning = true;
  setGameState('game');
}

function restartGame() {
  // Stop current game
  stopGame();

  // Start new game
  startGame();
}

function quitToMenu() {
  stopGame();
  setGameState('start');
}

function stopGame() {
  gameState.gameRunning = false;
  if (gameState.dropMaker) {
    clearInterval(gameState.dropMaker);
    gameState.dropMaker = null;
  }
  if (gameState.gameTimer) {
    clearInterval(gameState.gameTimer);
    gameState.gameTimer = null;
  }
  clearDrops();
}

function clearDrops() {
  const drops = document.querySelectorAll('.water-drop');
  drops.forEach(drop => drop.remove());
}

// =============================================
// DROP MANAGEMENT
// =============================================

function createDrop() {
  if (!gameState.gameRunning) return;

  const drop = document.createElement('div');
  drop.className = 'water-drop';

  // Randomly decide if it's clean or dirty (70% clean, 30% dirty)
  const isClean = Math.random() < 0.7;
  if (isClean) {
    drop.classList.add('clean-drop');
  } else {
    drop.classList.add('bad-drop');
  }

  // Random size for visual variety
  const baseSize = 60;
  const sizeMultiplier = Math.random() * 0.8 + 0.5;
  const size = baseSize * sizeMultiplier;
  drop.style.width = drop.style.height = `${size}px`;

  // Position randomly
  const gameWidth = gameContainer.offsetWidth;
  const xPosition = Math.random() * (gameWidth - size);
  drop.style.left = xPosition + 'px';

  // Calculate fall duration based on difficulty
  const difficulty = DIFFICULTIES[gameState.difficulty];
  const gameHeight = gameContainer.offsetHeight;
  const baseDuration = (gameHeight / 100) * 3; // Base speed
  const fallDuration = baseDuration * difficulty.dropSpeed;
  drop.style.animationDuration = fallDuration + 's';

  // Add to game area
  gameContainer.appendChild(drop);

  // Add click handler
  drop.addEventListener('click', (e) => handleDropClick(e, drop, isClean));

  // Remove drop when animation ends (missed drop)
  drop.addEventListener('animationend', () => {
    if (drop.parentElement) {
      drop.remove();
      if (gameState.gameRunning) {
        handleMissedDrop();
      }
    }
  });
}

function handleDropClick(event, drop, isClean) {
  event.stopPropagation();

  // Create score popup at click position
  createScorePopup(event.clientX, event.clientY, isClean ? '+1' : '-2', isClean);

  // Add clicked animation
  drop.classList.add('clicked');

  // Update score and show message
  let points;
  let message;
  if (isClean) {
    points = 1;
    message = `+${points} Clean Water!`;
    playSound('collect');
  } else {
    points = -2;
    message = `-${Math.abs(points)} Dirty Water!`;
    playSound('miss');
  }

  updateScore(points);
  showMessage(message, isClean ? 'positive' : 'negative');

  // Check milestones
  checkMilestones();

  // Check win condition
  if (gameState.score >= gameState.targetScore && gameState.gameRunning) {
    endGameWin();
  }

  // Remove drop after animation
  setTimeout(() => {
    if (drop.parentElement) {
      drop.remove();
    }
  }, 600);
}

function handleMissedDrop() {
  // Only penalize if it's a clean drop that was missed
  // Brown drops are already penalties when clicked
  playSound('miss');
  showMessage('Missed!', 'negative');
}

function createScorePopup(x, y, text, isPositive) {
  const popup = document.createElement('div');
  popup.className = 'score-popup';
  popup.textContent = text;

  if (isPositive) {
    popup.classList.add('score-popup-positive');
  } else {
    popup.classList.add('score-popup-negative');
  }

  // Position at click location
  popup.style.left = x + 'px';
  popup.style.top = y + 'px';

  document.body.appendChild(popup);

  // Remove after animation
  setTimeout(() => {
    if (popup.parentElement) {
      popup.remove();
    }
  }, 1000);
}

// =============================================
// UI UPDATES
// =============================================

function updateScore(points) {
  gameState.score += points;
  if (gameState.score < 0) gameState.score = 0;
  scoreDisplay.textContent = gameState.score;
}

function updateTimer() {
  timeDisplay.textContent = gameState.timeRemaining;
}

function updateTargetScore() {
  targetScoreDisplay.textContent = gameState.targetScore;
}

function showMessage(text, type) {
  messageDisplay.textContent = text;
  messageDisplay.classList.remove('show-positive', 'show-negative');

  // Trigger reflow to restart animation
  void messageDisplay.offsetWidth;

  if (type === 'positive') {
    messageDisplay.classList.add('show-positive');
  } else if (type === 'negative') {
    messageDisplay.classList.add('show-negative');
  }
}

function checkMilestones() {
  gameState.milestones.forEach(milestone => {
    if (!milestone.shown && gameState.score >= milestone.score) {
      milestone.shown = true;
      showMessage(milestone.message, 'positive');
      playSound('milestone');
    }
  });
}

// =============================================
// GAME END HANDLERS
// =============================================

function countdown() {
  gameState.timeRemaining--;
  updateTimer();

  if (gameState.timeRemaining <= 0) {
    endGameTimeout();
  }
}

function endGameWin() {
  stopGame();
  playSound('win');

  // Update win overlay
  finalScoreWin.textContent = gameState.score;
  timeLeftWin.textContent = gameState.timeRemaining;

  // Show win screen
  setGameState('win');

  // Trigger confetti
  triggerConfetti();
}

function endGameTimeout() {
  stopGame();
  playSound('lose');

  // Update game over overlay
  finalScoreGameOver.textContent = gameState.score;
  targetMessage.textContent = `Target was ${gameState.targetScore} points`;

  // Show game over screen
  setGameState('game-over');
}

// =============================================
// CONFETTI ANIMATION
// =============================================

function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const particleCount = 100;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 5 + 3,
      size: Math.random() * 4 + 2,
      color: getRandomColor(),
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeParticles = 0;

    particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.2;
      particle.rotation += particle.rotationSpeed;

      if (particle.y < canvas.height) {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.fillStyle = particle.color;
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
        ctx.restore();
        activeParticles++;
      }
    });

    if (activeParticles > 0) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  animate();
}

function getRandomColor() {
  const colors = [
    '#FFC907', '#2E9DF7', '#8BD1CB', '#4FCB53', '#FF902A',
    '#F5402C', '#159A48', '#F16061'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// =============================================
// RESPONSIVE ADJUSTMENTS
// =============================================

window.addEventListener('resize', () => {
  const canvas = document.getElementById('confetti-canvas');
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
});

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  // Set initial screen
  setGameState('start');

  // Initialize audio on first user interaction
  document.addEventListener('click', () => {
    if (!audioContext) {
      initAudio();
    }
  }, { once: true });
});