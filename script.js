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
    const calendarContainer = document.getElementById('calendar-container');

    let timerInterval;
    let timeoutId;
    let medicationHistory = [];
    const HISTORY_KEY = 'miticureHistory';

    function showNotification(title, body) {
        // Don't show notifications if the window is focused
        if (document.hasFocus()) return;

        if (Notification.permission === 'granted') {
            new Notification(title, { body });
        } else {
            // Fallback for when notifications are not granted
            alert(`${title}\n${body}`);
        }
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function updateTimerDisplay(seconds) {
        timerEl.textContent = formatTime(seconds);
    }

    function startTimer(duration, onTick, onEnd) {
        let remaining = duration;
        updateTimerDisplay(remaining);

        timerInterval = setInterval(() => {
            remaining--;
            onTick(remaining);
            if (remaining <= 0) {
                clearInterval(timerInterval);
                onEnd();
            }
        }, 1000);
    }

    function renderCalendar() {
        calendarContainer.innerHTML = ''; // Clear previous calendar

        const countsByDay = {};
        medicationHistory.forEach(timestamp => {
            const date = new Date(timestamp);
            const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
            countsByDay[dateString] = (countsByDay[dateString] || 0) + 1;
        });

        const today = new Date();
        const endDate = new Date(today);
        const startDate = new Date(today);
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setDate(startDate.getDate() + 1);

        // Add empty cells for the first day's week alignment
        for (let i = 0; i < startDate.getDay(); i++) {
            calendarContainer.appendChild(document.createElement('div'));
        }

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateString = d.toISOString().split('T')[0];
            const count = countsByDay[dateString] || 0;

            const cell = document.createElement('div');
            cell.className = 'day-cell';

            let level = 0;
            if (count > 0) level = 1;
            if (count > 1) level = 2;
            if (count > 2) level = 3;
            if (count > 3) level = 4;
            cell.classList.add(`level-${level}`);

            const tooltip = document.createElement('span');
            tooltip.className = 'tooltip';
            const dateFormatted = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            tooltip.textContent = `${count} dose(s) on ${dateFormatted}`;
            cell.appendChild(tooltip);

            calendarContainer.appendChild(cell);
        }
    }

    function loadHistory() {
        const storedHistory = localStorage.getItem(HISTORY_KEY);
        if (storedHistory) {
            medicationHistory = JSON.parse(storedHistory);
        }
        renderCalendar();
        toggleClearButton();
    }

    function saveNewHistoryEntry() {
        const timestamp = new Date().getTime();
        medicationHistory.push(timestamp);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(medicationHistory));
        renderCalendar();
        toggleClearButton();
    }

    function clearHistory() {
        if (confirm('Are you sure you want to clear all history?')) {
            medicationHistory = [];
            localStorage.removeItem(HISTORY_KEY);
            renderCalendar();
            toggleClearButton();
        }
    }

    function toggleClearButton() {
        clearHistoryBtn.style.display = medicationHistory.length > 0 ? 'block' : 'none';
    }

    function resetState() {
        clearInterval(timerInterval);
        clearTimeout(timeoutId);
        instructionEl.textContent = 'Press "Start" to begin.';
        timerEl.textContent = '';
        startBtn.style.display = 'inline-block';
        resetBtn.style.display = 'none';
        startBtn.disabled = false;
    }

    function startMedicationProcess() {
        // Record the medication intake time
        saveNewHistoryEntry();

        startBtn.disabled = true;
        startBtn.style.display = 'none';
        resetBtn.style.display = 'inline-block';

        // Step 1: 1 minute under the tongue
        instructionEl.textContent = '1. Keep medicine under your tongue.';
        startTimer(60, updateTimerDisplay, () => {
            // Step 2: Swallow
            instructionEl.textContent = '2. Swallow now.';
            timerEl.textContent = '';
            showNotification('Time to Swallow!', 'Please swallow the medicine now.');
            
            timeoutId = setTimeout(step3_noFoodOrDrink, 2000);
        });
    }

    function step3_noFoodOrDrink() {
        // Step 3: 5 minutes no food or drink
        instructionEl.textContent = '3. Do not eat or drink anything.';
        startTimer(300, updateTimerDisplay, () => {
            instructionEl.textContent = 'All done! You can now eat and drink.';
            timerEl.textContent = '✅';
            showNotification('All Done!', 'You can now eat and drink freely.');
            resetState();
        });
    }

    startBtn.addEventListener('click', startMedicationProcess);
    resetBtn.addEventListener('click', resetState);
    clearHistoryBtn.addEventListener('click', clearHistory);

    // Initial Load
    loadHistory();
});