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
            const saveData = parseSaveFile(e.target.result);
            loadGameState(saveData);
        } catch (error) {
            alert('Error loading save file: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function parseSaveFile(saveText) {
    const saveData = {};
    
    saveText.split('\n').forEach(line => {
        const [key, value] = line.split(': ');
        saveData[key] = value === 'true' ? true : 
                       value === 'false' ? false :
                       isNaN(value) ? value : Number(value);
    });
    
    return saveData;
}

function loadGameState(saveData) {
    // Stop current game loop
    if (timeInterval) {
        clearInterval(timeInterval);
    }

    // Restore game state
    setGameState({
        hoursWorked: saveData.hoursWorked,
        isWorking: saveData.isWorking,
        salary: saveData.salary,
        hourlyRate: saveData.hourlyRate,
        breakTimeRemaining: saveData.breakTimeRemaining
    });
    
    // Restore dark mode if it was saved
    if (saveData.isDarkMode !== undefined) {
        setDarkModeState(saveData.isDarkMode);
    }

    // Restart game loop
    startWork();
}
