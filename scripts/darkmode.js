let isDarkMode = false;

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    updateDarkMode();
}

function updateDarkMode() {
    if (isDarkMode) {
        document.body.style.backgroundColor = '#333';
        document.body.style.color = '#fff';
        document.getElementById('dark-mode-button').textContent = 'Light Mode';
    } else {
        document.body.style.backgroundColor = '#fff';
        document.body.style.color = '#000';
        document.getElementById('dark-mode-button').textContent = 'Dark Mode';
    }
}

let gameMode = null;
let hoursWorked = 0;
let timeInterval = null;
let isWorking = true;

function selectMode(mode) {
    gameMode = mode;
    document.getElementById('mode-selection').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    document.getElementById('control-buttons').style.display = 'block';
    startWork();
}

function startWork() {
    timeInterval = setInterval(() => {
        if (isWorking) {
            hoursWorked++;
            document.getElementById('hours').textContent = hoursWorked;
            
            if (hoursWorked % 8 === 0) {
                isWorking = false;
                setTimeout(() => {
                    isWorking = true;
                }, 16000); // 16 seconds break
            }
        }
    }, 1000); // 1 second interval
}
