document.addEventListener("DOMContentLoaded", () => {
    // ==========================================
    // 1. CLOUDINARY IMAGE UPLOAD WIDGET
    // ==========================================
    const uploadBtn = document.getElementById("uploadImageBtn");
    const imageInput = document.getElementById("eventImage");
    const previewContainer = document.getElementById("imagePreviewContainer");
    const previewImg = document.getElementById("imagePreview");

    if (uploadBtn && window.cloudinary) {
        const myWidget = window.cloudinary.createUploadWidget({
            cloudName: "zljeumnf",       // Your Cloud Name
            uploadPreset: "vybe_events"  // Your Unsigned Preset
        }, (error, result) => { 
            if (!error && result && result.event === "success") { 
                const imageUrl = result.info.secure_url;
                
                // Update the input field with the uploaded URL
                imageInput.value = imageUrl;
                imageInput.readOnly = true;
                
                // Show the image preview
                previewImg.src = imageUrl;
                previewContainer.style.display = "block";
            }
        });

        uploadBtn.addEventListener("click", function(e){
            e.preventDefault(); // Prevents accidental form submission
            myWidget.open();
        }, false);
    }

    // ==========================================
    // 2. CREATE EVENT FORM SUBMISSION
    // ==========================================
    const form = document.getElementById("createEventForm");
    const priceField = document.getElementById("priceField");
    const regModeRadios = document.querySelectorAll('input[name="registrationMode"]');
    const successBanner = document.getElementById("successBanner");

    // Show/hide price field based on Free/Paid selection
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

            // Gather form data
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
                
                // Show success banner
                if (successBanner) {
                    successBanner.style.display = "block";
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                
                // Clear the form
                form.reset();
                if (previewContainer) previewContainer.style.display = "none";
                if (priceField) priceField.style.display = "none";

                // Redirect to dashboard after 2 seconds
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
});