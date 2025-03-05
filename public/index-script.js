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

                // Fetch student attendance status
                fetch("http://localhost:5000/check_attendance_status", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ student_id: studentId })
                })
                .then(response => response.json())
                .then(attendanceData => {
                    if (attendanceData.success) {
                        if (attendanceData.status === "ABSENT") {
                            timeOutBtn.style.display = "none";
                            timeOutBtn.classList.remove("hidden");
                            clearEntry.classList.remove("hidden");
                            clearEntry.style.display = "block"; 
                        } else {
                            timeOutBtn.style.display = "block";
                            timeOutBtn.classList.add("hidden");
                            clearEntry.classList.add("hidden");
                            clearEntry.style.display = "none"; 
                        }
                        if (attendanceData.status === "ONGOING") {
                            timeInBtn.classList.remove("hidden");
                            timeInBtn.style.display = "none";
                        } else {
                            timeInBtn.style.display = "block";
                            timeInBtn.classList.add("hidden");
                        }
                        if (attendanceData.status === "ATTENDED") {
                            alert("Student Already Attended!");
                            timeInBtn.classList.remove("hidden");
                            timeInBtn.style.display = "none";
                            timeOutBtn.style.display = "none";
                            timeOutBtn.classList.remove("hidden");

                            document.getElementById("student-name").textContent = "";
                            document.getElementById("student-course").textContent = "";
                            studentIdInput.value = "";
                            submitBtn.style.display = "block";

                        } else {

                        }
                    }
                });

                submitBtn.style.display = "none"; 

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
                alert("Successfully Timed In!");
                
                setTimeout(() => {
                    document.getElementById("player-number").textContent = "";
                    document.getElementById("student-name").textContent = "";
                    document.getElementById("student-course").textContent = "";
                    studentIdInput.value = "";

                    timeInBtn.style.display = "none";
                    timeInBtn.classList.add("hidden");
                    timeOutBtn.classList.add("hidden");
                    submitBtn.style.display = "block"; // Show submit button
                    clearEntry.style.display = "none"; 
                }, 1000);
            } else {
                alert("Error: Could not update attendance.");
            }
        })
        .catch(error => console.error("Error:", error));
    });

    // Time out Button Click
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
                alert("Successfully Timed Out!");
                
                setTimeout(() => {
                    document.getElementById("player-number").textContent = "";
                    document.getElementById("student-name").textContent = "";
                    document.getElementById("student-course").textContent = "";
                    studentIdInput.value = "";
                    timeOutBtn.style.display = "none";
                    
                    timeInBtn.classList.add("hidden");
                    timeOutBtn.classList.add("hidden");
                    submitBtn.style.display = "block"; // Show submit button
                }, 1000);
            } else {
                alert("Error: Could not update attendance.");
            }
        })
        .catch(error => console.error("Error:", error));
    });
    
    // Clear Entry button click
    clearEntry.addEventListener("click", () => {
        const studentId = studentIdInput.value.trim();

        fetch("http://localhost:5000/clear_entry", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_id: studentId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById("player-number").textContent = "";
                document.getElementById("student-name").textContent = "";
                document.getElementById("student-course").textContent = "";
                studentIdInput.value = "";
                
                timeInBtn.classList.add("hidden");
                timeOutBtn.classList.add("hidden");

                timeInBtn.style.display = "none"; 
                clearEntry.style.display = "none"; 
                submitBtn.style.display = "block";
            } else {
                alert("Error: Could not clear entry.");
            }
        })
        .catch(error => console.error("Error:", error));
    });

    
});
