// Game container and elements
let gameContainer;
let bird;
let scoreElement;
let startScreen;
let gameOverScreen;
let finalScoreElement;
let restartBtn;

// Debug mode
const DEBUG_MODE = false; // Set to false to remove debug visuals

// Game dimensions
const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;

// Bird properties
let birdX = GAME_WIDTH / 8;
let birdY = GAME_HEIGHT / 2;
let birdWidth = 48;
let birdHeight = 48;
let velocityY = 0;
let rotation = 0;

// Game physics
const gravity = 0.7;          // Increased from 0.25 for faster falling
const jumpStrength = -10;     // Increased from -7 for stronger jump to compensate
const maxFallSpeed = 15;      // Increased from 12 for terminal velocity
const rotationSpeed = 3;      // Slightly increased for more responsive rotation
const pipeSpeed = 2;

// Game state
let gameStarted = false;
let gameOver = false;
let score = 0;

// Pipes
let pipes = [];
let lastPipeTime = 0;
let pipeInterval = 2000;
let minPipeInterval = 800;
let maxPipeInterval = 1500;

// Timing
let lastTime = 0;
let animationId;

// Input handling
let inputCooldown = 0;
const inputCooldownTime = 100;

// Initialize the game
window.onload = function() {
    initializeGame();
    setupEventListeners();
    startGameLoop();
}

function initializeGame() {
    // Get DOM elements
    gameContainer = document.getElementById('gameContainer');
    bird = document.getElementById('bird');
    scoreElement = document.getElementById('score');
    startScreen = document.getElementById('startScreen');
    gameOverScreen = document.getElementById('gameOverScreen');
    finalScoreElement = document.getElementById('finalScore');
    restartBtn = document.getElementById('restartBtn');
    
    // Set initial bird position
    updateBirdPosition();
}

function setupEventListeners() {
    // Keyboard events
    document.addEventListener('keydown', handleInput, false);
    
    // Mouse and touch events on game container
    gameContainer.addEventListener('mousedown', handleInput, false);
    gameContainer.addEventListener('touchstart', handleInput, { passive: false });
    
    // Restart button - multiple event types for better compatibility
    restartBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (DEBUG_MODE) {
            console.log('Restart button clicked');
        }
        resetGame();
    });
    
    restartBtn.addEventListener('touchstart', function(e) {
        e.stopPropagation();
        e.preventDefault();
        if (DEBUG_MODE) {
            console.log('Restart button touched');
        }
        resetGame();
    }, { passive: false });
    
    // Prevent default behaviors
    document.addEventListener('keydown', function(e) {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
            e.preventDefault();
        }
    }, false);
    
    gameContainer.addEventListener('touchend', function(e) {
        e.preventDefault();
    }, { passive: false });
    
    gameContainer.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    }, false);
}

function handleInput(e) {
    e.preventDefault();
    
    // Check input cooldown
    let currentTime = performance.now();
    if (currentTime - inputCooldown < inputCooldownTime) {
        return;
    }
    
    // Handle game input
    if (e.type === 'keydown') {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            processBirdJump();
        }
    } else if (e.type === 'mousedown' || e.type === 'touchstart') {
        processBirdJump();
    }
    
    inputCooldown = currentTime;
}

function processBirdJump() {
    // Start the game on first input
    if (!gameStarted && !gameOver) {
        gameStarted = true;
        startScreen.style.display = 'none';
    }
    
    // Make bird jump if game is active
    if (!gameOver) {
        velocityY = jumpStrength;
        
        // Add jump animation class
        bird.classList.remove('bird-jump');
        setTimeout(() => bird.classList.add('bird-jump'), 10);
        setTimeout(() => bird.classList.remove('bird-jump'), 300);
    }
}

function startGameLoop() {
    function gameLoop(currentTime) {
        // Calculate delta time
        if (lastTime === 0) lastTime = currentTime;
        let deltaTime = currentTime - lastTime;
        lastTime = currentTime;
        
        // Cap delta time
        deltaTime = Math.min(deltaTime, 50);
        
        // Update game
        if (!gameOver) {
            updateGame(deltaTime, currentTime);
        }
        
        // Continue loop
        animationId = requestAnimationFrame(gameLoop);
    }
    
    gameLoop(0);
}

function updateGame(deltaTime, currentTime) {
    if (gameStarted) {
        updateBird(deltaTime);
        updatePipes(currentTime);
        checkCollisions();
    }
}

function updateBird(deltaTime) {
    // Apply physics
    let frameMultiplier = deltaTime / 16.67; // Normalize to 60fps
    
    velocityY += gravity * frameMultiplier;
    velocityY = Math.min(velocityY, maxFallSpeed);
    birdY += velocityY * frameMultiplier;
    
    // Keep bird in bounds
    birdY = Math.max(birdY, 0);
    
    // Update rotation
    if (velocityY < 0) {
        rotation = Math.max(rotation - rotationSpeed * frameMultiplier, -20);
    } else {
        rotation = Math.min(rotation + rotationSpeed * frameMultiplier, 90);
    }
    
    // Check ground collision
    if (birdY > GAME_HEIGHT - birdHeight) {
        endGame();
        return;
    }
    
    // Update bird visual position
    updateBirdPosition();
}

function updateBirdPosition() {
    bird.style.left = birdX + 'px';
    bird.style.top = birdY + 'px';
    bird.style.transform = `rotate(${rotation}deg)`;
    
    // Debug: Add bird collision boundary
    if (DEBUG_MODE) {
        bird.style.border = '1px solid rgba(0,255,0,0.8)';
        bird.style.boxSizing = 'border-box';
    }
}

