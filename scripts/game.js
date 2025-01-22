// Game state and intervals
let timeInterval;
let gameState = {
    hoursWorked: 0,
    isWorking: true,
    salary: 0,
    hourlyRate: 15,
    breakTimeRemaining: 0
};

// Core game functions
function startWork() {
    if (timeInterval) {
        clearInterval(timeInterval);
    }
    
    timeInterval = setInterval(updateGame, 100);
    gameState.isWorking = true;
    updateStatus();
}

function updateGame() {
    if (gameState.isWorking) {
        gameState.hoursWorked += 1/3600; // Increment by 1 second worth of hours
        gameState.salary += gameState.hourlyRate / 3600;
        updateDisplay();
    } else if (gameState.breakTimeRemaining > 0) {
        gameState.breakTimeRemaining--;
        updateDisplay();
    }
}

function updateDisplay() {
    document.getElementById('hours').textContent = gameState.hoursWorked.toFixed(2);
    document.getElementById('salary').textContent = gameState.salary.toFixed(2);
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
}
