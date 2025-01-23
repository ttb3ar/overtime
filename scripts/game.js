// Game state and intervals
let timeInterval;
let overtimeButton;
let gameState = {
    hoursWorked: 0,
    isWorking: true,
    salary: 0,
    hourlyRate: 15,
    dailyHours: 0,
    weeklyHours: 0,
    status: 'Working :D',
    weeksPassed: 0,
    overtimeEligible: false,
    overtimeHours: 0,
    todayOvertimeUsed: false
};

// Initialize game on page load
window.addEventListener('load', () => {
    resetGame();
    startWork();
    setupOvertimeButton();
});

function startWork() {
    if (timeInterval) {
        clearInterval(timeInterval);
    }
    
    timeInterval = setInterval(updateGame, 1000);
    gameState.isWorking = true;
    gameState.todayOvertimeUsed = false; // Reset daily overtime
    updateStatus();
}

function setupOvertimeButton() {
    overtimeButton = document.createElement('button');
    overtimeButton.id = 'overtime-button';
    overtimeButton.textContent = 'OVERTIME Today?';
    overtimeButton.style.display = 'none';
    overtimeButton.onclick = startOvertime;
    document.getElementById('game-container').appendChild(overtimeButton);
}

function startOvertime() {
    if (!gameState.overtimeEligible || gameState.todayOvertimeUsed) return;
    
    // Activate exciting screen effect
    document.body.classList.add('overtime-active');
    
    // Modify game state for overtime
    gameState.isWorking = true;
    gameState.status = 'OVERTIME ACTIVATED! ⚡';
    gameState.overtimeHours++;
    gameState.todayOvertimeUsed = true;
    
    // Additional salary bonus during overtime
    gameState.salary += gameState.hourlyRate * 1.5;
    gameState.hoursWorked += 1;
    gameState.dailyHours++;
    gameState.weeklyHours++;
    
    updateDisplay();
    
    // Deactivate overtime effect and button if 4 hours reached
    if (gameState.overtimeHours >= 4) {
        overtimeButton.style.display = 'none';
        document.body.classList.remove('overtime-active');
        gameState.overtimeEligible = false;
        gameState.status = 'Overtime Complete';
    }
}

function updateGame() {
    // Check for weekend break (every 120 hours)
    if (gameState.weeklyHours >= 120 && !gameState.todayOvertimeUsed) {
        gameState.isWorking = false;
        gameState.status = '"Enjoying" the weekend :(';
        if (gameState.weeklyHours >= 168) { // 120 + 48 hours
            gameState.weeklyHours = 0;
            gameState.isWorking = true;
            gameState.dailyHours = 0;
            gameState.status = 'Working :D';
            gameState.weeksPassed++;
            
            // Check for overtime eligibility after a week
            if (gameState.weeksPassed >= 1) {
                gameState.overtimeEligible = true;
                overtimeButton.style.display = 'block';
                gameState.overtimeHours = 0;
            }
        } else {
            gameState.weeklyHours++;
        }
        updateDisplay();
        return;
    }

    // Check for daily work limit
    if (gameState.dailyHours >= 8 && !gameState.todayOvertimeUsed) {
        gameState.isWorking = false;
        gameState.status = 'Unproductive :(';
        if (gameState.dailyHours >= 24) {
            gameState.dailyHours = 0;
            gameState.isWorking = true;
            gameState.status = 'Working :D';
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

function updateStatus() {
    const statusElement = document.getElementById('status');
    statusElement.textContent = gameState.status;
}

function updateDisplay() {
    document.getElementById('hours').textContent = Math.floor(gameState.hoursWorked);
    document.getElementById('salary').textContent = 'Doesn`t matter.';
    document.getElementById('status').textContent = gameState.status;
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
        status: 'Working :D',
        weeksPassed: 0,
        overtimeEligible: false,
        overtimeHours: 0,
        todayOvertimeUsed: false
    };
    
    // Hide overtime button on reset
    if (overtimeButton) {
        overtimeButton.style.display = 'none';
    }
    
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
