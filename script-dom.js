// Game container and elements
let gameContainer;
let bird;
let scoreElement;
let startScreen;
let gameOverScreen;
let finalScoreElement;
let restartBtn;

// Leaderboard elements
let nameInput;
let submitScoreBtn;
let leaderboardBtn;
let leaderboardModal;
let leaderboardList;
let closeLeaderboardBtn;

// Supabase configuration
let supabase = null;

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
    // Initialize Supabase if credentials are provided
    const config = window.SUPABASE_CONFIG || {};
    if (config.url && config.anonKey && 
        config.url !== 'YOUR_SUPABASE_URL_HERE' && 
        config.anonKey !== 'YOUR_SUPABASE_ANON_KEY_HERE') {
        supabase = window.supabase.createClient(config.url, config.anonKey);
        console.log('Supabase initialized successfully');
    } else {
        console.warn('Supabase not configured. Please update config.js with your credentials.');
    }
    
    // Get DOM elements
    gameContainer = document.getElementById('gameContainer');
    bird = document.getElementById('bird');
    scoreElement = document.getElementById('score');
    startScreen = document.getElementById('startScreen');
    gameOverScreen = document.getElementById('gameOverScreen');
    finalScoreElement = document.getElementById('finalScore');
    restartBtn = document.getElementById('restartBtn');
    
    // Get leaderboard elements
    nameInput = document.getElementById('nameInput');
    submitScoreBtn = document.getElementById('submitScoreBtn');
    leaderboardBtn = document.getElementById('leaderboardBtn');
    leaderboardModal = document.getElementById('leaderboardModal');
    leaderboardList = document.getElementById('leaderboardList');
    closeLeaderboardBtn = document.getElementById('closeLeaderboard');
    
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
    
    // Leaderboard event listeners
    if (submitScoreBtn) {
        submitScoreBtn.addEventListener('click', submitScore);
        submitScoreBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            e.stopPropagation();
            submitScore();
        }, { passive: false });
    }
    
    if (leaderboardBtn) {
        leaderboardBtn.addEventListener('click', showLeaderboard);
        leaderboardBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showLeaderboard();
        }, { passive: false });
    }
    
    if (closeLeaderboardBtn) {
        closeLeaderboardBtn.addEventListener('click', hideLeaderboard);
        closeLeaderboardBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            e.stopPropagation();
            hideLeaderboard();
        }, { passive: false });
    }
    
    if (leaderboardModal) {
        leaderboardModal.addEventListener('click', function(e) {
            if (e.target === leaderboardModal) {
                hideLeaderboard();
            }
        });
    }
    
    // Enter key to submit score
    if (nameInput) {
        nameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                submitScore();
            }
        });
    }
    
    // Prevent default behaviors (but not when typing in input fields)
    document.addEventListener('keydown', function(e) {
        // Don't prevent default if user is typing in an input field
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
            return;
        }
        
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
    // Don't prevent input if user is typing in the name field
    if (e.target && e.target.id === 'nameInput') {
        return;
    }
    
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
       // pipeInterval = maxPipeInterval + Math.random() * (maxPipeInterval - minPipeInterval);
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
    
    // Reset leaderboard UI
    if (nameInput) nameInput.value = '';
    if (submitScoreBtn) submitScoreBtn.disabled = false;
    
    // Remove any animation classes
    bird.classList.remove('bird-jump');
}

// Leaderboard Functions
async function submitScore() {
    if (!supabase) {
        alert('Leaderboard not configured. Please add your Supabase credentials.');
        return;
    }
    
    const playerName = nameInput.value.trim();
    if (!playerName) {
        alert('Please enter your name!');
        nameInput.focus();
        return;
    }
    
    if (playerName.length > 20) {
        alert('Name must be 20 characters or less!');
        return;
    }
    
    // Disable button to prevent double submission
    submitScoreBtn.disabled = true;
    submitScoreBtn.textContent = 'Submitting...';
    
    try {
        const { data, error } = await supabase
            .from('leaderboard')
            .insert([
                { player_name: playerName, score: score }
            ]);
        
        if (error) {
            console.error('Error submitting score:', error);
            alert('Failed to submit score. Please try again.');
            submitScoreBtn.disabled = false;
            submitScoreBtn.textContent = 'Submit Score';
        } else {
            submitScoreBtn.textContent = 'Score Submitted!';
            setTimeout(() => {
                showLeaderboard();
            }, 1000);
        }
    } catch (err) {
        console.error('Network error:', err);
        alert('Network error. Please check your connection and try again.');
        submitScoreBtn.disabled = false;
        submitScoreBtn.textContent = 'Submit Score';
    }
}

async function showLeaderboard() {
    if (!supabase) {
        alert('Leaderboard not configured. Please add your Supabase credentials.');
        return;
    }
    
    leaderboardModal.style.display = 'block';
    leaderboardList.innerHTML = '<li>Loading...</li>';
    
    try {
        const { data, error } = await supabase
            .from('leaderboard')
            .select('player_name, score, created_at')
            .order('score', { ascending: false })
            .limit(50); // Increased from 10 to 50 since we now have scrolling
        
        if (error) {
            console.error('Error fetching leaderboard:', error);
            leaderboardList.innerHTML = '<li>Failed to load leaderboard</li>';
            return;
        }
        
        if (!data || data.length === 0) {
            leaderboardList.innerHTML = '<li>No scores yet. Be the first!</li>';
            return;
        }
        
        // Display the leaderboard
        leaderboardList.innerHTML = '';
        data.forEach((entry, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="rank">#${index + 1}</span>
                <span class="player-name">${escapeHtml(entry.player_name)}</span>
                <span class="score">${entry.score}</span>
            `;
            leaderboardList.appendChild(li);
        });
        
    } catch (err) {
        console.error('Network error:', err);
        leaderboardList.innerHTML = '<li>Network error. Please try again.</li>';
    }
}

function hideLeaderboard() {
    leaderboardModal.style.display = 'none';
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
