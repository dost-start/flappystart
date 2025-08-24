// Canvas variables
let canvas;
let canvasHeight = 640;
let canvasWidth = 360;
let context;

if (window.innerWidth < 800) {
    canvasHeight = window.innerHeight;
    canvasWidth = window.innerWidth;
}

// Bird Variables
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
};

// Pipe Variables
let pipeArray = [];
let pipeWidth = 64;
let pipeHeight = 500;
let pipeX = canvasWidth;
let pipeY = 0;

let topPipeImg;
let bottomPipeImg;

// Physics
let velocityX = -2;
let velocityY = 0;
let gravity = 0.4;

let gameOver = false;
let score = 0;
let restartButton = { x: 0, y: 0, width: 100, height: 40 };

window.onload = function() {
  canvas = document.getElementById("gameCanvas");
  context = canvas.getContext("2d");
  canvas.height = canvasHeight;
  canvas.width = canvasWidth;

  // Load the Bird Image
  birdImg = new Image();
  birdImg.src = "assets/logo.png";
  birdImg.onload = function() {
    context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
  }

  // Load the Pipe Images
  topPipeImg = new Image();
  topPipeImg.src = "assets/topPipe.png";

  bottomPipeImg = new Image();
  bottomPipeImg.src = "assets/bottomPipe.png";

  requestAnimationFrame(update);
  setInterval(placePipes, 1500);
  document.addEventListener("keydown", moveBird);

  // Touch (tap on canvas for mobile)
  canvas.addEventListener("touchstart", moveBird, { passive: false });
}

function update() {
    requestAnimationFrame(update);
    if (gameOver) {
        return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw the bird
    velocityY += gravity;
    bird.y += velocityY;
    bird.y = Math.max(bird.y + velocityY, 0); // Prevent bird from going above canvas

    context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);

    if (bird.y > canvas.height) {
        gameOver = true;
    };
    // Pipes
    for (let i = 0; i < pipeArray.length; i++) {
        let pipe = pipeArray[i];
        pipe.x += velocityX;
        context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);

        if (!pipe.passed && pipe.x + pipe.width < bird.x) {
            pipe.passed = true;
            score+=0.5;
        }

        if (detectCollision(bird, pipe)) {
            gameOver = true;
        }
    }

    // Clear Pipes
    while (pipeArray.length > 0 && pipeArray[0].x < -pipeWidth) {
        pipeArray.shift();
    }

    context.fillStyle = "white";
    context.font = "20px Arial";
    context.fillText(score, 10, 30);

    if (gameOver) {
    const text = "GAME OVER";
    context.font = "30px Arial";
    context.textAlign = "left";    // reset to default
    context.textBaseline = "alphabetic";
    const textWidth = context.measureText(text).width;
    context.fillText(text, (canvas.width - textWidth) / 2, canvas.height / 2);

    // Draw score below "GAME OVER"
    const scoreText = `Score: ${score}`;
    context.font = "24px Arial";
    const scoreTextWidth = context.measureText(scoreText).width;
    context.fillText(scoreText, (canvas.width - scoreTextWidth) / 2, canvas.height / 2 + 40);

    // 🔹 Restart button (upper right)
    context.save(); // save state
    restartButton.width = 100;
    restartButton.height = 40;
    restartButton.x = canvas.width - restartButton.width - 20;
    restartButton.y = 20;

    // Button background
    context.fillStyle = "#ff4444";
    context.beginPath();
    context.roundRect(
        restartButton.x,
        restartButton.y,
        restartButton.width,
        restartButton.height,
        12 // corner radius
    );
    context.fill();

    // Button text
    context.fillStyle = "#ffffff";
    context.font = "16px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
        "Restart",
        restartButton.x + restartButton.width / 2,
        restartButton.y + restartButton.height / 2
    );
    context.restore(); // restore state

}
    document.addEventListener("mousedown", checkRestartClick);
    canvas.addEventListener("touchstart", checkRestartClick, { passive: false } );
}

function placePipes() {
        if (gameOver) {
        return;
    }
    let openingSpace = canvas.height / 4;
    let randomPipeY = -pipeHeight/4 - Math.random() * (pipeHeight/2);

    let topPipe = {
        img : topPipeImg,
        x : pipeX,
        y : randomPipeY,
        width : pipeWidth,
        height : pipeHeight,
        passed : false
    };

    pipeArray.push(topPipe);

    let bottomPipe = {
        img : bottomPipeImg,
        x : pipeX,
        y : randomPipeY + pipeHeight + openingSpace, // directly below top pipe + gap
        width : pipeWidth,
        height : pipeHeight,
        passed : false
    };

    pipeArray.push(bottomPipe);
}

function moveBird(e) {
    // Prevent zooming on spacebar, arrow keys, or touch
    if (e.type === "keydown") {
        if (e.code === "Space" || e.code === "ArrowUp") {
            e.preventDefault();
            velocityY = -6;
        }
    } else if (e.type === "mousedown" || e.type === "touchstart") {
        if (e.cancelable) e.preventDefault();
        velocityY = -6;
    }
}

function detectCollision(a, b) {
    return a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y;
}

function checkRestartClick(e) {
    if (!gameOver) return;

    let mouseX, mouseY;
    if (e.type === "mousedown") {
        mouseX = e.clientX - canvas.getBoundingClientRect().left;
        mouseY = e.clientY - canvas.getBoundingClientRect().top;
    } else if (e.type === "touchstart") {
        mouseX = e.touches[0].clientX - canvas.getBoundingClientRect().left;
        mouseY = e.touches[0].clientY - canvas.getBoundingClientRect().top;
    }

    if (
        mouseX >= restartButton.x &&
        mouseX <= restartButton.x + restartButton.width &&
        mouseY >= restartButton.y &&
        mouseY <= restartButton.y + restartButton.height
    ) {
        resetGame();
    }
}

function resetGame() {
    bird.y = birdY;
    pipeArray = [];
    score = 0;
    gameOver = false;
    velocityY = 0;
}