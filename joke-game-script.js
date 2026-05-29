// Henry's Joke Quest - Interactive Game Logic
// Fetch jokes from API and create a guessing game

// Game State
const gameState = {
    score: 0,
    level: 1,
    combo: 0,
    maxCombo: 0,
    currentQuestion: 0,
    totalQuestions: 20,
    correctAnswers: 0,
    jokesFetched: 0,
    category: 'any',
    currentJoke: null,
    selectedAnswer: null,
    gameActive: true,
    unlockedStyles: ['Programming'],
    allJokes: [],
    answerSubmitted: false
};

const categories = ['Programming', 'General', 'Knock-Knock'];

// Initialize game on load
window.addEventListener('DOMContentLoaded', async function() {
    showScreen('loadingScreen');
    await preloadJokes();
    showScreen('menuScreen');
    loadGameData();
    updateStatsDisplay();
});

/**
 * Preload jokes from JokeAPI
 */
async function preloadJokes() {
    try {
        for (let category of categories) {
            const apiUrl = `https://v2.jokeapi.dev/joke/${category}?amount=10`;
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            if (data.jokes) {
                gameState.allJokes = gameState.allJokes.concat(data.jokes);
            }
        }
        console.log(`Loaded ${gameState.allJokes.length} jokes`);
    } catch (error) {
        console.error('Error preloading jokes:', error);
        // Fallback to fetch jokes during gameplay
    }
}

/**
 * Fetch jokes for current game session
 */
async function fetchGameJokes() {
    const jokes = [];
    
    try {
        // Use preloaded jokes if available
        if (gameState.allJokes.length >= gameState.totalQuestions) {
            return gameState.allJokes.slice(0, gameState.totalQuestions).map(j => ({
                ...j,
                wrongAnswers: generateWrongAnswers(j)
            }));
        }

        // Otherwise fetch during gameplay
        for (let i = 0; i < gameState.totalQuestions; i++) {
            const response = await fetch(`https://v2.jokeapi.dev/joke/Any?type=twopart`);
            const data = await response.json();
            
            if (!data.error) {
                jokes.push({
                    ...data,
                    wrongAnswers: generateWrongAnswers(data)
                });
            }
        }
        return jokes;
    } catch (error) {
        console.error('Error fetching jokes:', error);
        return [];
    }
}

/**
 * Generate wrong answers for a joke
 */
function generateWrongAnswers(joke) {
    const wrongAnswers = [
        "Because the chicken crossed the road!",
        "I have no idea, you tell me!",
        "That's what she said!",
        "Because it was purple!",
        "To get to the other side!",
        "Knock knock, who's there?",
        "Because of the spoon!",
        "The answer is banana!",
        "I thought you would know!",
        "That's just how it goes!"
    ];
    
    return wrongAnswers.sort(() => Math.random() - 0.5).slice(0, 2);
}

/**
 * Start the game
 */
async function startGame() {
    gameState.score = 0;
    gameState.combo = 0;
    gameState.currentQuestion = 0;
    gameState.correctAnswers = 0;
    gameState.gameActive = true;
    gameState.answerSubmitted = false;
    
    showScreen('gameScreen');
    
    // Fetch jokes for this session
    const jokes = await fetchGameJokes();
    gameState.sessionJokes = jokes;
    
    if (jokes.length === 0) {
        alert('Failed to load jokes. Please try again.');
        backToMenu();
        return;
    }
    
    loadNextQuestion();
}

/**
 * Load next question
 */
function loadNextQuestion() {
    if (gameState.currentQuestion >= gameState.sessionJokes.length) {
        endGame();
        return;
    }
    
    gameState.answerSubmitted = false;
    gameState.selectedAnswer = null;
    const joke = gameState.sessionJokes[gameState.currentQuestion];
    gameState.currentJoke = joke;
    
    renderQuestion(joke);
}

/**
 * Render current question
 */
