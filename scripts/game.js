// Game State
let gameMode = null;
let hoursWorked = 0;
let timeInterval = null;
let isWorking = true;
let salary = 0;
let hourlyRate = 20; // Base hourly rate
let overtimeMultiplier = 1.5;
let breakTimeRemaining = 0;

// Game Constants
const WORK_DAY_HOURS = 8;
const BREAK_DURATION = 16; // seconds
const UPDATE_INTERVAL = 1000; // milliseconds
const OVERTIME_THRESHOLD = 8; // hours

// Game Initialization
function initializeGame() {
    gameMode = null;
    hoursWorked = 0;
    salary = 0;
    isWorking = true;
    breakTimeRemaining = 0;
    updateDisplay();
}

// Mode Selection
function selectMode(mode) {
    gameMode = mode;
    
    // Adjust hourly rate based on mode
    hourlyRate = (mode === 'salaryman') ? 20 : 22;
    
    // Update UI
    document.getElementById('mode-selection').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    document.getElementById('control-buttons').style.display = 'block';
    
    // Start game loop
    startWork();
    updateDisplay();
}

// Main Game Loop
function startWork() {
    if (timeInterval) {
        clearInterval(timeInterval);
    }

    timeInterval = setInterval(() => {
        updateGameState();
    }, UPDATE_INTERVAL);
}

// Game State Update
function updateGameState() {
    if (isWorking) {
        hoursWorked++;
        updateSalary();
        
        if (hoursWorked % WORK_DAY_HOURS === 0) {
            startBreak();
        }
    } else {
        breakTimeRemaining--;
        if (breakTimeRemaining <= 0) {
            endBreak();
        }
    }
    
    updateDisplay();
}

// Break Management
function startBreak() {
    isWorking = false;
    breakTimeRemaining = BREAK_DURATION;
}

function endBreak() {
    isWorking = true;
    breakTimeRemaining = 0;
}

// Salary Calculation
function updateSalary() {
    const regularHours = Math.min(hoursWorked, OVERTIME_THRESHOLD);
    const overtimeHours = Math.max(0, hoursWorked - OVERTIME_THRESHOLD);
    
    salary = (regularHours * hourlyRate) + 
             (overtimeHours * hourlyRate * overtimeMultiplier);
}

// Display Updates
function updateDisplay() {
    const hoursDisplay = document.getElementById('hours');
    const salaryDisplay = document.getElementById('salary');
    const statusDisplay = document.getElementById('status');
    
    if (hoursDisplay) {
        hoursDisplay.textContent = hoursWorked;
    }
    
    if (salaryDisplay) {
        salaryDisplay.textContent = `$${salary.toFixed(2)}`;
    }
    
    if (statusDisplay) {
        if (!isWorking) {
            statusDisplay.textContent = `On break: ${breakTimeRemaining}s remaining`;
        } else {
            statusDisplay.textContent = 'Working';
        }
    }
}

// Game Reset
function resetGame() {
    if (timeInterval) {
        clearInterval(timeInterval);
    }
    initializeGame();
    
    // Reset UI
    document.getElementById('mode-selection').style.display = 'block';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('control-buttons').style.display = 'none';
}

// Game State Getters for Save/Load
function getGameState() {
    return {
        gameMode,
        hoursWorked,
        isWorking,
        salary,
        hourlyRate,
        breakTimeRemaining
    };
}

// Game State Setters for Save/Load
function setGameState(state) {
    gameMode = state.gameMode;
    hoursWorked = state.hoursWorked;
    isWorking = state.isWorking;
    salary = state.salary;
    hourlyRate = state.hourlyRate;
    breakTimeRemaining = state.breakTimeRemaining;
    
    updateDisplay();
}

// Initialize game when page loads
window.addEventListener('load', initializeGame);
