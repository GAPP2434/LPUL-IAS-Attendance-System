document.addEventListener("DOMContentLoaded", () => {
    const studentIdInput = document.getElementById("student-id");
    const submitBtn = document.getElementById("submit-btn");
    const timeInBtn = document.getElementById("time-in-btn");
    const timeOutBtn = document.getElementById("time-out-btn");
    const clearEntry = document.getElementById("clear-entry");

    // Fetch student info on submit
    submitBtn.addEventListener("click", () => {
        const studentId = studentIdInput.value.trim();

        if (studentId === "") {
            alert("Please enter a student number.");
            return;
        }

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
                                } else if (attendanceData.status === "ONGOING") {
                                    submitBtn.style.display = "none";
                                    timeOutBtn.style.display = "block";
                                    clearEntry.style.display = "block";
                                    clearEntry.setAttribute("data-action", "clear");
                                } else if (attendanceData.status === "ATTENDED") {
                                    alert("Student Already Attended!");
                                    document.getElementById("student-name").textContent = "";
                                    document.getElementById("student-course").textContent = "";
                                    document.getElementById("student-timein").textContent = "-";
                                    document.getElementById("student-timeout").textContent = "-";
                                    studentIdInput.value = "";
                                    submitBtn.style.display = "block";
                                }
                            }
                        });
                    });
            } else {
                alert(data.message || "Student not found!");
            }
        })
        .catch(error => console.error("Error:", error));
    });

    studentIdInput.addEventListener("keypress", (event) => {
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
                
                setTimeout(() => {
                    document.getElementById("player-number").textContent = "000";
                    document.getElementById("student-name").textContent = "-";
                    document.getElementById("student-course").textContent = "-";
                    document.getElementById("student-timein").textContent = "-";
                    document.getElementById("student-timeout").textContent = "-";
                    studentIdInput.value = "";

                    timeInBtn.style.display = "none";
                    timeInBtn.classList.add("hidden");
                    timeOutBtn.classList.add("hidden");
                    submitBtn.style.display = "block";
                    clearEntry.style.display = "none";
                }, 2000);
            } else {
                alert("Error: Could not update attendance.");
            }
        })
        .catch(error => console.error("Error:", error));
    });

    // Time Out Button Click
    timeOutBtn.addEventListener("click", () => {
        const studentId = studentIdInput.value.trim();

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
                
                setTimeout(() => {
                    document.getElementById("player-number").textContent = "000";
                    document.getElementById("student-name").textContent = "-";
                    document.getElementById("student-course").textContent = "-";
                    document.getElementById("student-timein").textContent = "-";
                    document.getElementById("student-timeout").textContent = "-";
                    studentIdInput.value = "";
                    
                    timeOutBtn.style.display = "none";
                    timeInBtn.classList.add("hidden");
                    timeOutBtn.classList.add("hidden");
                    clearEntry.classList.add("hidden");
                    clearEntry.style.display = "none";
                    submitBtn.style.display = "block";
                }, 2000);
            } else {
                alert("Error: Could not update attendance.");
            }
        })
        .catch(error => console.error("Error:", error));
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
                } else {
                    alert("Error: Could not delete entry.");
                }
            })
            .catch(error => console.error("Error:", error));
        }
    
        // Clear input fields (Both cases)
        document.getElementById("player-number").textContent = "";
        document.getElementById("student-name").textContent = "";
        document.getElementById("student-course").textContent = "";
        studentIdInput.value = "";
    
        // Hide buttons and show submit button
        timeInBtn.style.display = "none";
        timeOutBtn.style.display = "none";
        clearEntry.style.display = "none";
        submitBtn.style.display = "block";
    });
    
    
});