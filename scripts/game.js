// Game state and intervals
let timeInterval;
let gameState = {
    hoursWorked: 0,
    isWorking: true,
    salary: 0,
    hourlyRate: 15,
    breakTimeRemaining: 0
};

// Initialize game on page load
window.addEventListener('load', () => {
    resetGame();
    startWork();
});

// Core game functions
function startWork() {
    if (timeInterval) {
        clearInterval(timeInterval);
    }
    
    timeInterval = setInterval(updateGame, 1000);
    gameState.isWorking = true;
    updateStatus();
}

function updateGame() {
    if (gameState.isWorking) {
        gameState.hoursWorked += 1; // Increment by 1 hour every second
        gameState.salary += gameState.hourlyRate;
        updateDisplay();
    } else if (gameState.breakTimeRemaining > 0) {
        gameState.breakTimeRemaining--;
        updateDisplay();
    }
}

function updateDisplay() {
    document.getElementById('hours').textContent = Math.floor(gameState.hoursWorked);
    document.getElementById('salary').textContent = '?';
    document.getElementById('status').textContent = gameState.isWorking ? 'Working' : 'On Break';
}

function updateStatus() {
    const statusElement = document.getElementById('status');
    statusElement.textContent = gameState.isWorking ? 'Working' : 'On Break';
}

function resetGame() {
    if (timeInterval) {
        clearInterval(timeInterval);
    }
    
    gameState = {
        hoursWorked: 0,
        isWorking: true,
        salary: 0,
        hourlyRate: 15,
        breakTimeRemaining: 0
    };
    
    updateDisplay();
    startWork();
}

// State management functions used by save/load
function getGameState() {
    return { ...gameState };
}

function setGameState(newState) {
    gameState = { ...newState };
    updateDisplay();
    startWork();
}

// Override the browser's reload handling
window.addEventListener('beforeunload', function(event) {
    // This will ensure the game state is preserved during reload
    localStorage.setItem('gameState', JSON.stringify(gameState));
});

// Check for saved state on load
window.addEventListener('load', function() {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
        setGameState(JSON.parse(savedState));
        localStorage.removeItem('gameState'); // Clean up after loading
    }
});
