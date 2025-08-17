document.addEventListener('DOMContentLoaded', () => {
    // Request notification permission on load
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }

    const instructionEl = document.getElementById('instruction');
    const timerEl = document.getElementById('timer');
    const startBtn = document.getElementById('startBtn');
    const resetBtn = document.getElementById('resetBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const historyListContainer = document.getElementById('history-list-container');

    let timerInterval;
    let medicationHistory = [];
    const HISTORY_KEY = 'miticureHistory';
    const TIMER_STATE_KEY = 'miticureTimerState';

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function updateTimerDisplay(seconds) {
        timerEl.textContent = formatTime(seconds);
    }

    function startTimer(endTime, onTick, onEnd) {
        clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            const remaining = Math.round((endTime - Date.now()) / 1000);
            if (remaining >= 0) {
                onTick(remaining);
            } else {
                clearInterval(timerInterval);
                onEnd();
            }
        }, 1000);
    }

    function renderHistoryList() {
        historyListContainer.innerHTML = ''; // Clear previous list

        const reversedHistory = [...medicationHistory].reverse();

        reversedHistory.forEach(timestamp => {
            const date = new Date(timestamp);
            const dateString = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            const timeString = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.textContent = `${dateString} - ${timeString}`;

            historyListContainer.appendChild(historyItem);
        });
    }

    function loadHistory() {
        const storedHistory = localStorage.getItem(HISTORY_KEY);
        if (storedHistory) {
            medicationHistory = JSON.parse(storedHistory);
        }
        renderHistoryList();
        toggleClearButton();
    }

    function saveNewHistoryEntry() {
        const timestamp = new Date().getTime();
        medicationHistory.push(timestamp);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(medicationHistory));
        renderHistoryList();
        toggleClearButton();
    }

    function clearHistory() {
        if (confirm('Are you sure you want to clear all history?')) {
            medicationHistory = [];
            localStorage.removeItem(HISTORY_KEY);
            renderHistoryList();
            toggleClearButton();
        }
    }

    function toggleClearButton() {
        clearHistoryBtn.style.display = medicationHistory.length > 0 ? 'block' : 'none';
    }

    function resetState() {
        clearInterval(timerInterval);
        localStorage.removeItem(TIMER_STATE_KEY);
        instructionEl.textContent = 'Press "Start" to begin.';
        timerEl.textContent = '';
        startBtn.style.display = 'inline-block';
        resetBtn.style.display = 'none';
        startBtn.disabled = false;
    }

    function startMedicationProcess() {
        saveNewHistoryEntry();

        startBtn.disabled = true;
        startBtn.style.display = 'none';
        resetBtn.style.display = 'inline-block';

        // Step 1: 1 minute under the tongue
        const step1Duration = 60;
        const step1EndTime = Date.now() + step1Duration * 1000;
        const timerState = {
            step: 1,
            endTime: step1EndTime
        };
        localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(timerState));
        runStep1(timerState);
    }

    function runStep1(timerState) {
        instructionEl.textContent = '1. Keep medicine under your tongue.';
        startTimer(timerState.endTime, updateTimerDisplay, () => {
            instructionEl.textContent = '2. Swallow now.';
            timerEl.textContent = '';
            // The service worker will show the notification
            setTimeout(startStep3, 2000);
        });

        navigator.serviceWorker.ready.then(registration => {
            const remainingDuration = (timerState.endTime - Date.now()) / 1000;
            if (remainingDuration > 0) {
                registration.active.postMessage({
                    action: 'startTimer',
                    duration: remainingDuration,
                    title: 'Time to Swallow!',
                    body: 'Please swallow the medicine now.'
                });
            }
        });
    }

    function startStep3() {
        // Step 3: 5 minutes no food or drink
        const step3Duration = 300;
        const step3EndTime = Date.now() + step3Duration * 1000;
        const timerState = {
            step: 3,
            endTime: step3EndTime
        };
        localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(timerState));
        runStep3(timerState);
    }
    
    function runStep3(timerState) {
        instructionEl.textContent = '3. Do not eat or drink anything.';
        startTimer(timerState.endTime, updateTimerDisplay, () => {
            instructionEl.textContent = 'All done! You can now eat and drink.';
            timerEl.textContent = '✅';
            resetState();
        });

        navigator.serviceWorker.ready.then(registration => {
            const remainingDuration = (timerState.endTime - Date.now()) / 1000;
            if (remainingDuration > 0) {
                registration.active.postMessage({
                    action: 'startTimer',
                    duration: remainingDuration,
                    title: 'All Done!',
                    body: 'You can now eat and drink freely.'
                });
            }
        });
    }

    function restoreTimerState() {
        const timerStateJSON = localStorage.getItem(TIMER_STATE_KEY);
        if (!timerStateJSON) {
            return;
        }

        const timerState = JSON.parse(timerStateJSON);
        const remaining = (timerState.endTime - Date.now()) / 1000;

        if (remaining <= 0) {
            localStorage.removeItem(TIMER_STATE_KEY);
            return;
        }
        
        startBtn.disabled = true;
        startBtn.style.display = 'none';
        resetBtn.style.display = 'inline-block';

        if (timerState.step === 1) {
            runStep1(timerState);
        } else if (timerState.step === 3) {
            runStep3(timerState);
        }
    }

    startBtn.addEventListener('click', startMedicationProcess);
    resetBtn.addEventListener('click', resetState);
    clearHistoryBtn.addEventListener('click', clearHistory);

    // Initial Load
    loadHistory();
    restoreTimerState();
});
