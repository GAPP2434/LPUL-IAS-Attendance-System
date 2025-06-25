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
        
        // Reset input and keep submit button visible
        studentIdInput.value = '';
        studentIdInput.disabled = false; // Enable input field
        submitBtn.style.display = 'block';
        
        // Keep time/clear buttons hidden since submit handles everything
        timeInBtn.style.display = 'none';
        timeOutBtn.style.display = 'none';
        clearEntry.style.display = 'none';
    }

    // Hide the manual time in/out buttons on page load since submit handles everything
    timeInBtn.style.display = 'none';
    timeOutBtn.style.display = 'none';
    clearEntry.style.display = 'none';

    // Submit button with automatic time in/out logic
    submitBtn.addEventListener("click", () => {
        const studentId = studentIdInput.value.trim();

        if (studentId === "") {
            alert("Please enter a student number.");
            return;
        }

        studentIdInput.disabled = true; // Disable input field

        // First fetch student data
        fetch("http://localhost:5000/fetch_student", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_id: studentId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update student info display
                document.getElementById("student-name").textContent = data.name;
                document.getElementById("student-course").textContent = `${data.course} - ${data.year_level || "-"}`;
                document.getElementById("player-number").textContent = studentId;
                // document.getElementById("player-number").textContent = String(data.attendance_id).padStart(3, '0');
                
                // Check current attendance status to determine action
                fetch("http://localhost:5000/check_attendance_status", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ student_id: studentId })
                })
                .then(response => response.json())
                .then(attendanceData => {
                    if (attendanceData.success) {
                        const status = attendanceData.status.trim();
                        
                        if (status === "ABSENT") {
                            // Auto Time In
                            performTimeIn(studentId);
                        } else if (status === "ONGOING" || status === "INCOMPLETE") {
                            // Auto Time Out
                            performTimeOut(studentId);
                        } else if (status === "ATTENDED") {
                            alert("Student Already Attended!");
                            fetchAndDisplayTimestamps(studentId);
                            setTimeout(resetForm, 3000);
                        }
                    } else {
                        alert("Error checking attendance status");
                        studentIdInput.disabled = false;
                    }
                })
                .catch(error => {
                    console.error("Error checking status:", error);
                    studentIdInput.disabled = false;
                });
            } else {
                alert("Student Not Found");
                studentIdInput.disabled = false;
            }
        })
        .catch(error => {
            console.error("Error:", error);
            studentIdInput.disabled = false;
        });
    });

    // Function to perform time in
    function performTimeIn(studentId) {
        fetch("http://localhost:5000/time_in", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_id: studentId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById("student-timein").textContent = 'Updating...';
                
                fetchAndDisplayTimestamps(studentId);
                alert("Successfully Timed In!");
                setTimeout(resetForm, 3000);
            } else {
                alert("Error: Could not record time in.");
                studentIdInput.disabled = false;
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Error processing time in");
            studentIdInput.disabled = false;
        });
    }

    // Function to perform time out  
    function performTimeOut(studentId) {
        // Check if status is INCOMPLETE for confirmation
        fetch("http://localhost:5000/check_attendance_status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_id: studentId })
        })
        .then(response => response.json())
        .then(statusData => {
            if (statusData.success && statusData.status.trim() === "INCOMPLETE") {
                if (!confirm("Status is INCOMPLETE. Timing out will change it to ATTENDED. Proceed?")) {
                    studentIdInput.disabled = false;
                    return;
                }
            }

            // Proceed with time out
            fetch("http://localhost:5000/time_out", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ student_id: studentId })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById("student-timeout").textContent = 'Updating...';
                    
                    fetchAndDisplayTimestamps(studentId);
                    alert("Successfully Timed Out!");
                    setTimeout(resetForm, 3000);
                } else {
                    alert("Error: Could not record time out.");
                    studentIdInput.disabled = false;
                }
            })
            .catch(error => {
                console.error("Error:", error);
                alert("Error processing time out");
                studentIdInput.disabled = false;
            });
        });
    }

    // Function to fetch and display current timestamps
    function fetchAndDisplayTimestamps(studentId) {
        fetch(`http://localhost:5000/fetch_logs`)
        .then(response => response.json())
        .then(logsData => {
            if (logsData.success) {
                const timeInLog = logsData.logs.find(log => 
                    log.dstudentnumber === studentId && 
                    log.ttimein !== null
                );
                const timeOutLog = logsData.logs.find(log => 
                    log.dstudentnumber === studentId && 
                    log.ttimeout !== null
                );

                document.getElementById("student-timein").textContent = 
                    timeInLog ? timeInLog.ttimein : '-';
                document.getElementById("student-timeout").textContent = 
                    timeOutLog ? timeOutLog.ttimeout : '-';

                console.log(`Timestamps updated - In: ${timeInLog ? timeInLog.ttimein : 'None'}, Out: ${timeOutLog ? timeOutLog.ttimeout : 'None'}`);
            }
        })
        .catch(error => {
            console.error("Error fetching timestamps:", error);
        });
    }

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
                // Show loading indicator
                document.getElementById("student-timein").textContent = 'Updating...';
                
                // Fetch the latest timestamp from database
                fetch(`http://localhost:5000/fetch_logs`)
                    .then(response => response.json())
                    .then(logsData => {
                        if (logsData.success) {
                            const timeInLog = logsData.logs.find(log => 
                                log.dstudentnumber === studentId && 
                                log.ttimein !== null
                            );
                            const timestamp = timeInLog ? timeInLog.ttimein : '-';
                            document.getElementById("student-timein").textContent = timestamp;
                            
                            // Update button states - show time out button
                            timeInBtn.style.display = "none";
                            timeOutBtn.style.display = "block";
                            clearEntry.setAttribute("data-action", "clear");
                            
                            console.log(`Time In recorded: ${timestamp}`);
                        } else {
                            document.getElementById("student-timein").textContent = '-';
                        }
                    })
                    .catch(error => {
                        console.error("Error fetching updated logs:", error);
                        document.getElementById("student-timein").textContent = '-';
                    });
                
                alert("Successfully Timed In!");
                // Give user time to see the updated timestamp
                setTimeout(resetForm, 3000);
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
                // Show loading indicator
                document.getElementById("student-timeout").textContent = 'Updating...';
                
                // Fetch the latest timestamp from database
                fetch(`http://localhost:5000/fetch_logs`)
                    .then(response => response.json())
                    .then(logsData => {
                        if (logsData.success) {
                            const timeOutLog = logsData.logs.find(log => 
                                log.dstudentnumber === studentId && 
                                log.ttimeout !== null
                            );
                            const timestamp = timeOutLog ? timeOutLog.ttimeout : '-';
                            document.getElementById("student-timeout").textContent = timestamp;
                            
                            // Update button states - hide time out button
                            timeOutBtn.style.display = "none";
                            clearEntry.style.display = "none";
                            
                            console.log(`Time Out recorded: ${timestamp}`);
                        } else {
                            document.getElementById("student-timeout").textContent = '-';
                        }
                    })
                    .catch(error => {
                        console.error("Error fetching updated logs:", error);
                        document.getElementById("student-timeout").textContent = '-';
                    });
                
                alert("Successfully Timed Out!");
                // Give user time to see the updated timestamp
                setTimeout(resetForm, 3000);
            } else {
                alert("Error: Could not update attendance.");
            }
        })
        .catch(error => console.error("Error:", error));
    }
});
