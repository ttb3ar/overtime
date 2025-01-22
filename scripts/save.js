function saveGame() {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(2);

    // Get current game state including mode
    const gameState = getGameState();
    
    const saveData = {
        gameMode: gameState.gameMode, // Explicitly save the mode
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