function renderQuestion(joke) {
    // Setup
    document.getElementById('jokeSetup').textContent = joke.setup || joke.joke;
    
    // Update progress
    const progress = ((gameState.currentQuestion + 1) / gameState.sessionJokes.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('progressText').textContent = 
        `Question ${gameState.currentQuestion + 1}/${gameState.sessionJokes.length}`;
    
    // Generate answers
    let answers = [];
    
    if (joke.type === 'twopart') {
        answers.push({
            text: joke.delivery,
            correct: true
        });
    } else {
        // For single jokes, generate a fake answer
        answers.push({
            text: "That's a good one!",
            correct: true
        });
    }
    
    // Add wrong answers
    if (joke.wrongAnswers) {
        joke.wrongAnswers.forEach(wrong => {
            answers.push({
                text: wrong,
                correct: false
            });
        });
    }
    
    // Shuffle answers
    answers = shuffle(answers);
    
    // Render buttons
    const grid = document.getElementById('answersGrid');
    grid.innerHTML = '';
    
    answers.forEach((answer, index) => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.textContent = answer.text;
        btn.onclick = () => selectAnswer(index, answer, btn);
        btn.disabled = gameState.answerSubmitted;
        grid.appendChild(btn);
    });
    
    updateStats();
}

/**
 * Select an answer
 */
function selectAnswer(index, answer, btn) {
    if (gameState.answerSubmitted) return;
    
    gameState.selectedAnswer = answer;
    gameState.answerSubmitted = true;
    
    // Disable all buttons
    document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
    
    // Show result
    const allBtns = document.querySelectorAll('.answer-btn');
    if (answer.correct) {
        btn.classList.add('correct');
        gameState.correctAnswers++;
        gameState.combo++;
        
        // Calculate points
        let points = 100;
        if (gameState.combo > 1) {
            points += gameState.combo * 50;
        }
        gameState.score += points;
        
        // Update max combo
        if (gameState.combo > gameState.maxCombo) {
            gameState.maxCombo = gameState.combo;
        }
        
        playSound('correct');
        showFloatingText('+' + points, 'green');
    } else {
        btn.classList.add('incorrect');
        
        // Show correct answer
        allBtns.forEach(b => {
            if (b.textContent === gameState.currentJoke.delivery || 
                b.textContent === "That's a good one!") {
                b.classList.add('correct');
            }
        });
        
        gameState.combo = 0;
        playSound('wrong');
        showFloatingText('-50', 'red');
    }
    
    updateStats();
    
    // Move to next question after delay
    setTimeout(() => {
        gameState.currentQuestion++;
        loadNextQuestion();
    }, 2000);
}

/**
 * Shuffle array
 */
