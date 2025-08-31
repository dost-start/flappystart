// Canvas variables
let canvas;
let canvasHeight = 640;
let canvasWidth = 360;
let context;

// Canvas setup with cross-browser consistency
function initializeCanvas() {
    canvas = document.getElementById("gameCanvas");
    context = canvas.getContext("2d");
    
    // Set actual canvas size (internal resolution)
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Set CSS size (display size) - ensures consistent scaling
    canvas.style.width = canvasWidth + "px";
    canvas.style.height = canvasHeight + "px";
    
    // Disable smoothing for pixel-perfect rendering across browsers
    context.imageSmoothingEnabled = false;
    context.webkitImageSmoothingEnabled = false;
    context.mozImageSmoothingEnabled = false;
    context.msImageSmoothingEnabled = false;
    
    // Set consistent text rendering
    context.textBaseline = "top";
    context.textAlign = "start";
}

// Bird Variables - consistent across all browsers
let birdWidth = 48;
let birdHeight = 48;
let birdX = canvasWidth / 8;
let birdY = canvasHeight / 2;
let birdImg;

let bird = {
    x: birdX,
    y: birdY,
    width: birdWidth,
    height: birdHeight,
    rotation: 0
};

// Pipe Variables - consistent sizing
let pipeArray = [];
let pipeWidth = 64;
let pipeHeight = 500;
let pipeX = canvasWidth;
let pipeY = 0;

let topPipeImg;
let bottomPipeImg;

// Physics - normalized for consistent frame rates
let velocityX = -2;
let velocityY = 0;
let gravity = 0.9   ;
let jumpStrength = -11.5;
let maxFallSpeed = 12;
let rotationSpeed = 2;

// Game state
let gameOver = false;
let gameStarted = false;
let score = 0;
let restartButton = { x: 0, y: 0, width: 100, height: 40 };

// Timing variables for consistent pipe spawning
let lastTime = 0;
let deltaTime = 0;
let lastPipeTime = 0;
let nextPipeInterval = 2000;
let minPipeInterval = 800;  
let maxPipeInterval = 1500;

// Input handling
let inputCooldown = 0;
let inputCooldownTime = 100; // ms 

window.onload = function() {
    initializeCanvas();

    // Load the Bird Image
    birdImg = new Image();
    birdImg.src = "assets/logo.png";
    birdImg.onload = function() {
        // Initial draw
        drawBird();
    }

    // Load the Pipe Images
    topPipeImg = new Image();
    topPipeImg.src = "assets/topPipe.png";

    bottomPipeImg = new Image();
    bottomPipeImg.src = "assets/bottomPipe.png";

    // Start the game loop
    requestAnimationFrame(gameLoop);
    
    // Set up event listeners with proper browser compatibility
    setupEventListeners();
}

function setupEventListeners() {
    // Keyboard events
    document.addEventListener("keydown", handleInput, false);
    
    // Mouse events
    canvas.addEventListener("mousedown", handleInput, false);
    
    // Touch events with proper handling
    canvas.addEventListener("touchstart", handleInput, { passive: false });
    canvas.addEventListener("touchend", function(e) {
        e.preventDefault();
    }, { passive: false });
    
    // Prevent context menu on right click
    canvas.addEventListener("contextmenu", function(e) {
        e.preventDefault();
    }, false);
    
    // Prevent default browser behaviors
    document.addEventListener("keydown", function(e) {
        if (e.code === "Space" || e.code === "ArrowUp" || e.code === "ArrowDown") {
            e.preventDefault();
        }
    }, false);
}

function handleInput(e) {
    e.preventDefault();
    
    // Check input cooldown to prevent double inputs
    let currentTime = performance.now();
    if (currentTime - inputCooldown < inputCooldownTime) {
        return;
    }
    
    // Handle restart button click
    if (gameOver && checkRestartClick(e)) {
        resetGame();
        inputCooldown = currentTime;
        return;
    }
    
    // Handle game input
    if (e.type === "keydown") {
        if (e.code === "Space" || e.code === "ArrowUp") {
            processBirdJump();
        }
    } else if (e.type === "mousedown" || e.type === "touchstart") {
        processBirdJump();
    }
    
    inputCooldown = currentTime;
}

