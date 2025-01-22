// load.js
function loadGame() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.sav';
    fileInput.addEventListener('change', handleFileSelect);
    fileInput.click();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const saveText = e.target.result;
            const saveData = {};
            
            // Parse save file
            saveText.split('\n').forEach(line => {
                const [key, value] = line.split(': ');
                saveData[key] = value;
            });

            // Validate save data
            if (!saveData.gameMode || !saveData.hoursWorked) {
                throw new Error('Invalid save file');
            }

            // Restore game state
            clearInterval(timeInterval);
            gameMode = saveData.gameMode;
            hoursWorked = parseInt(saveData.hoursWorked);
            isWorking = saveData.isWorking === 'true';
            
            // Restore dark mode if it was saved
            if (saveData.isDarkMode !== undefined) {
                isDarkMode = saveData.isDarkMode === 'true';
                updateDarkMode();
            }

            // Update UI
            document.getElementById('mode-selection').style.display = 'none';
            document.getElementById('game-screen').style.display = 'block';
            document.getElementById('hours').textContent = hoursWorked;

            // Show control buttons
            document.getElementById('control-buttons').style.display = 'block';

            // Restart work timer
            startWork();

        } catch (error) {
            alert('Error loading save file: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function restart() {
    // Clear all game state
    clearInterval(timeInterval);
    gameMode = null;
    hoursWorked = 0;
    isWorking = true;

    // Reset UI
    document.getElementById('mode-selection').style.display = 'block';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('control-buttons').style.display = 'none';
    document.getElementById('hours').textContent = '0';
}
