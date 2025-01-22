// Game state and intervals
let timeInterval;
let gameState = {
    hoursWorked: 0,
    isWorking: true,
    salary: 0,
    hourlyRate: 15,
    dailyHours: 0,
    weeklyHours: 0,
    status: 'Working'
};

// Initialize game on page load
window.addEventListener('load', () => {
    resetGame();
    startWork();
});

function startWork() {
    if (timeInterval) {
        clearInterval(timeInterval);
    }
    
    timeInterval = setInterval(updateGame, 1000);
    gameState.isWorking = true;
    updateStatus();
}

function updateGame() {
    // Check for weekend break (every 120 hours)
    if (gameState.weeklyHours >= 120) {
        gameState.isWorking = false;
        gameState.status = '"Enjoying" the weekend :(';
        if (gameState.weeklyHours >= 168) { // 120 + 48 hours
            gameState.weeklyHours = 0;
            gameState.isWorking = true;
            gameState.dailyHours = 0;
            gameState.status = 'Working :D';
        } else {
            gameState.weeklyHours++;
        }
        updateDisplay();
        return;
    }

    // Check for daily work limit
    if (gameState.dailyHours >= 8) {
        gameState.isWorking = false;
        gameState.status = 'Unproductive :(';
        if (gameState.dailyHours >= 24) {
            gameState.dailyHours = 0;
            gameState.isWorking = true;
            gameState.status = 'Working';
        }
    }

    // Update hours and salary if working
    if (gameState.isWorking) {
        gameState.hoursWorked += 1;
        gameState.salary += gameState.hourlyRate;
        gameState.dailyHours++;
        gameState.weeklyHours++;
    } else {
        gameState.dailyHours++;
        gameState.weeklyHours++;
    }

    updateDisplay();
}

function updateDisplay() {
    document.getElementById('hours').textContent = Math.floor(gameState.hoursWorked);
    document.getElementById('salary').textContent = '?';
    document.getElementById('status').textContent = gameState.status;
}

function updateStatus() {
    const statusElement = document.getElementById('status');
    statusElement.textContent = gameState.status;
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
        dailyHours: 0,
        weeklyHours: 0,
        status: 'Working :D'
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

// Handle page reload
window.addEventListener('beforeunload', function(event) {
    localStorage.setItem('gameState', JSON.stringify(gameState));
});

window.addEventListener('load', function() {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
        setGameState(JSON.parse(savedState));
        localStorage.removeItem('gameState');
    }
});
