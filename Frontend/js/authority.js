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
            
            // Bar Chart - Events by Category
            const catLabels = data.categories.map(c => c._id || 'Other');
            const catData = data.categories.map(c => c.count);
            
            new Chart(catCanvas, {
                type: 'bar',
                data: {
                    labels: catLabels,
                    datasets: [{
                        label: 'Events',
                        data: catData,
                        backgroundColor: '#7c5cff', // VYBE Violet
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { 
                        y: { beginAtZero: true, ticks: { stepSize: 1 } },
                        x: { grid: { display: false } }
                    }
                }
            });

            // Line Chart - Registrations
            const regLabels = data.registrations.map(r => r._id);
            const regData = data.registrations.map(r => r.count);
            
            // If there's no data, show a flat line
            if (regLabels.length === 0) {
                regLabels.push(new Date().toISOString().slice(0,10));
                regData.push(0);
            }
            
            new Chart(regCanvas, {
                type: 'line',
                data: {
                    labels: regLabels,
                    datasets: [{
                        label: 'Registrations',
                        data: regData,
                        borderColor: '#a3e635', // VYBE Acid
                        backgroundColor: 'rgba(163, 230, 53, 0.2)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#a3e635'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { 
                        y: { beginAtZero: true, ticks: { stepSize: 1 } },
                        x: { grid: { display: false } }
                    }
                }
            });

        } catch (err) {
            console.error("Failed to load analytics:", err);
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