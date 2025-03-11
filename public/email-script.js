document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("pdfModal");
    const btn = document.querySelector(".send-btn");
    const span = document.getElementsByClassName("close")[0];
    const uploadBtn = document.getElementById("uploadBtn");
    const debugBtn = document.getElementById("debugBtn"); // Added Debug button
    const pdfUpload = document.getElementById("pdfUpload");
    const pdfPreview = document.getElementById("pdfPreview");
    const loadingScreen = document.getElementById("loadingScreen");

    // Open the modal
    btn.onclick = function() {
        modal.style.display = "block";
    }

    // Close the modal
    span.onclick = function() {
        modal.style.display = "none";
    }

    // Close the modal when clicking outside of it
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Preview the uploaded PDF file
    pdfUpload.onchange = function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const iframe = document.createElement("iframe");
                iframe.src = e.target.result;
                iframe.width = "100%";
                iframe.height = "600px"; // Adjust height to fit within the modal
                iframe.style.border = "none"; // Remove iframe border
                pdfPreview.innerHTML = "";
                pdfPreview.appendChild(iframe);
            };
            reader.readAsDataURL(file);
        }
    }

    // Handle PDF upload
    uploadBtn.onclick = function() {
        const file = pdfUpload.files[0];
        if (!file) {
            alert("Please select a PDF file to upload.");
            return;
        }

        if (!confirm("Are you sure you want to upload this PDF and send emails?")) {
            return;
        }

        // Show loading screen
        loadingScreen.classList.remove("hidden");

        const formData = new FormData();
        formData.append("pdf", file);

        fetch("http://localhost:5000/upload_pdf", {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            // Hide loading screen
            loadingScreen.classList.add("hidden");

            if (data.success) {
                alert("PDF uploaded and emails sent successfully.");
                modal.style.display = "none";
            } else {
                alert("Error: " + data.message);
            }
        })
        .catch(error => {
            console.error("Error:", error);
            // Hide loading screen
            loadingScreen.classList.add("hidden");
            alert("An error occurred while uploading the PDF.");
        });
    }

    // Handle Debug button click
    debugBtn.onclick = function() {
        fetch("http://localhost:5000/fetch_logs")
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    data.logs.forEach(log => {
                        console.log("Retrieved Name:", log.dname);
                    });
                } else {
                    alert("Failed to fetch logs for debugging.");
                }
            })
            .catch(error => console.error("Error:", error));
    }
});