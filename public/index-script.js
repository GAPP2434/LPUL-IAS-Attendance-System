document.addEventListener("DOMContentLoaded", () => {
    const studentIdInput = document.getElementById("student-id");
    const submitBtn = document.getElementById("submit-btn");
    const timeInBtn = document.getElementById("time-in-btn");
    const timeOutBtn = document.getElementById("time-out-btn");
    const clearEntry = document.getElementById("clear-entry");

    studentIdInput.addEventListener("input", (event) => {
        const value = event.target.value;
        event.target.value = value.replace(/[^0-9\-]/g, '').slice(0, 10); // Limit to 10 characters
    });

    // Add resetForm function
    function resetForm() {
        const fields = {
            'player-number': '000',
            'student-name': '-',
            'student-course': '-',
            'student-timein': '-',
            'student-timeout': '-'
        };
        
        // Reset all fields
        Object.entries(fields).forEach(([id, value]) => {
            document.getElementById(id).textContent = value;
        });
        
        // Reset input and buttons
        studentIdInput.value = '';
        studentIdInput.disabled = false; // Enable input field
        timeInBtn.style.display = 'none';
        timeOutBtn.style.display = 'none';
        clearEntry.style.display = 'none';
        timeInBtn.classList.add('hidden');
        timeOutBtn.classList.add('hidden');
        clearEntry.classList.add('hidden');
        submitBtn.style.display = 'block';
    }

    // Fetch student info on submit
    submitBtn.addEventListener("click", () => {
        const studentId = studentIdInput.value.trim();

        if (studentId === "") {
            alert("Please enter a student number.");
            return;
        }

        studentIdInput.disabled = true; // Disable input field

        fetch("http://localhost:5000/fetch_student", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_id: studentId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById("student-name").textContent = data.name;
                document.getElementById("student-course").textContent = `${data.course} - ${data.year_level || "-"}`;
                document.getElementById("player-number").textContent = String(data.attendance_id).padStart(3, '0');
                
                // Fetch student attendance status and time data
                fetch(`http://localhost:5000/fetch_logs`)
                .then(response => response.json())
                .then(logsData => {
                    if (logsData.success) {
                        // Find the matching log entries for this student
                        const timeInLog = logsData.logs.find(log => 
                            log.dstudentnumber === studentId && 
                            log.ttimein !== null
                        );
                        const timeOutLog = logsData.logs.find(log => 
                            log.dstudentnumber === studentId && 
                            log.ttimeout !== null
                        );

                        // Display the timestamps from database
                        document.getElementById("student-timein").textContent = 
                            timeInLog ? timeInLog.ttimein : '-';
                        document.getElementById("student-timeout").textContent = 
                            timeOutLog ? timeOutLog.ttimeout : '-';
                    }
        
                        // Continue with attendance status check
                        fetch("http://localhost:5000/check_attendance_status", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ student_id: studentId })
                        })
                        .then(response => response.json())
                        .then(attendanceData => {
                            if (attendanceData.success) {
                                // Hide all buttons initially
                                timeInBtn.style.display = "none";
                                timeOutBtn.style.display = "none";
                                clearEntry.style.display = "none";
        
                                if (attendanceData.status === "ABSENT") {
                                    submitBtn.style.display = "none";
                                    timeInBtn.style.display = "block";
                                    clearEntry.style.display = "block";
                                    clearEntry.setAttribute("data-action", "delete");
                                } else if (attendanceData.status === "ONGOING" || attendanceData.status === "INCOMPLETE") {
                                    submitBtn.style.display = "none";
                                    timeOutBtn.style.display = "block";
                                    clearEntry.style.display = "block";
                                    clearEntry.setAttribute("data-action", "clear");
                                } else if (attendanceData.status === "ATTENDED") {
                                    alert("Student Already Attended!");
                                    setTimeout(resetForm, 500);
                                }
                            }
                        });
                    });
            } else {
                alert("Student Not Found");
                studentIdInput.disabled = false; // Enable input field
            }
        })
        .catch(error => {
            console.error("Error:", error);
            studentIdInput.disabled = false; // Enable input field
        });
    });

    document.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            event.preventDefault(); // Prevent any default action
    
            if (timeOutBtn.style.display === "block") {
                // If the Time Out button is visible, trigger the Time Out function
                timeOutBtn.click();
            } else {
                // Otherwise, trigger the Submit function
                submitBtn.click();
            }
        }
    });
    
    // Add event listener to the document to detect "Delete" key press
    document.addEventListener("keydown", (event) => {
        if (event.key === "Delete") {
            event.preventDefault(); // Prevent any default action

            if (clearEntry.style.display === "block") {
                // If the Clear Entry button is visible, trigger the Clear Entry function
                clearEntry.click();
            }
        }
    });

    // Time In Button Click
    timeInBtn.addEventListener("click", () => {
        const studentId = studentIdInput.value.trim();

        fetch("http://localhost:5000/time_in", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_id: studentId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Fetch the latest timestamp from database
                fetch(`http://localhost:5000/fetch_logs`)
                    .then(response => response.json())
                    .then(logsData => {
                        if (logsData.success) {
                            const timeInLog = logsData.logs.find(log => 
                                log.dstudentnumber === studentId && 
                                log.ttimein !== null
                            );
                            document.getElementById("student-timein").textContent = 
                                timeInLog ? timeInLog.ttimein : '-';
                        }
                    });
                
                alert("Successfully Timed In!");
                setTimeout(resetForm, 500);
            } else {
                alert("Error: Could not update attendance.");
            }
        })
        .catch(error => console.error("Error:", error));
    });

    // Time Out Button Click
    timeOutBtn.addEventListener("click", () => {
        const studentId = studentIdInput.value.trim();
    
        // First check the current attendance status
        fetch("http://localhost:5000/check_attendance_status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_id: studentId })
        })
        .then(response => response.json())
        .then(statusData => {
            if (statusData.success) {
                // If status is INCOMPLETE, show confirmation dialog
                if (statusData.status === "INCOMPLETE") {
                    if (!confirm("Timing out will change the status from INCOMPLETE to ATTENDED. Proceed?")) {
                        return; // Cancel the time out if user clicks Cancel
                    }
                }
                
                // Proceed with time out
                performTimeOut(studentId);
            } else {
                alert("Error: Could not check attendance status.");
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Error checking attendance status.");
        });
    });
    
    // Clear Entry button click
    clearEntry.addEventListener("click", () => {
        const studentId = studentIdInput.value.trim();
        const action = clearEntry.getAttribute("data-action"); // Check action type
    
        if (!studentId) {
            alert("No student selected.");
            return;
        }
    
        if (action === "delete") {
            // Delete entry from the database for ABSENT students
            fetch("http://localhost:5000/clear_entry", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ student_id: studentId })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert("Entry deleted successfully!");
                    setTimeout(resetForm, 500);
                } else {
                    alert("Error: Could not delete entry.");
                }
            })
            .catch(error => console.error("Error:", error));
        }
        
        // Clear player-info fields
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

        // Hide buttons and show submit button
        timeInBtn.style.display = "none";
        timeOutBtn.style.display = "none";
        clearEntry.style.display = "none";
        submitBtn.style.display = "block";
        studentIdInput.disabled = false; // Enable input field
        studentIdInput.value = "";
    }); 

    function performTimeOut(studentId) {
        fetch("http://localhost:5000/time_out", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_id: studentId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Fetch the latest timestamp from database
                fetch(`http://localhost:5000/fetch_logs`)
                    .then(response => response.json())
                    .then(logsData => {
                        if (logsData.success) {
                            const timeOutLog = logsData.logs.find(log => 
                                log.dstudentnumber === studentId && 
                                log.ttimeout !== null
                            );
                            document.getElementById("student-timeout").textContent = 
                                timeOutLog ? timeOutLog.ttimeout : '-';
                        }
                    });
                
                alert("Successfully Timed Out!");
                setTimeout(resetForm, 500);
            } else {
                alert("Error: Could not update attendance.");
            }
        })
        .catch(error => console.error("Error:", error));
    }
});
