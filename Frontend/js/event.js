document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 1. CLOUDINARY IMAGE UPLOAD (Create Page)
    // ==========================================
    const uploadBtn = document.getElementById("uploadImageBtn");
    const imageInput = document.getElementById("eventImage");
    const previewContainer = document.getElementById("imagePreviewContainer");
    const previewImg = document.getElementById("imagePreview");

    if (uploadBtn && window.cloudinary) {
        const myWidget = window.cloudinary.createUploadWidget({
            cloudName: "zljeumnf",
            uploadPreset: "vybe_events"
        }, (error, result) => { 
            if (!error && result && result.event === "success") { 
                const imageUrl = result.info.secure_url;
                imageInput.value = imageUrl;
                previewImg.src = imageUrl;
                previewContainer.style.display = "block";
            }
        });

        uploadBtn.addEventListener("click", function(e){
            e.preventDefault();
            myWidget.open();
        }, false);
    }

    // ==========================================
    // 2. CREATE EVENT FORM SUBMISSION (Create Page)
    // ==========================================
    const form = document.getElementById("createEventForm");
    const priceField = document.getElementById("priceField");
    const regModeRadios = document.querySelectorAll('input[name="registrationMode"]');
    const successBanner = document.getElementById("successBanner");

    if (regModeRadios.length > 0) {
        regModeRadios.forEach(radio => {
            radio.addEventListener("change", (e) => {
                if (e.target.value === "Paid") {
                    priceField.style.display = "block";
                } else {
                    priceField.style.display = "none";
                }
            });
        });
    }

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = "Submitting...";
            submitBtn.disabled = true;

            const uploadedImageUrl = document.getElementById("eventImage").value.trim();

            const payload = {
                title: document.getElementById("eventTitle").value.trim(),
                description: document.getElementById("eventDescription").value.trim(),
                category: document.getElementById("eventCategory").value,
                venue: document.getElementById("eventVenue").value.trim(),
                date: document.getElementById("eventDate").value,
                time: document.getElementById("eventTime").value,
                capacity: parseInt(document.getElementById("eventCapacity").value, 10),
                registrationMode: document.querySelector('input[name="registrationMode"]:checked').value === "Paid" ? "approval" : "first-come",
                price: document.getElementById("eventPrice").value ? parseInt(document.getElementById("eventPrice").value, 10) : 0,
                
                // Format the image for the backend schema
                media: uploadedImageUrl ? [{ url: uploadedImageUrl, type: "image" }] : [],
                
                requirements: document.getElementById("eventRequirements").value.trim(),
                contact: document.getElementById("eventContact").value.trim(),
                instagram: document.getElementById("eventInstagram").value.trim()
            };

            try {
                await window.api.createEvent(payload);
                if (successBanner) {
                    successBanner.style.display = "block";
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                form.reset();
                if (previewContainer) previewContainer.style.display = "none";
                if (priceField) priceField.style.display = "none";

                setTimeout(() => {
                    window.location.href = "organizer-dashboard.html";
                }, 2000);

            } catch (err) {
                console.error("Failed to create event:", err);
                alert(err.message || "Failed to submit event. Please try again.");
            } finally {
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    // ==========================================
    // 3. YOUR EVENTS (LIST + MANAGE VIEWS)
    // ==========================================
    const manageContainer = document.getElementById("manageEventContainer");
    if (manageContainer) {
        loadOrganizerEvents(manageContainer);
    }
});

