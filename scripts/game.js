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
const SECONDS_PER_WORK_HOUR = 1; // 10 seconds = 1 work hour (adjust as needed)
const REGULAR_WORK_DAY = 8 * SECONDS_PER_WORK_HOUR; // 80 seconds = 8 work hours

// Game Initialization
function initializeGame() {
    gameMode = null;
    hoursWorked = 0;
    salary = 0;
    isWorking = true;
    breakTimeRemaining = 0;
    hourlyRate = 20;
    updateDisplay();
    showModeSelection();
}

// Mode Selection
function selectMode(mode) {
    if (mode !== 'salaryman' && mode !== 'salarywoman') {
        console.error('Invalid mode selected');
        return;
    }
    
    gameMode = mode;
    hourlyRate = SALARY_RATES[mode];
    
    // Update UI to show selected mode
    document.getElementById('mode-selection').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    document.getElementById('control-buttons').style.display = 'block';
    document.getElementById('selected-mode').textContent = 
        mode === 'salaryman' ? 'Salaryman' : 'Salarywoman';
    
    // Start game loop
    startWork();
    updateDisplay();
}

function showModeSelection() {
    document.getElementById('mode-selection').style.display = 'block';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('control-buttons').style.display = 'none';
}

// Main Game Loop
function startWork() {
    if (!gameMode) {
        console.error('Cannot start work without selecting mode');
        return;
    }

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
        hoursWorked++; // This increments every second
        updateSalary();
        
        // Check for break every work day (in seconds)
        if (hoursWorked % REGULAR_WORK_DAY === 0) {
            startBreak();
        }
        
        // Add overtime visual effects
        checkOvertimeStatus();
    } else {
        // ... rest of break logic
    }
    updateDisplay();
}

function checkOvertimeStatus() {
    const actualHours = hoursWorked / SECONDS_PER_WORK_HOUR;
    const isOvertime = actualHours > 8;
    
    if (isOvertime && !document.body.classList.contains('overtime-mode')) {
        activateOvertimeEffects();
    } else if (!isOvertime && document.body.classList.contains('overtime-mode')) {
        deactivateOvertimeEffects();
    }
}

function activateOvertimeEffects() {
    document.body.classList.add('overtime-mode');
}

function deactivateOvertimeEffects() {
    document.body.classList.remove('overtime-mode');
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
    const actualHours = hoursWorked / SECONDS_PER_WORK_HOUR;
    const regularHours = Math.min(actualHours, 8);
    const overtimeHours = Math.max(0, actualHours - 8);
    
    salary = (regularHours * hourlyRate) + 
             (overtimeHours * hourlyRate * overtimeMultiplier);
}

// Display Updates
function updateDisplay() {
    const hoursDisplay = document.getElementById('hours');
    const salaryDisplay = document.getElementById('salary');
    const statusDisplay = document.getElementById('status');
    const modeDisplay = document.getElementById('selected-mode');
    
    if (hoursDisplay) {
        const actualHours = (hoursWorked / SECONDS_PER_WORK_HOUR).toFixed(1);
        hoursDisplay.textContent = actualHours;
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

    if (modeDisplay && gameMode) {
        modeDisplay.textContent = gameMode === 'salaryman' ? 'Salaryman' : 'Salarywoman';
    }
}

// Game Reset
function resetGame() {
    if (timeInterval) {
        clearInterval(timeInterval);
    }
    initializeGame();
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
    // Validate game mode before setting state
    if (state.gameMode !== 'salaryman' && state.gameMode !== 'salarywoman') {
        throw new Error('Invalid game mode in save file');
    }

    gameMode = state.gameMode;
    hoursWorked = state.hoursWorked;
    isWorking = state.isWorking;
    salary = state.salary;
    hourlyRate = state.hourlyRate;
    breakTimeRemaining = state.breakTimeRemaining;

    // Update UI elements
    document.getElementById('mode-selection').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    document.getElementById('control-buttons').style.display = 'block';
    
    updateDisplay();
}

// Initialize game when page loads
window.addEventListener('load', initializeGame);
