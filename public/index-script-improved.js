document.addEventListener("DOMContentLoaded", () => {
    // Initialize API service
    const api = new APIService();
    
    // UI elements
    const studentIdInput = document.getElementById("student-id");
    const submitBtn = document.getElementById("submit-btn");
    const timeInBtn = document.getElementById("time-in-btn");
    const timeOutBtn = document.getElementById("time-out-btn");
    const clearEntry = document.getElementById("clear-entry");

    // Input validation
    studentIdInput.addEventListener("input", (event) => {
        const value = event.target.value;
        event.target.value = value.replace(/[^0-9\-]/g, '').slice(0, 10);
    });

    // Reset form function (unchanged - UI logic)
    function resetForm() {
        const fields = {
            'player-number': '000',
            'student-name': '-',
            'student-course': '-',
            'student-timein': '-',
            'student-timeout': '-'
        };
        
        Object.entries(fields).forEach(([id, value]) => {
            document.getElementById(id).textContent = value;
        });
        
        studentIdInput.value = '';
        studentIdInput.disabled = false;
        timeInBtn.style.display = 'none';
        timeOutBtn.style.display = 'none';
        clearEntry.style.display = 'none';
        timeInBtn.classList.add('hidden');
        timeOutBtn.classList.add('hidden');
        clearEntry.classList.add('hidden');
        submitBtn.style.display = 'block';
    }

    // Update UI with student data (unchanged - UI logic)
    function updateStudentUI(data) {
        document.getElementById("student-name").textContent = data.student.name;
        document.getElementById("student-course").textContent = `${data.student.course} - ${data.student.year_level || "-"}`;
        document.getElementById("player-number").textContent = String(data.student.attendance_id).padStart(3, '0');
        document.getElementById("student-timein").textContent = data.timeIn || '-';
        document.getElementById("student-timeout").textContent = data.timeOut || '-';
    }

    // Show appropriate buttons based on status (unchanged - UI logic)
    function showButtonsForStatus(status) {
        timeInBtn.style.display = "none";
        timeOutBtn.style.display = "none";
        clearEntry.style.display = "none";

        if (status === "ABSENT") {
            submitBtn.style.display = "none";
            timeInBtn.style.display = "block";
            clearEntry.style.display = "block";
            clearEntry.setAttribute("data-action", "delete");
        } else if (status === "ONGOING" || status === "INCOMPLETE") {
            submitBtn.style.display = "none";
            timeOutBtn.style.display = "block";
            clearEntry.style.display = "block";
            clearEntry.setAttribute("data-action", "clear");
        } else if (status === "ATTENDED") {
            alert("Student Already Attended!");
            setTimeout(resetForm, 500);
        }
    }

    // IMPROVED REQUEST LOGIC - Main submit handler
    submitBtn.addEventListener("click", async () => {
        const studentId = studentIdInput.value.trim();

        if (studentId === "") {
            alert("Please enter a student number.");
            return;
        }

        studentIdInput.disabled = true;

        try {
            // Single combined request instead of multiple nested calls
            const result = await api.getStudentWithLogs(studentId);
            
            if (result.success) {
                // Update UI with all data at once
                updateStudentUI(result);
                showButtonsForStatus(result.status);
            } else {
                alert("Student Not Found");
                studentIdInput.disabled = false;
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Error loading student data");
            studentIdInput.disabled = false;
        }
    });

    // IMPROVED REQUEST LOGIC - Time In handler
    timeInBtn.addEventListener("click", async () => {
        const studentId = studentIdInput.value.trim();

        try {
            // Single request that handles time in + timestamp retrieval
            const result = await api.processTimeIn(studentId);
            
            if (result.success) {
                // Update UI with new timestamp
                if (result.timeIn) {
                    document.getElementById("student-timein").textContent = result.timeIn;
                }
                alert("Successfully Timed In!");
                setTimeout(resetForm, 500);
            } else {
                alert("Error: Could not update attendance.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Error processing time in");
        }
    });

    // IMPROVED REQUEST LOGIC - Time Out handler
    timeOutBtn.addEventListener("click", async () => {
        const studentId = studentIdInput.value.trim();

        try {
            // Request handles status check + confirmation logic
            const result = await api.processTimeOut(studentId);
            
            if (result.success) {
                if (result.requiresConfirmation) {
                    // Handle confirmation for INCOMPLETE status
                    if (confirm("Timing out will change the status from INCOMPLETE to ATTENDED. Proceed?")) {
                        // Force time out after confirmation
                        const forceResult = await api.forceTimeOut(studentId);
                        if (forceResult.success) {
                            if (forceResult.timeOut) {
                                document.getElementById("student-timeout").textContent = forceResult.timeOut;
                            }
                            alert("Successfully Timed Out!");
                            setTimeout(resetForm, 500);
                        } else {
                            alert("Error: Could not complete time out.");
                        }
                    }
                } else {
                    // Direct time out
                    if (result.timeOut) {
                        document.getElementById("student-timeout").textContent = result.timeOut;
                    }
                    alert("Successfully Timed Out!");
                    setTimeout(resetForm, 500);
                }
            } else {
                alert("Error: Could not check attendance status.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Error processing time out");
        }
    });

    // IMPROVED REQUEST LOGIC - Clear Entry handler
    clearEntry.addEventListener("click", async () => {
        const studentId = studentIdInput.value.trim();
        const action = clearEntry.getAttribute("data-action");

        if (!studentId) {
            alert("No student selected.");
            return;
        }

        if (action === "delete") {
            try {
                const result = await api.clearEntry(studentId);
                if (result.success) {
                    alert("Entry deleted successfully!");
                    setTimeout(resetForm, 500);
                } else {
                    alert("Error: Could not delete entry.");
                }
            } catch (error) {
                console.error("Error:", error);
                alert("Error deleting entry");
            }
        }

        // Clear UI fields (unchanged - UI logic)
        const fields = {
            'player-number': '000',
            'student-name': '-',
            'student-course': '-',
            'student-timein': '-',
            'student-timeout': '-'
        };
        
        Object.entries(fields).forEach(([id, value]) => {
            document.getElementById(id).textContent = value;
        });

        timeInBtn.style.display = "none";
        timeOutBtn.style.display = "none";
        clearEntry.style.display = "none";
        submitBtn.style.display = "block";
        studentIdInput.disabled = false;
        studentIdInput.value = "";
    });

    // Keyboard event handlers (unchanged - UI logic)
    document.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            if (timeOutBtn.style.display === "block") {
                timeOutBtn.click();
            } else {
                submitBtn.click();
            }
        }
    });
    
    document.addEventListener("keydown", (event) => {
        if (event.key === "Delete") {
            event.preventDefault();
            if (clearEntry.style.display === "block") {
                clearEntry.click();
            }
        }
    });
}); 