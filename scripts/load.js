// Load game functionality
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

            // Stop current game loop and restore state
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

        } catch (error) {
            alert('Error loading save file: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// Save game functionality
function saveGame() {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(2);

    const gameState = getGameState();
    
    const saveData = {
        hoursWorked: gameState.hoursWorked,
        isWorking: gameState.isWorking,
        salary: gameState.salary,
        hourlyRate: gameState.hourlyRate,
        breakTimeRemaining: gameState.breakTimeRemaining,
        isDarkMode: getDarkModeState(),
        timestamp: Date.now()
    };

    const saveText = Object.entries(saveData)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

    const filename = `salary_game_${year}${month}${day}_${hour}-${min}.sav`;
    const blob = new Blob([saveText], { type: "text/plain;charset=utf-8" });
    saveAs(blob, filename);
}

function saveAs(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}