function processBirdJump() {
    // Start the game on first input
    if (!gameStarted && !gameOver) {
        gameStarted = true;
    }
    
    // Make bird jump if game is active
    if (!gameOver) {
        velocityY = jumpStrength;
    }
}

function gameLoop(currentTime) {
    // Calculate delta time for consistent frame rate
    if (lastTime === 0) lastTime = currentTime;
    deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    // Cap delta time to prevent large jumps (e.g., when tab becomes inactive)
    deltaTime = Math.min(deltaTime, 50);
    
    requestAnimationFrame(gameLoop);
    
    if (gameOver) {
        drawGameOver();
        return;
    }
    
    // Clear canvas with consistent clearing
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Update game state
    updateGame(deltaTime);
    
    // Render game
    renderGame();
}

function updateGame(deltaTime) {
    // Only apply physics if game has started
    if (gameStarted) {
        // Bird physics with delta time compensation
        let frameMultiplier = deltaTime / 16.67; // Normalize to 60fps
        
        velocityY += gravity * frameMultiplier;
        velocityY = Math.min(velocityY, maxFallSpeed);
        bird.y += velocityY * frameMultiplier;
        bird.y = Math.max(bird.y, 0);
        
        // Rotation based on velocity
        if (velocityY < 0) {
            bird.rotation = Math.max(bird.rotation - rotationSpeed * frameMultiplier, -20);
        } else {
            bird.rotation = Math.min(bird.rotation + rotationSpeed * frameMultiplier, 90);
        }
        
        // Check if bird hit the ground
        if (bird.y > canvasHeight - bird.height) {
            gameOver = true;
            return;
        }
        
        // Update pipes
        updatePipes(performance.now());
    }
}

function updatePipes(currentTime) {
    // Dynamic pipe spawning with variable density
    if (currentTime - lastPipeTime > nextPipeInterval) {
        placePipes();
        lastPipeTime = currentTime;
        nextPipeInterval = minPipeInterval + Math.random() * (maxPipeInterval - minPipeInterval);
    }
    
    // Update existing pipes
    for (let i = 0; i < pipeArray.length; i++) {
        let pipe = pipeArray[i];
        pipe.x += velocityX;

        if (!pipe.passed && pipe.x + pipe.width < bird.x) {
            pipe.passed = true;
            score += 0.5;
        }

        if (detectCollision(bird, pipe)) {
            gameOver = true;
            return;
        }
    }

    // Clear pipes that are off-screen
    while (pipeArray.length > 0 && pipeArray[0].x < -pipeWidth) {
        pipeArray.shift();
    }
}

function renderGame() {
    // Draw bird
    drawBird();
    
    // Draw pipes
    drawPipes();
    
    // Draw UI
    drawUI();
}

function drawBird() {
    if (!birdImg.complete) return;
    
    context.save();
    context.translate(bird.x + bird.width/2, bird.y + bird.height/2);
    context.rotate(bird.rotation * Math.PI / 180);
    context.drawImage(birdImg, -bird.width/2, -bird.height/2, bird.width, bird.height);
    context.restore();
}

function drawPipes() {
    for (let i = 0; i < pipeArray.length; i++) {
        let pipe = pipeArray[i];
        if (pipe.img && pipe.img.complete) {
            context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);
        }
    }
}

function drawUI() {
    // Set consistent font rendering
    context.fillStyle = "white";
    context.font = "bold 24px Arial, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "top";
    
    // Add text shadow for better visibility
    context.strokeStyle = "black";
    context.lineWidth = 3;
    context.strokeText(Math.floor(score), 10, 10);
    context.fillText(Math.floor(score), 10, 10);

    // Show start screen
    if (!gameStarted && !gameOver) {
        drawStartScreen();
    }
}

