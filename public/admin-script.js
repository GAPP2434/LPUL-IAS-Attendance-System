document.addEventListener("DOMContentLoaded", () => {
    let selectedCourse = null;
    let selectedYear = null;
    let selectedStatus = null;
    const changeStatusBtn = document.getElementById("change-status");
    const clearStatusBtn = document.getElementById("clear-status");

    // Fetch logs on page load
    fetch("http://localhost:5000/fetch_logs")
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tableBody = document.getElementById("log-table-body");
                data.logs.forEach(log => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${log.PlayerNumber || '-'}</td>
                        <td>${log.dstudentnumber}</td>
                        <td>${log.dname}</td>
                        <td>${log.dcourse}</td>
                        <td>${log.dyearlevel}</td>
                        <td>${log.demail}</td>
                        <td>${log.ttimein || '-'}</td>
                        <td>${log.ttimeout || '-'}</td>
                        <td>${log.dattendancestatus}</td>
                    `;
                    tableBody.appendChild(row);
                });

                // Add event listeners for course filter options
                document.querySelectorAll(".course-option").forEach(option => {
                    option.addEventListener("click", (event) => {
                        event.preventDefault();
                        selectedCourse = option.getAttribute("data-course");
                        document.getElementById("course-filter-text").textContent = selectedCourse || "By Course";
                        filterTable(selectedCourse, selectedYear, selectedStatus);
                    });
                });

                // Add event listeners for year filter options
                document.querySelectorAll(".year-option").forEach(option => {
                    option.addEventListener("click", (event) => {
                        event.preventDefault();
                        selectedYear = option.getAttribute("data-year");
                        document.getElementById("year-filter-text").textContent = selectedYear || "By Year";
                        filterTable(selectedCourse, selectedYear, selectedStatus);
                    });
                });

                // Add event listeners for status filter options
                document.querySelectorAll(".status-option").forEach(option => {
                    option.addEventListener("click", (event) => {
                        event.preventDefault();
                        selectedStatus = option.getAttribute("data-status");
                        document.getElementById("status-filter-text").textContent = selectedStatus || "By Status";
                        filterTable(selectedCourse, selectedYear, selectedStatus);
                    });
                });

                // Add event listener for export button
                document.querySelector(".export-btn").addEventListener("click", () => {
                    exportTableToExcel("log-table-body", selectedCourse, selectedYear, selectedStatus);
                });

                // Initial count update
                updateTotalCount();
            } else {
                alert("Failed to fetch logs");
            }
        })
        .catch(error => console.error("Error:", error));

function getPasswordInput(message, callback) {

    const dialog = document.createElement("dialog");
    dialog.style.padding = "20px";
    dialog.style.border = "none";
    dialog.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
    dialog.style.borderRadius = "8px";
    dialog.style.textAlign = "center";
    dialog.innerHTML = `
        <p style="margin-bottom: 0px;">${message}</p>
        <input type="password" id="passwordInput" style="width: 90%; padding: 8px; margin: 10px 0; border: 1px solid #ccc; border-radius: 5px;">
        <br>
        <button id="confirmBtn" style="margin-right: 10px; padding: 8px 12px; border: none; background-color: #28a745; color: white; border-radius: 5px; cursor: pointer;">Confirm</button>
        <button id="cancelBtn" style="padding: 8px 12px; border: none; background-color: #dc3545; color: white; border-radius: 5px; cursor: pointer;">Cancel</button>
    `;

    document.body.appendChild(dialog);
    dialog.showModal();

    const passwordInput = document.getElementById("passwordInput");
    const confirmBtn = document.getElementById("confirmBtn");
    const cancelBtn = document.getElementById("cancelBtn");

    function submitPassword() {
        const password = passwordInput.value;
        dialog.close();
        document.body.removeChild(dialog);
        callback(password);
    }

    confirmBtn.addEventListener("click", submitPassword);

    passwordInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault(); 
            submitPassword();
        }
    });

    cancelBtn.addEventListener("click", () => {
        dialog.close();
        document.body.removeChild(dialog);
        callback(null);
    });

    passwordInput.focus();
}

changeStatusBtn.addEventListener("click", () => {
    getPasswordInput("Enter password to confirm updating attendance status to ABSENT:", (password) => {
        if (password === null) return; 

        if (password === "BSIT3-1") {
            fetch("http://localhost:5000/change_status", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert("Attendance status updated to ABSENT from ONGOING.");
                } else {
                    alert("There are no ONGOING attendance.");
                }
            })
            .catch(error => {
                console.error("Error:", error);
                alert("Something went wrong. Please try again.");
            });
        } else {
            alert("Invalid password.");
        }
    });
});

clearStatusBtn.addEventListener("click", () => {
    getPasswordInput("Enter password to confirm clearing all attendance records:", (password) => {
        if (password === null) return;

        if (password === "BSIT3-1") { 
            fetch("http://localhost:5000/clear_status", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert("All attendance records have been successfully cleared.");
                } else {
                    alert("Error: Could not clear attendance status.");
                }
            })
            .catch(error => {
                console.error("Error:", error);
                alert("Something went wrong. Please try again.");
            });
        } else {
            alert("Invalid password.");
        }
    });
});

        
});

// Combined filtering function
function filterTable(selectedCourse, selectedYear, selectedStatus) {
    const tableBody = document.getElementById("log-table-body");
    const rows = tableBody.getElementsByTagName("tr");
    for (let i = 0; i < rows.length; i++) {
        const courseCell = rows[i].getElementsByTagName("td")[3];  // Course is now in 4th column
        const yearCell = rows[i].getElementsByTagName("td")[4];    // Year is now in 5th column
        const statusCell = rows[i].getElementsByTagName("td")[8];  // Status is now in 9th column
        let courseMatch = !selectedCourse || (courseCell && courseCell.textContent === selectedCourse);
        let yearMatch = !selectedYear || (yearCell && yearCell.textContent.toLowerCase() === selectedYear.toLowerCase());
        let statusMatch = !selectedStatus || (statusCell && statusCell.textContent === selectedStatus);
        if (courseMatch && yearMatch && statusMatch) {
            rows[i].style.display = "";
        } else {
            rows[i].style.display = "none";
        }
    }
    updateTotalCount();
}

// Function to update the total count of visible rows
function updateTotalCount() {
    const tableBody = document.getElementById("log-table-body");
    const rows = tableBody.getElementsByTagName("tr");
    let visibleCount = 0;
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].style.display !== "none") {
            visibleCount++;
        }
    }
    const attendanceText = visibleCount === 1 ? "Total: 1 Attendee" : `Total: ${visibleCount} Attendees`;
    document.getElementById("attendance").textContent = attendanceText;
}

// Function to export table data to Excel
function exportTableToExcel(tableId, selectedCourse, selectedYear, selectedStatus) {
    const table = document.getElementById(tableId);
    const headerRow = document.querySelector("thead tr");
    const headers = Array.from(headerRow.cells).map(cell => cell.textContent);
    
    // Get visible rows only
    const visibleRows = Array.from(table.rows).filter(row => 
        row.style.display !== "none"
    );

    // Create worksheet data with headers
    const wsData = [headers];

    // Add visible row data
    visibleRows.forEach(row => {
        const rowData = Array.from(row.cells).map(cell => cell.textContent);
        wsData.push(rowData);
    });

    // Create worksheet and workbook
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    // Generate filename based on selected filters
    let filename = "IAS-Seminar";
    if (selectedCourse) {
        filename += `-${selectedCourse}`;
    }
    if (selectedYear) {
        filename += `-${selectedYear.replace(" ", "")}`;
    }
    if (selectedStatus) {
        filename += `-${selectedStatus}`;
    }
    filename += "-Attendance-Logs.xlsx";

    XLSX.writeFile(wb, filename);
}