function shuffle(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * Update stats display
 */
function updateStats() {
    document.getElementById('scoreDisplay').textContent = gameState.score;
    document.getElementById('levelDisplay').textContent = gameState.level;
    
    // Show combo if active
    const comboDisplay = document.getElementById('comboDisplay');
    if (gameState.combo > 1) {
        comboDisplay.style.display = 'flex';
        document.getElementById('comboNumber').textContent = gameState.combo;
    } else {
        comboDisplay.style.display = 'none';
    }
}

/**
 * End game
 */
function endGame() {
    gameState.gameActive = false;
    saveGameData();
    showGameOver();
}

/**
 * Show game over screen
 */
function showGameOver() {
    const accuracy = Math.round((gameState.correctAnswers / gameState.sessionJokes.length) * 100);
    let resultMessage = '🎉 Amazing! 🎉';
    
    if (accuracy >= 80) {
        resultMessage = '🏆 Incredible! 🏆';
    } else if (accuracy >= 60) {
        resultMessage = '😊 Good Job! 😊';
    } else if (accuracy >= 40) {
        resultMessage = '💪 Keep Trying! 💪';
    } else {
        resultMessage = '📚 Better Luck Next Time! 📚';
    }
    
    document.getElementById('finalResult').textContent = resultMessage;
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalAccuracy').textContent = accuracy + '%';
    document.getElementById('finalCombo').textContent = gameState.maxCombo;
    
    // Check for level up
    const levelThreshold = gameState.level * 500;
    if (gameState.score >= levelThreshold) {
        gameState.level++;
        unlockNewStyle();
        document.getElementById('levelUpMessage').innerHTML = 
            `<div style="text-align: center;">
                <div style="font-size: 2em; margin-bottom: 10px;">⭐ LEVEL UP! ⭐</div>
                <div>You reached Level ${gameState.level}!</div>
                <div>New comedy style unlocked! 🎨</div>
            </div>`;
    } else {
        document.getElementById('levelUpMessage').innerHTML = '';
    }
    
    showScreen('gameOverScreen');
    playSound('victory');
}

/**
 * Unlock new comedy style
 */
function unlockNewStyle() {
    const styles = ['Programming', 'General', 'Knock-Knock', 'Dark'];
    if (gameState.level - 1 < styles.length) {
        const newStyle = styles[gameState.level - 1];
        if (!gameState.unlockedStyles.includes(newStyle)) {
            gameState.unlockedStyles.push(newStyle);
        }
    }
    saveGameData();
}

/**
 * Quit game
 */
function quitGame() {
    if (confirm('Are you sure you want to quit? Your progress will not be saved.')) {
        backToMenu();
    }
}

/**
 * Show floating text
 */
function showFloatingText(text, color) {
    const floatingText = document.createElement('div');
    floatingText.style.position = 'fixed';
    floatingText.style.top = '50%';
    floatingText.style.left = '50%';
    floatingText.style.transform = 'translate(-50%, -50%)';
    floatingText.style.fontSize = '2em';
    floatingText.style.fontWeight = 'bold';
    floatingText.style.color = color;
    floatingText.style.pointerEvents = 'none';
    floatingText.style.animation = 'floatUp 1s ease-out forwards';
    floatingText.textContent = text;
    document.body.appendChild(floatingText);
    
    setTimeout(() => floatingText.remove(), 1000);
}

/**
 * Sound effects
 */
function playSound(type) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        if (type === 'correct') {
            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } else if (type === 'wrong') {
            oscillator.frequency.value = 400;
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } else if (type === 'victory') {
            oscillator.frequency.value = 1000;
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        }
    } catch (e) {
        // Audio not supported
    }
}

/**
 * Screen Management
 */
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function backToMenu() {
    showScreen('menuScreen');
}

function showInstructions() {
    showScreen('instructionsScreen');
}

function showStats() {
    updateStatsDisplay();
    showScreen('statsScreen');
}

/**
 * Stats Management
 */
function updateStatsDisplay() {
    document.getElementById('totalPointsDisplay').textContent = gameState.score;
    document.getElementById('correctAnswersDisplay').textContent = gameState.correctAnswers;
    document.getElementById('bestComboDisplay').textContent = gameState.maxCombo;
    document.getElementById('jokesHeardDisplay').textContent = gameState.jokesFetched;
    
    // Display unlocked styles
    const stylesList = document.getElementById('stylesList');
    stylesList.innerHTML = '';
    
    const allStyles = ['Programming', 'General', 'Knock-Knock', 'Dark'];
    allStyles.forEach(style => {
        const badge = document.createElement('div');
        badge.className = 'style-badge' + (gameState.unlockedStyles.includes(style) ? '' : ' locked');
        badge.textContent = style;
        stylesList.appendChild(badge);
    });
}

function resetStats() {
    if (confirm('Are you sure you want to reset all stats?')) {
        gameState.score = 0;
        gameState.level = 1;
        gameState.maxCombo = 0;
        gameState.correctAnswers = 0;
        gameState.jokesFetched = 0;
        gameState.unlockedStyles = ['Programming'];
        saveGameData();
        updateStatsDisplay();
    }
}

/**
 * Data Persistence
 */
function saveGameData() {
    const data = {
        score: gameState.score,
        level: gameState.level,
        maxCombo: gameState.maxCombo,
        correctAnswers: gameState.correctAnswers,
        jokesFetched: gameState.jokesFetched,
        unlockedStyles: gameState.unlockedStyles
    };
    localStorage.setItem('jokeQuestData', JSON.stringify(data));
}

function loadGameData() {
    const saved = localStorage.getItem('jokeQuestData');
    if (saved) {
        const data = JSON.parse(saved);
        Object.assign(gameState, data);
    }
}

// Add CSS animation for floating text
const style = document.createElement('style');
style.textContent = `
    @keyframes floatUp {
        0% {
            transform: translate(-50%, -50%);
            opacity: 1;
        }
        100% {
            transform: translate(-50%, -150px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
