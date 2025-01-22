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
                saveData[key] = value === 'true' ? true : 
                               value === 'false' ? false :
                               isNaN(value) ? value : Number(value);
            });

            // Validate save data
            if (!saveData.gameMode) {
                throw new Error('Invalid save file');
            }

            // Stop current game loop
            if (timeInterval) {
                clearInterval(timeInterval);
            }

            // Restore game state
            setGameState(saveData);
            
            // Restore dark mode if it was saved
            if (saveData.isDarkMode !== undefined) {
                setDarkModeState(saveData.isDarkMode);
            }

            // Update UI
            document.getElementById('mode-selection').style.display = 'none';
            document.getElementById('game-screen').style.display = 'block';
            document.getElementById('control-buttons').style.display = 'block';

            // Restart game loop
            startWork();

        } catch (error) {
            alert('Error loading save file: ' + error.message);
        }
    };
    reader.readAsText(file);
}
