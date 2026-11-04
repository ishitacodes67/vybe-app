document.addEventListener("DOMContentLoaded", async () => {
    // 1. Verify User
    const user = window.api.getUser();
    if (!user || user.role !== "authority") {
        window.location.href = "member-login.html";
        return;
    }

    // 2. Load Stats
    async function loadStats() {
        try {
            const stats = await window.api.authorityStats();
            
            const totalEvents = document.getElementById("totalEvents");
            const pendingEvents = document.getElementById("pendingEvents");
            const totalUsers = document.getElementById("totalUsers");
            const approvedEvents = document.getElementById("approvedEvents");

            if (totalEvents) totalEvents.textContent = stats.events.total;
            if (pendingEvents) pendingEvents.textContent = stats.events.pending;
            if (totalUsers) totalUsers.textContent = stats.users.total;
            if (approvedEvents) approvedEvents.textContent = stats.events.approved;

        } catch (err) {
            console.error("Failed to load stats:", err);
        }
    }

    // 3. Load Analytics Charts
    async function loadAnalytics() {
        const catCanvas = document.getElementById('categoryChart');
        const regCanvas = document.getElementById('registrationChart');
        
        if (!catCanvas || !regCanvas) return;

        try {
            const data = await window.api.authorityAnalytics();
            
            // --- BAR CHART ---
            let catLabels = data.categories.map(c => c._id || 'Other');
            let catData = data.categories.map(c => c.count);
            
            // Fallback for empty data
            if (catLabels.length === 0) {
                catLabels = ["No Events Yet"];
                catData = [0];
            }
            
            new Chart(catCanvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: catLabels,
                    datasets: [{
                        label: 'Events',
                        data: catData,
                        backgroundColor: '#7c5cff',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { 
                        y: { beginAtZero: true, ticks: { stepSize: 1, color: '#666' }, grid: { color: '#f0f0f0' } },
                        x: { ticks: { color: '#666' }, grid: { display: false } }
                    }
                }
            });

            // --- LINE CHART ---
            let regLabels = data.registrations.map(r => r._id);
            let regData = data.registrations.map(r => r.count);
            
            if (regLabels.length === 0) {
                regLabels = [new Date().toISOString().slice(0,10)];
                regData = [0];
            }
            
            new Chart(regCanvas.getContext('2d'), {
                type: 'line',
                data: {
                    labels: regLabels,
                    datasets: [{
                        label: 'Registrations',
                        data: regData,
                        borderColor: '#a3e635',
                        backgroundColor: 'rgba(163, 230, 53, 0.2)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#a3e635',
                        pointBorderColor: '#111',
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { 
                        y: { beginAtZero: true, ticks: { stepSize: 1, color: '#666' }, grid: { color: '#f0f0f0' } },
                        x: { ticks: { color: '#666' }, grid: { display: false } }
                    }
                }
            });

        } catch (err) {
            console.error("Failed to load analytics:", err);
            // Show the actual error message on screen so you can read it
            catCanvas.parentElement.innerHTML = `<div style="color: #d93025; font-size: 14px;">Error: ${err.message}</div>`;
            regCanvas.parentElement.innerHTML = `<div style="color: #d93025; font-size: 14px;">Error: ${err.message}</div>`;
        }
    }

    // 4. Logout
    const logoutBtn = document.getElementById("logoutButton");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            window.api.logout();
            window.location.href = "role-select.html";
        });
    }

    // Initialize
    await loadStats();
    await loadAnalytics();
});