async function loadOrganizerEvents(container) {
    container.innerHTML = `<div style="text-align: center; padding: 50px; color: #777;">Loading...</div>`;
    
    try {
        const events = await window.api.myEvents();
        const urlParams = new URLSearchParams(window.location.search);
        const filterId = urlParams.get('id');

        if (filterId) {
            // MANAGE MODE
            const event = events.find(e => String(e._id) === filterId || String(e.id) === filterId);
            
            if (!event) {
                container.innerHTML = `
                    <div class="empty-state">
                        <h3>Event not found.</h3>
                        <p>This event may have been created locally and isn't in the database yet, or you don't have permission.</p>
                        <a href="event.html" class="primary-button">Back to all events</a>
                    </div>
                `;
                return;
            }
            await renderManageView(container, event);
        } else {
            // LIST MODE
            if (!events || events.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">✦</div>
                        <h3>Nothing here yet.</h3>
                        <p>Your next event could be the one.</p>
                        <a href="create-event.html" class="primary-button">Create your first event</a>
                    </div>
                `;
                return;
            }
            renderListView(container, events);
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="empty-state"><h3>Failed to load events.</h3><p>${err.message}</p></div>`;
    }
}

function renderListView(container, events) {
    container.innerHTML = `
        <div style="margin-bottom: 30px;">
            <span class="eyebrow" style="color: #777; font-family: var(--mono); font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em;">YOUR EVENTS</span>
            <h1 style="font-family: var(--serif); font-size: 42px; margin-top: 10px;">What you're hosting.</h1>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
            ${events.map(e => {
                let imageUrl = (e.media && e.media.length > 0) ? e.media[0].url : (e.image || "");
                return `
                <div style="background: white; padding: 24px; border-radius: 20px; border: 1px solid #eaeaea; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        ${imageUrl ? `<img src="${imageUrl}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 12px; margin-bottom: 16px;">` : `<div style="width: 100%; height: 160px; background: linear-gradient(135deg, #2c2c2c, #111); border-radius: 12px; margin-bottom: 16px;"></div>`}
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <h3 style="margin: 0; font-size: 20px; font-weight: 700;">${e.title}</h3>
                            <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; background: ${e.status === 'approved' ? '#e6f4ea' : e.status === 'pending' ? '#fff3cd' : '#fce8e6'}; color: ${e.status === 'approved' ? '#1e8e3e' : e.status === 'pending' ? '#856404' : '#d93025'}; font-size: 11px; font-weight: 800; text-transform: uppercase;">
                                ${e.status}
                            </span>
                        </div>
                        <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">${e.date} at ${e.time}</p>
                        <p style="color: #888; font-size: 13px; margin: 0 0 20px 0;">📍 ${e.venue}</p>
                    </div>
                    <div style="margin-top: 15px; border-top: 1px solid #f0f0f0; padding-top: 15px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 12px; color: #666; font-weight: 500;">👥 ${e.registeredCount || 0} / ${e.capacity} registered</span>
                        <a href="event.html?id=${e._id}" style="color: var(--violet); font-weight: 700; font-size: 13px; text-decoration: none;">Manage →</a>
                    </div>
                </div>
            `}).join('')}
        </div>
    `;
}

async function renderManageView(container, event) {
    container.innerHTML = `<div style="text-align: center; padding: 50px;">Loading registrations...</div>`;
    try {
        const regs = await window.api.getEventRegistrations(event._id);
        const pending = regs.filter(r => r.status === 'pending');
        const confirmed = regs.filter(r => r.status === 'confirmed');
        
        let imageUrl = (event.media && event.media.length > 0) ? event.media[0].url : (event.image || "");

        container.innerHTML = `
            <div style="margin-bottom: 30px;">
                <a href="event.html" style="color: var(--violet); text-decoration: none; font-weight: 600; font-size: 14px;">← Back to all events</a>
                
                ${imageUrl ? `<img src="${imageUrl}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 20px; margin-top: 20px; margin-bottom: 20px;">` : ''}
                
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h1 style="font-family: var(--serif); font-size: 42px; margin: 0;">${event.title}</h1>
                        <p style="color: #666; font-size: 16px; margin-top: 10px;">${event.date} at ${event.time} • ${event.venue}</p>
                    </div>
                    <span style="display: inline-block; padding: 8px 16px; border-radius: 20px; background: ${event.status === 'approved' ? '#e6f4ea' : event.status === 'pending' ? '#fff3cd' : '#fce8e6'}; color: ${event.status === 'approved' ? '#1e8e3e' : event.status === 'pending' ? '#856404' : '#d93025'}; font-size: 12px; font-weight: 800; text-transform: uppercase;">
                        ${event.status}
                    </span>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px;">
                <div style="background: white; padding: 24px; border-radius: 16px; border: 1px solid #eaeaea;">
                    <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.05em;">Attendance</h3>
                    <p style="font-size: 32px; font-weight: 700; margin: 0;">${event.registeredCount || 0} <span style="font-size: 16px; color: #888; font-weight: 500;">/ ${event.capacity}</span></p>
                </div>
                <div style="background: white; padding: 24px; border-radius: 16px; border: 1px solid #eaeaea;">
                    <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.05em;">Actions</h3>
                    <button onclick="cancelEvent('${event._id}')" style="background: #fce8e6; color: #d93025; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer;">Cancel Event</button>
                </div>
            </div>

            <div style="margin-bottom: 40px;">
                <h2 style="font-size: 24px; margin-bottom: 20px;">Pending Approvals (${pending.length})</h2>
                ${pending.length === 0 ? '<p style="color: #888;">No pending requests.</p>' : ''}
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${pending.map(r => `
                        <div style="background: white; padding: 16px; border-radius: 12px; border: 1px solid #eaeaea; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong style="display: block; font-size: 16px;">${r.user?.name || 'Unknown User'}</strong>
                                <span style="font-size: 13px; color: #666;">${r.user?.email || ''}</span>
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <button onclick="updateReg('${r._id}', 'confirmed')" style="background: #e6f4ea; color: #1e8e3e; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer;">Approve</button>
                                <button onclick="updateReg('${r._id}', 'rejected')" style="background: #fce8e6; color: #d93025; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer;">Reject</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div>
                <h2 style="font-size: 24px; margin-bottom: 20px;">Confirmed Attendees (${confirmed.length})</h2>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${confirmed.map(r => `
                        <div style="background: white; padding: 16px; border-radius: 12px; border: 1px solid #eaeaea; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong style="display: block; font-size: 16px;">${r.user?.name || 'Unknown User'}</strong>
                                <span style="font-size: 13px; color: #666;">${r.user?.email || ''}</span>
                            </div>
                            <span style="color: #1e8e3e; font-size: 13px; font-weight: 600;">✓ Confirmed</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><h3>Failed to load registrations.</h3><p>${err.message}</p></div>`;
    }
}

// Global functions for inline onclick handlers
window.cancelEvent = async function(eventId) {
    if (!confirm("Are you sure you want to cancel this event? This cannot be undone.")) return;
    try {
        await window.api.cancelOwnEvent(eventId, "Cancelled by organizer");
        alert("Event cancelled.");
        window.location.href = "event.html";
    } catch (err) {
        alert(err.message || "Failed to cancel event.");
    }
};

window.updateReg = async function(regId, status) {
    try {
        await window.api.decideRegistration(regId, status);
        window.location.reload(); 
    } catch (err) {
        alert(err.message || "Failed to update registration.");
    }
};