function updatePipes(currentTime) {
    // Spawn new pipes
    if (currentTime - lastPipeTime > pipeInterval) {
        createPipe();
        lastPipeTime = currentTime;
        pipeInterval = minPipeInterval + Math.random() * (maxPipeInterval - minPipeInterval);
    }
    
    // Update existing pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
        let pipe = pipes[i];
        pipe.x -= pipeSpeed;
        
        // Update pipe position
        pipe.topElement.style.left = pipe.x + 'px';
        pipe.bottomElement.style.left = pipe.x + 'px';
        
        // Check for scoring
        if (!pipe.passed && pipe.x + 64 < birdX) {
            pipe.passed = true;
            score++;
            updateScore();
        }
        
        // Remove pipes that are off-screen
        if (pipe.x < -64) {
            pipe.topElement.remove();
            pipe.bottomElement.remove();
            pipes.splice(i, 1);
        }
    }
}

function createPipe() {
    const pipeWidth = 64;
    const pipeHeight = 400; // Reduced height for better balance
    const gap = 160;
    const minY = -300; // Adjusted to work with new height
    const maxY = -100;  // Adjusted to work with new height
    const pipeY = minY + Math.random() * (maxY - minY);
    
    // Create top pipe
    const topPipe = document.createElement('div');
    topPipe.className = 'pipe pipe-top';
    topPipe.style.left = GAME_WIDTH + 'px';
    topPipe.style.top = pipeY + 'px';
    topPipe.style.width = pipeWidth + 'px';
    topPipe.style.height = pipeHeight + 'px';
    if (DEBUG_MODE) {
        topPipe.style.border = '2px solid rgba(255,0,0,0.8)';
        topPipe.style.boxSizing = 'border-box';
    }
    gameContainer.appendChild(topPipe);
    
    // Create bottom pipe
    const bottomPipe = document.createElement('div');
    bottomPipe.className = 'pipe pipe-bottom';
    bottomPipe.style.left = GAME_WIDTH + 'px';
    bottomPipe.style.top = (pipeY + pipeHeight + gap) + 'px';
    bottomPipe.style.width = pipeWidth + 'px';
    bottomPipe.style.height = pipeHeight + 'px';
    if (DEBUG_MODE) {
        bottomPipe.style.border = '2px solid rgba(255,0,0,0.8)';
        bottomPipe.style.boxSizing = 'border-box';
    }
    gameContainer.appendChild(bottomPipe);
    
    // Store pipe data - ensuring collision bounds match visual bounds exactly
    pipes.push({
        x: GAME_WIDTH,
        topY: pipeY,
        bottomY: pipeY + pipeHeight + gap,
        width: pipeWidth,
        height: pipeHeight,
        gap: gap,
        passed: false,
        topElement: topPipe,
        bottomElement: bottomPipe
    });
    
    // Debug: Log pipe creation for verification
    if (DEBUG_MODE) {
        console.log(`Pipe created: topY=${pipeY}, bottomY=${pipeY + pipeHeight + gap}, gap=${gap}, height=${pipeHeight}`);
    }
}

function checkCollisions() {
    const birdLeft = birdX;
    const birdRight = birdX + birdWidth;
    const birdTop = birdY;
    const birdBottom = birdY + birdHeight;
    
    for (let pipe of pipes) {
        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + pipe.width;
        
        // Check if bird is in horizontal range of pipe
        if (birdRight > pipeLeft && birdLeft < pipeRight) {
            
            // Top pipe collision - bird hits the bottom of the top pipe
            const topPipeBottom = pipe.topY + pipe.height;
            if (birdTop < topPipeBottom) {
                if (DEBUG_MODE) {
                    console.log(`Top pipe collision: birdTop=${birdTop}, topPipeBottom=${topPipeBottom}`);
                }
                endGame();
                return;
            }
            
            // Bottom pipe collision - bird hits the top of the bottom pipe
            const bottomPipeTop = pipe.bottomY;
            if (birdBottom > bottomPipeTop) {
                if (DEBUG_MODE) {
                    console.log(`Bottom pipe collision: birdBottom=${birdBottom}, bottomPipeTop=${bottomPipeTop}`);
                }
                endGame();
                return;
            }
            
            // Debug: Log when bird is safely passing through gap
            if (DEBUG_MODE) {
                console.log(`Bird passing safely: birdTop=${birdTop}, birdBottom=${birdBottom}, gap=${topPipeBottom}-${bottomPipeTop}`);
            }
        }
    }
}

function updateScore() {
    scoreElement.textContent = score;
}

function endGame() {
    gameOver = true;
    finalScoreElement.textContent = `Score: ${score}`;
    gameOverScreen.style.display = 'flex';
}

function resetGame() {
    // Reset game state
    gameOver = false;
    gameStarted = false;
    score = 0;
    velocityY = 0;
    rotation = 0;
    birdY = GAME_HEIGHT / 2;
    lastTime = 0;
    lastPipeTime = 0;
    pipeInterval = 2000;
    inputCooldown = 0;
    
    // Clear pipes
    pipes.forEach(pipe => {
        pipe.topElement.remove();
        pipe.bottomElement.remove();
    });
    pipes = [];
    
    // Reset UI
    updateScore();
    updateBirdPosition();
    startScreen.style.display = 'flex';
    gameOverScreen.style.display = 'none';
    
    // Remove any animation classes
    bird.classList.remove('bird-jump');
}
