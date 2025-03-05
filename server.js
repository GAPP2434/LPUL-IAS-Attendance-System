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

    const sql = "SELECT dname, dcourse, dyearlevel FROM db_attendance.tbl_students WHERE dstudentnumber = ?";
    db.query(sql, [student_id], (err, result) => {
        if (err) {
            console.error("Query Error:", err);
            return res.json({ success: false, message: "Database error" });
        }
        if (result.length > 0) {
            const student = result[0];
            res.json({
                success: true,
                name: student.dname,
                course: student.dcourse,
                year_level: student.dyearlevel
            });
        } else {
            res.json({ success: false, message: "Student not found" });
        }
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
