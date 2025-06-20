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
    overtimeQueued: false,
    overtimeHours: 0,
    todayOvertimeUsed: false
};

// Initialize game on page load
window.addEventListener('load', () => {
    console.log("playing version 1.02");
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
    if (!gameState.overtimeEligible || gameState.todayOvertimeUsed || gameState.overtimeQueued) {
        return;
    }
    
    // Queue overtime for later
    gameState.overtimeQueued = true;
    gameState.status = 'Overtime Queued for Today! 📋';
    
    // Update button text and disable it
    overtimeButton.textContent = 'Overtime Queued ✓';
    overtimeButton.style.backgroundColor = '#28a745'; // Green color
    overtimeButton.disabled = true;
    overtimeButton.style.cursor = 'not-allowed';
    
    // Brief visual feedback
    document.body.style.backgroundColor = '#e6ffe6';
    setTimeout(() => {
        if (!document.body.classList.contains('overtime-active')) {
            document.body.style.backgroundColor = '';
        }
    }, 500);
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
                gameState.overtimeHours = 0;
                
                // Show overtime button during work hours if eligible and not already queued/used
                if (!gameState.todayOvertimeUsed && !gameState.overtimeQueued && gameState.dailyHours < 8) {
                    overtimeButton.style.display = 'block';
                    overtimeButton.textContent = 'OVERTIME Today?';
                    overtimeButton.disabled = false;
                    overtimeButton.style.cursor = 'pointer';
                    overtimeButton.style.backgroundColor = '#ff4500';
                }
            }
        } else {
            gameState.weeklyHours++;
        }
        updateDisplay();
        return;
    }

    // Check for daily work limit
    if (gameState.dailyHours >= 8) {
        if (gameState.overtimeQueued && !gameState.todayOvertimeUsed) {
            // Activate queued overtime
            activateQueuedOvertime();
        } else if (!gameState.todayOvertimeUsed && !gameState.overtimeQueued) {
            // Regular end of day - no overtime queued
            gameState.isWorking = false;
            gameState.status = 'Day Complete!';
            
            // Show overtime button if eligible and not already queued
            if (gameState.overtimeEligible) {
                overtimeButton.style.display = 'block';
                overtimeButton.textContent = 'OVERTIME Today?';
                overtimeButton.disabled = false;
                overtimeButton.style.cursor = 'pointer';
                overtimeButton.style.backgroundColor = '#ff4500';
            }
        } else if (gameState.todayOvertimeUsed && gameState.dailyHours >= 12) {
            // End overtime period (8 regular + 4 overtime max)
            gameState.isWorking = false;
            gameState.status = 'Overtime Complete - Rest Time';
            overtimeButton.style.display = 'none';
        }
        
        // Reset for new day
        if (gameState.dailyHours >= 24) {
            resetDailyState();
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
        overtimeQueued: false,
        todayOvertimeUsed: false
    };
    
    // Hide overtime button on reset
    if (overtimeButton) {
        overtimeButton.style.display = 'none';
    }
    
    updateDisplay();
    startWork();
}

function activateQueuedOvertime() {
    // Activate exciting screen effect
    document.body.classList.add('overtime-active');
    
    // Update game state
    gameState.status = 'OVERTIME ACTIVATED! ⚡';
    gameState.todayOvertimeUsed = true;
    gameState.overtimeQueued = false;
    gameState.isWorking = true;
    
    // Hide and reset overtime button
    overtimeButton.style.display = 'none';
    
    // Set a timer to remove the screen effect after 3 seconds
    setTimeout(() => {
        document.body.classList.remove('overtime-active');
        gameState.status = 'Working Overtime (1.5x pay!)';
    }, 3000);
}

function resetDailyState() {
    gameState.dailyHours = 0;
    gameState.isWorking = true;
    gameState.status = 'Working :D';
    gameState.todayOvertimeUsed = false;
    gameState.overtimeQueued = false;
    overtimeButton.style.display = 'none';
    document.body.classList.remove('overtime-active');
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