function drawStartScreen() {
    // Semi-transparent overlay
    context.fillStyle = "rgba(0, 0, 0, 0.5)";
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Game title
    context.fillStyle = "white";
    context.font = "bold 36px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    
    let titleText = "Flappy Start";
    context.strokeStyle = "black";
    context.lineWidth = 3;
    context.strokeText(titleText, canvasWidth / 2, canvasHeight / 2 - 50);
    context.fillText(titleText, canvasWidth / 2, canvasHeight / 2 - 50);
    
    // Start instruction
    context.font = "bold 20px Arial, sans-serif";
    let instructionText = "Tap or Press Space to Start";
    context.strokeText(instructionText, canvasWidth / 2, canvasHeight / 2 + 30);
    context.fillText(instructionText, canvasWidth / 2, canvasHeight / 2 + 30);
}

function drawGameOver() {
    // Clear canvas
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw final state
    drawBird();
    drawPipes();
    
    // Semi-transparent overlay
    context.fillStyle = "rgba(0, 0, 0, 0.7)";
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Game over text
    context.fillStyle = "white";
    context.font = "bold 32px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    
    let gameOverText = "GAME OVER";
    context.strokeStyle = "black";
    context.lineWidth = 3;
    context.strokeText(gameOverText, canvasWidth / 2, canvasHeight / 2 - 40);
    context.fillText(gameOverText, canvasWidth / 2, canvasHeight / 2 - 40);

    // Final score
    context.font = "bold 24px Arial, sans-serif";
    let scoreText = `Score: ${Math.floor(score)}`;
    context.strokeText(scoreText, canvasWidth / 2, canvasHeight / 2 + 10);
    context.fillText(scoreText, canvasWidth / 2, canvasHeight / 2 + 10);

    // Restart button
    drawRestartButton();
}

function drawRestartButton() {
    // Position button
    restartButton.width = 120;
    restartButton.height = 40;
    restartButton.x = canvasWidth - restartButton.width - 20;
    restartButton.y = 20;

    // Button background
    context.fillStyle = "#ff4444";
    context.strokeStyle = "#cc0000";
    context.lineWidth = 2;
    
    context.fillRect(restartButton.x, restartButton.y, restartButton.width, restartButton.height);
    context.strokeRect(restartButton.x, restartButton.y, restartButton.width, restartButton.height);

    // Button text
    context.fillStyle = "white";
    context.font = "bold 16px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
        "Restart",
        restartButton.x + restartButton.width / 2,
        restartButton.y + restartButton.height / 2
    );
}

function placePipes() {
    if (gameOver || !gameStarted) {
        return;
    }
    
    // Fixed values for consistent behavior across browsers
    let openingSpace = 160;
    let minPipeY = -350;
    let maxPipeY = -150;
    let randomPipeY = minPipeY + Math.random() * (maxPipeY - minPipeY);

    let topPipe = {
        img: topPipeImg,
        x: pipeX,
        y: randomPipeY,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    };

    pipeArray.push(topPipe);

    let bottomPipe = {
        img: bottomPipeImg,
        x: pipeX,
        y: randomPipeY + pipeHeight + openingSpace,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    };

    pipeArray.push(bottomPipe);
}

function detectCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

function checkRestartClick(e) {
    if (!gameOver) return false;

    let rect = canvas.getBoundingClientRect();
    let mouseX, mouseY;
    
    if (e.type === "mousedown") {
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    } else if (e.type === "touchstart") {
        mouseX = e.touches[0].clientX - rect.left;
        mouseY = e.touches[0].clientY - rect.top;
    }

    // Scale coordinates to match canvas internal resolution
    let scaleX = canvasWidth / rect.width;
    let scaleY = canvasHeight / rect.height;
    mouseX *= scaleX;
    mouseY *= scaleY;

    return (mouseX >= restartButton.x &&
            mouseX <= restartButton.x + restartButton.width &&
            mouseY >= restartButton.y &&
            mouseY <= restartButton.y + restartButton.height);
}

function resetGame() {
    bird.x = birdX;
    bird.y = birdY;
    bird.rotation = 0;
    pipeArray = [];
    score = 0;
    gameOver = false;
    gameStarted = false;
    velocityY = 0;
    
    // Reset timing
    lastTime = 0;
    deltaTime = 0;
    lastPipeTime = 0;
    nextPipeInterval = 2000;
    inputCooldown = 0;
}