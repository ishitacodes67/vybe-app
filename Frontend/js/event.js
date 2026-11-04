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
                image: document.getElementById("eventImage").value.trim(),
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
    // 3. RENDER "YOUR EVENTS" LIST (event.html)
    // ==========================================
    const manageContainer = document.getElementById("manageEventContainer");
    if (manageContainer) {
        loadOrganizerEvents(manageContainer);
    }
});

async function loadOrganizerEvents(container) {
    container.innerHTML = `<div style="text-align: center; padding: 50px; color: #777;">Loading events...</div>`;
    
    try {
        const events = await window.api.myEvents();
        
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

        const urlParams = new URLSearchParams(window.location.search);
        const filterId = urlParams.get('id');
        
        let displayEvents = events;
        if (filterId) {
            displayEvents = events.filter(e => (e._id || e.id) === filterId);
        }

        container.innerHTML = `
            <div style="margin-bottom: 30px;">
                <span class="eyebrow" style="color: #777; font-family: var(--mono); font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em;">YOUR EVENTS</span>
                <h1 style="font-family: var(--serif); font-size: 42px; margin-top: 10px;">What you're hosting.</h1>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
                ${displayEvents.map(e => `
                    <div style="background: white; padding: 24px; border-radius: 20px; border: 1px solid #eaeaea; display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                        <div>
                            ${e.image ? `<img src="${e.image}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 12px; margin-bottom: 16px;">` : ''}
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                                <h3 style="margin: 0; font-size: 20px; font-weight: 700;">${e.title}</h3>
                                <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; background: ${e.status === 'approved' ? '#e6f4ea' : e.status === 'pending' ? '#fff3cd' : '#fce8e6'}; color: ${e.status === 'approved' ? '#1e8e3e' : e.status === 'pending' ? '#856404' : '#d93025'}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">
                                    ${e.status}
                                </span>
                            </div>
                            <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">${e.date} at ${e.time}</p>
                            <p style="color: #888; font-size: 13px; margin: 0 0 20px 0;">📍 ${e.venue}</p>
                        </div>
                        <div style="margin-top: 15px; border-top: 1px solid #f0f0f0; padding-top: 15px; display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 12px; color: #666; font-weight: 500;">👥 ${e.registeredCount || 0} / ${e.capacity} registered</span>
                            <a href="event-details.html?id=${e._id || e.id}" style="color: var(--violet); font-weight: 700; font-size: 13px; text-decoration: none;">Manage →</a>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="empty-state"><h3>Failed to load events.</h3><p>${err.message}</p></div>`;
    }
}