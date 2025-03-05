require("dotenv").config(); // Load environment variables
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());  // Enable CORS
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// MySQL Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "yourpassword",
    database: process.env.DB_NAME || "yourdatabase"
});

db.connect(err => {
    if (err) {
        console.error("Database connection failed:", err);
        return;
    }
    console.log("Connected to MySQL Database!");
});

// API Route to Fetch Student Data
app.post("/fetch_student", (req, res) => {
    const { student_id } = req.body;
    if (!student_id) return res.json({ success: false, message: "Student ID required" });

    // Query to fetch student details
    const studentSql = `
        SELECT s.dname, s.dcourse, s.dyearlevel, a.id AS attendance_id 
        FROM db_attendance.tbl_students s
        LEFT JOIN db_attendance.tbl_attendancestatus a ON s.dstudentnumber = a.dstudentnumber
        WHERE s.dstudentnumber = ?
    `;

    db.query(studentSql, [student_id], (err, result) => {
        if (err) {
            console.error("Query Error (studentSql):", err);
            return res.json({ success: false, message: "Database error" });
        }

        if (result.length === 0) {
            return res.json({ success: false, message: "Student not found" });
        }

        let student = result[0];

        if (student.attendance_id) {
            // Student already has an ID, return their details
            return res.json({
                success: true,
                name: student.dname,
                course: student.dcourse,
                year_level: student.dyearlevel,
                attendance_id: student.attendance_id
            });
        }

        // If student does not have an ID, generate one
        const getMaxIdSql = "SELECT MAX(id) AS maxId FROM db_attendance.tbl_attendancestatus";

        db.query(getMaxIdSql, (err, result) => {
            if (err) {
                console.error("Query Error (getMaxIdSql):", err);
                return res.json({ success: false, message: "Database error" });
            }

            let newId = 1; // Default to 1 if no records exist
            if (result[0].maxId !== null) {
                newId = result[0].maxId + 1; // Increment highest ID by 1
            }

            // Insert or update the student's attendance record
            const updateAttendanceSql = `
                INSERT INTO db_attendance.tbl_attendancestatus (id, dstudentnumber)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE id = VALUES(id)
            `;

            db.query(updateAttendanceSql, [newId, student_id], (err) => {
                if (err) {
                    console.error("Query Error (updateAttendanceSql):", err);
                    return res.json({ success: false, message: "Database error" });
                }

                res.json({
                    success: true,
                    name: student.dname,
                    course: student.dcourse,
                    year_level: student.dyearlevel,
                    attendance_id: newId // Return the newly assigned ID
                });
            });
        });
    });
});


// API Route to Fetch Log Data
app.get("/fetch_logs", (req, res) => {
    const sql = `
        SELECT l.dstudentnumber, s.dname, s.dcourse, s.dyearlevel, s.demail, l.ttimestamp, l.dattendance, a.dattendancestatus
        FROM db_attendance.tbl_logs l
        JOIN db_attendance.tbl_students s ON l.dstudentnumber = s.dstudentnumber
        JOIN db_attendance.tbl_attendancestatus a ON l.dstudentnumber = a.dstudentnumber
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Query Error:", err);
            return res.json({ success: false, message: "Database error" });
        }
        res.json({ success: true, logs: results });
    });
});

// Serve index.html for all unknown routes (SPA support)
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

app.post("/check_attendance_status", (req, res) => {
    const { student_id } = req.body;
    const sql = "SELECT * FROM db_attendance.tbl_attendancestatus WHERE dstudentnumber = ?";
    
    db.query(sql, [student_id], (err, result) => {
        if (err) {
            console.error("Query Error:", err);
            return res.json({ success: false, message: "Database error" });
        }
        if (result.length > 0) {
            res.json({ success: true, status: result[0].dattendancestatus });
        } else {
            res.json({ success: false, message: "No attendance record found" });
        }
    });
});

app.post("/time_in", (req, res) => {
    const { student_id } = req.body;
    const sql = "UPDATE db_attendance.tbl_attendancestatus SET dattendancestatus = 'ONGOING' WHERE dstudentnumber = ?";

    db.query(sql, [student_id], (err, result) => {
        if (err) {
            console.error("Query Error:", err);
            return res.json({ success: false, message: "Database error" });
        }
        res.json({ success: true, message: "Time in recorded" });
    });
});

app.post("/time_out", (req, res) => {
    const { student_id } = req.body;
    const sql = "UPDATE db_attendance.tbl_attendancestatus SET dattendancestatus = 'ATTENDED' WHERE dstudentnumber = ?";

    db.query(sql, [student_id], (err, result) => {
        if (err) {
            console.error("Query Error:", err);
            return res.json({ success: false, message: "Database error" });
        }
        res.json({ success: true, message: "Time in recorded" });
    });
});

app.post("/change_status", (req, res) => {
    const sql = "UPDATE db_attendance.tbl_attendancestatus SET dattendancestatus = 'ABSENT' WHERE dattendancestatus = 'ONGOING'";

    db.query(sql, (err, result) => {
        if (err) {
            console.error("Query Error:", err);
            return res.json({ success: false, message: "Database error" });
        }

        if (result.affectedRows === 0) {
            return res.json({ success: false, message: "No records updated. No ongoing attendance found." });
        }

        res.json({ success: true, message: `${result.affectedRows} records updated to ABSENT` });
    });
});

app.post("/clear_status", (req, res) => {
    const sql = "UPDATE db_attendance.tbl_attendancestatus SET dattendancestatus = 'ABSENT', ID = NULL";

    db.query(sql, (err, result) => {
        if (err) {
            console.error("Query Error:", err);
            return res.json({ success: false, message: "Database error" });
        }

        if (result.affectedRows === 0) {
            return res.json({ success: false, message: "No records updated. No ongoing attendance found." });
        }

        res.json({ success: true, message: `${result.affectedRows} records updated to ABSENT` });
    });
});

app.post("/clear_entry", (req, res) => {
    const { student_id } = req.body;

    if (!student_id) {
        return res.json({ success: false, message: "Student ID is required" });
    }

    const sql = "UPDATE db_attendance.tbl_attendancestatus SET ID = NULL WHERE dstudentnumber = ?";

    db.query(sql, [student_id], (err, result) => {
        if (err) {
            console.error("Query Error:", err);
            return res.json({ success: false, message: "Database error" });
        }

        res.json({ success: true, message: "Entry cleared successfully" });
    });
});

