document.addEventListener("DOMContentLoaded", async () => {
    const user = window.api.getUser();
    if (!user || user.role !== "authority") {
        window.location.href = "member-login.html";
        return;
    }

    // ==========================================
    // LOGIC FOR DASHBOARD (Charts)
    // ==========================================
    const catCanvas = document.getElementById('categoryChart');
    if (catCanvas) {
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

            const data = await window.api.authorityAnalytics();
            
            let catLabels = data.categories.map(c => c._id || 'Other');
            let catData = data.categories.map(c => c.count);
            if (catLabels.length === 0) { catLabels = ["No Events Yet"]; catData = [0]; }
            
            new Chart(catCanvas.getContext('2d'), {
                type: 'bar',
                data: { labels: catLabels, datasets: [{ label: 'Events', data: catData, backgroundColor: '#7c5cff', borderRadius: 6 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
            });

            const regCanvas = document.getElementById('registrationChart');
            let regLabels = data.registrations.map(r => r._id);
            let regData = data.registrations.map(r => r.count);
            if (regLabels.length === 0) { regLabels = [new Date().toISOString().slice(0,10)]; regData = [0]; }
            
            new Chart(regCanvas.getContext('2d'), {
                type: 'line',
                data: { labels: regLabels, datasets: [{ label: 'Registrations', data: regData, borderColor: '#a3e635', backgroundColor: 'rgba(163, 230, 53, 0.2)', fill: true, tension: 0.4 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
            });
        } catch (err) {
            console.error("Analytics Error:", err);
        }
    }

    // ==========================================
    // LOGIC FOR REVIEW PAGE (Fetch & Actions)
    // ==========================================
    const reviewTitle = document.getElementById('reviewTitle');
    if (reviewTitle) {
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('id');

        if (!eventId) {
            alert("No event selected. Please go back to the dashboard and click 'Review' on an event.");
            window.location.href = "authority-dashboard.html";
            return;
        }

        // Load Event Data
        try {
            const event = await window.api.getEvent(eventId);
            
            // Populate text
            document.getElementById('reviewTitle').textContent = event.title;
            document.getElementById('eventName').textContent = event.title;
            document.getElementById('eventDescription').textContent = event.description || "No description provided.";
            document.getElementById('reviewOrganizer').textContent = `Hosted by ${event.organizer?.name || 'Unknown Organizer'}`;
            
            // Date formatting
            const d = new Date(event.date);
            document.getElementById('eventDay').textContent = d.getDate() || "—";
            document.getElementById('eventMonth').textContent = d.toLocaleString('default', { month: 'short' }).toUpperCase();
            document.getElementById('eventDate').textContent = event.date;
            
            // Other details
            document.getElementById('eventTime').textContent = event.time;
            document.getElementById('eventLocation').textContent = event.venue;
            document.getElementById('eventMode').textContent = event.mode || "Offline";
            document.getElementById('eventPrice').textContent = event.price ? `₹${event.price}` : "FREE";
            document.getElementById('eventCapacity').textContent = event.capacity;
            document.getElementById('eventCategory').textContent = event.category;
            document.getElementById('statusText').textContent = event.status.toUpperCase();

            // Image
            let imageUrl = (event.media && event.media.length > 0) ? event.media[0].url : "";
            if (imageUrl) {
                const cover = document.getElementById('eventCover');
                cover.style.backgroundImage = `url('${imageUrl}')`;
                cover.style.backgroundSize = 'cover';
                cover.style.backgroundPosition = 'center';
                document.querySelector('.cover-gradient').style.opacity = '0.4'; // Darken image for text
            }

            // Tags
            const tagsContainer = document.getElementById('eventTags');
            if (event.tags && event.tags.length > 0) {
                tagsContainer.innerHTML = event.tags.map(t => `<span class="tag">${t}</span>`).join('');
            }

        } catch (err) {
            console.error(err);
            alert("Failed to load event data.");
            return;
        }

        // Button Logic
        const modal = document.getElementById('decisionModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalDesc = document.getElementById('modalDescription');
        const reasonInput = document.getElementById('decisionReason');
        let currentAction = null;

        document.getElementById('approveEvent').addEventListener('click', async () => {
            if(confirm("Are you sure you want to approve and publish this event?")) {
                try {
                    await window.api.approveEvent(eventId, "Approved by authority");
                    alert("Event Approved!");
                    window.location.href = "authority-dashboard.html";
                } catch (err) { alert(err.message); }
            }
        });

        document.getElementById('requestChanges').addEventListener('click', () => {
            currentAction = 'changes';
            modalTitle.textContent = "Request Changes";
            modalDesc.textContent = "Tell the organizer what needs to be updated.";
            reasonInput.value = "";
            modal.style.display = "flex";
        });

        document.getElementById('rejectEvent').addEventListener('click', () => {
            currentAction = 'reject';
            modalTitle.textContent = "Reject Event";
            modalDesc.textContent = "Provide a reason for rejecting this event.";
            reasonInput.value = "";
            modal.style.display = "flex";
        });

        document.getElementById('closeModal').addEventListener('click', () => modal.style.display = "none");
        document.getElementById('cancelDecision').addEventListener('click', () => modal.style.display = "none");

        document.getElementById('confirmDecision').addEventListener('click', async () => {
            const reason = reasonInput.value.trim();
            if (!reason) return alert("Please provide a reason.");

            try {
                await window.api.rejectEvent(eventId, reason, currentAction === 'changes' ? "Changes Requested" : "Rejected");
                alert(currentAction === 'changes' ? "Changes requested." : "Event rejected.");
                window.location.href = "authority-dashboard.html";
            } catch (err) {
                alert(err.message);
            }
        });
    }

    // Logout
    const logoutBtn = document.getElementById("logoutButton");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            window.api.logout();
            window.location.href = "role-select.html";
        });
    }
});