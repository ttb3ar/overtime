// Dark Mode State
let isDarkMode = false;

// Dark Mode Functions
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

// Export dark mode state for save/load functionality
function getDarkModeState() {
    return isDarkMode;
}

function setDarkModeState(state) {
    isDarkMode = state;
    updateDarkMode();
}
