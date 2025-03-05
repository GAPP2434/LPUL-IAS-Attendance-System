document.addEventListener("DOMContentLoaded", () => {
    let selectedCourse = null;
    let selectedYear = null;
    let selectedStatus = null;

    // Fetch logs on page load
    fetch("http://localhost:5000/fetch_logs")
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tableBody = document.getElementById("log-table-body");
                data.logs.forEach(log => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${log.dstudentnumber}</td>
                        <td>${log.dname}</td>
                        <td>${log.dcourse}</td>
                        <td>${log.dyearlevel}</td>
                        <td>${log.demail}</td>
                        <td>${log.ttimestamp}</td>
                        <td>${log.dattendance}</td>
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
});

// Combined filtering function
function filterTable(selectedCourse, selectedYear, selectedStatus) {
    const tableBody = document.getElementById("log-table-body");
    const rows = tableBody.getElementsByTagName("tr");
    for (let i = 0; i < rows.length; i++) {
        const courseCell = rows[i].getElementsByTagName("td")[2];
        const yearCell = rows[i].getElementsByTagName("td")[3];
        const statusCell = rows[i].getElementsByTagName("td")[7];
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
    const wb = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });

    // Generate filename based on selected filters
    let filename = "IAS-Seminar";
    if (selectedCourse) {
        filename += `-${selectedCourse}`;
    }
    if (selectedYear) {
        filename += `-${selectedYear.replace(" ", "")}`;
    }
    if (selectedStatus && selectedStatus !== "ONGOING") {
        filename += `-${selectedStatus}`;
    }
    filename += "-Attendance-Logs.xlsx";

    XLSX.writeFile(wb, filename);
}