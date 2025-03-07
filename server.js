require("dotenv").config(); // Load environment variables
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const multer = require("multer");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const nodemailer = require("nodemailer");
const fs = require("fs");

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

// Multer setup for file uploads
const upload = multer({ dest: "uploads/" });

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// API Route to Fetch Student Data
app.post("/fetch_student", (req, res) => {
    const { student_id } = req.body;
    if (!student_id) return res.json({ success: false, message: "Student ID required" });

    // First check if student already has an ID
    const checkIdSql = `
        SELECT ID 
        FROM db_attendance.tbl_attendancestatus 
        WHERE dstudentnumber = ? AND ID IS NOT NULL
    `;

    db.query(checkIdSql, [student_id], (err, checkResult) => {
        if (err) {
            console.error("Query Error (checkIdSql):", err);
            return res.json({ success: false, message: "Database error" });
        }

        if (checkResult.length > 0) {
            // Student already has an ID, fetch their details
            const studentSql = `
                SELECT s.dname, s.dcourse, s.dyearlevel
                FROM db_attendance.tbl_students s
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

                res.json({
                    success: true,
                    name: result[0].dname,
                    course: result[0].dcourse,
                    year_level: result[0].dyearlevel,
                    attendance_id: checkResult[0].ID
                });
            });
        } else {
            // Get the maximum ID and increment by 1
            const getMaxIdSql = `
                SELECT COALESCE(MAX(ID), 0) as maxId 
                FROM db_attendance.tbl_attendancestatus 
                WHERE ID IS NOT NULL
            `;

            db.query(getMaxIdSql, (err, maxResult) => {
                if (err) {
                    console.error("Query Error (getMaxIdSql):", err);
                    return res.json({ success: false, message: "Database error" });
                }

                const nextId = maxResult[0].maxId + 1;

                // Update the ID in tbl_attendancestatus
                const updateStatusIdSql = `
                    UPDATE db_attendance.tbl_attendancestatus
                    SET ID = ?
                    WHERE dstudentnumber = ?
                `;

                db.query(updateStatusIdSql, [nextId, student_id], (err, updateResult) => {
                    if (err) {
                        console.error("Query Error (updateStatusIdSql):", err);
                        return res.json({ success: false, message: "Database error" });
                    }

                    // Fetch student details
                    const studentSql = `
                        SELECT s.dname, s.dcourse, s.dyearlevel
                        FROM db_attendance.tbl_students s
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

                        // Insert into logs
                        const insertLogSql = `
                            INSERT INTO db_attendance.tbl_logs (dstudentnumber)
                            VALUES (?)
                        `;

                        db.query(insertLogSql, [student_id], (err, insertResult) => {
                            if (err) {
                                console.error("Query Error (insertLogSql):", err);
                                return res.json({ success: false, message: "Database error" });
                            }

                            res.json({
                                success: true,
                                name: result[0].dname,
                                course: result[0].dcourse,
                                year_level: result[0].dyearlevel,
                                attendance_id: nextId
                            });
                        });
                    });
                });
            });
        }
    });
});

// API Route to Fetch Log Data
app.get("/fetch_logs", (req, res) => {
    const sql = `
        SELECT 
            a.ID,
            s.dstudentnumber,
            s.dname,
            s.dcourse,
            s.dyearlevel,
            s.demail,
            l.ttimestamp,
            l.dattendance,
            a.dattendancestatus
        FROM db_attendance.tbl_attendancestatus a
        JOIN db_attendance.tbl_students s ON a.dstudentnumber = s.dstudentnumber
        LEFT JOIN db_attendance.tbl_logs l ON s.dstudentnumber = l.dstudentnumber
        ORDER BY a.ID ASC
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

// Time In Button Handler
app.post("/time_in", (req, res) => {
    const { student_id } = req.body;

    // Update the log entry with timestamp and attendance status
    const sql = `
        UPDATE db_attendance.tbl_logs
        SET ttimestamp = NOW(),
            dattendance = 'TIME IN'
        WHERE dstudentnumber = ? AND dattendance IS NULL
    `;

    const updateStatusSql = `
        UPDATE db_attendance.tbl_attendancestatus
        SET dattendancestatus = 'ONGOING'
        WHERE dstudentnumber = ?
    `;

    db.query(sql, [student_id], (err, result) => {
        if (err) {
            console.error("Query Error (time_in):", err);
            return res.json({ success: false, message: "Database error" });
        }

        db.query(updateStatusSql, [student_id], (err, result) => {
            if (err) {
                console.error("Query Error (updateStatusSql):", err);
                return res.json({ success: false, message: "Database error" });
            }

            res.json({ success: true, message: "Time in recorded and status updated to ONGOING" });
        });
    });
});

// Time Out Button Handler
app.post("/time_out", (req, res) => {
    const { student_id } = req.body;
    
    // Insert a new log entry for time out
    const insertSql = `
        INSERT INTO db_attendance.tbl_logs 
        (dstudentnumber, ttimestamp, dattendance)
        VALUES (?, NOW(), 'TIME OUT')
    `;

    const updateStatusSql = `
        UPDATE db_attendance.tbl_attendancestatus
        SET dattendancestatus = 'ATTENDED'
        WHERE dstudentnumber = ?
    `;

    db.query(insertSql, [student_id], (err, result) => {
        if (err) {
            console.error("Query Error:", err);
            return res.json({ success: false, message: "Database error" });
        }
        
        db.query(updateStatusSql, [student_id], (err, result) => {
            if (err) {
                console.error("Query Error (updateStatusSql):", err);
                return res.json({ success: false, message: "Database error" });
            }

            res.json({ success: true, message: "Time out recorded and status updated to ATTENDED" });
        });
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

    // Get the current ID of the entry to be deleted
    const getCurrentIdSql = `
        SELECT ID 
        FROM db_attendance.tbl_attendancestatus 
        WHERE dstudentnumber = ?
    `;

    db.query(getCurrentIdSql, [student_id], (err, result) => {
        if (err) {
            console.error("Query Error (getCurrentIdSql):", err);
            return res.json({ success: false, message: "Database error" });
        }

        if (result.length > 0) {
            const currentId = result[0].ID;

            // Delete the log entry
            const deleteLogSql = `
                DELETE FROM db_attendance.tbl_logs 
                WHERE dstudentnumber = ? AND ttimein IS NULL
            `;

            db.query(deleteLogSql, [student_id], (err, deleteResult) => {
                if (err) {
                    console.error("Query Error (deleteLogSql):", err);
                    return res.json({ success: false, message: "Database error" });
                }

                // Clear the ID for the current student
                const clearIdSql = `
                    UPDATE db_attendance.tbl_attendancestatus
                    SET ID = NULL
                    WHERE dstudentnumber = ?
                `;

                db.query(clearIdSql, [student_id], (err, clearResult) => {
                    if (err) {
                        console.error("Query Error (clearIdSql):", err);
                        return res.json({ success: false, message: "Database error" });
                    }

                    // Decrement all higher IDs
                    const decrementIdsSql = `
                        UPDATE db_attendance.tbl_attendancestatus
                        SET ID = ID - 1
                        WHERE ID > ?
                    `;

                    db.query(decrementIdsSql, [currentId], (err, decrementResult) => {
                        if (err) {
                            console.error("Query Error (decrementIdsSql):", err);
                            return res.json({ success: false, message: "Database error" });
                        }

                        res.json({ success: true, message: "Entry cleared and IDs updated successfully" });
                    });
                });
            });
        } else {
            res.json({ success: false, message: "No entry found to clear" });
        }
    });
});

// API Route to handle PDF upload and email sending
app.post("/upload_pdf", upload.single("pdf"), async (req, res) => {
    const pdfPath = req.file.path;

    const sql = `
        SELECT s.dstudentnumber, s.dname, s.demail
        FROM db_attendance.tbl_attendancestatus a
        JOIN db_attendance.tbl_students s ON a.dstudentnumber = s.dstudentnumber
        WHERE a.dattendancestatus = 'ATTENDED'
    `;

    db.query(sql, async (err, results) => {
        if (err) {
            console.error("Query Error:", err);
            return res.json({ success: false, message: "Database error" });
        }

        try {
            const pdfBytes = fs.readFileSync(pdfPath);
            const pdfDoc = await PDFDocument.load(pdfBytes);

            // Create a new PDF document for each student
            for (const student of results) {
                const { dstudentnumber, dname, demail } = student;

                const newPdfDoc = await PDFDocument.create();
                // Register fontkit with the new document
                newPdfDoc.registerFontkit(fontkit);

                const [templatePage] = await newPdfDoc.copyPages(pdfDoc, [0]);
                newPdfDoc.addPage(templatePage);

                // Load and embed the font for each new document
                const fontBytes = fs.readFileSync(path.join(__dirname, 'public/fonts/Symphony-Regular.ttf'));
                const customFont = await newPdfDoc.embedFont(fontBytes);

                const pages = newPdfDoc.getPages();
                const firstPage = pages[0];
                const { width, height } = firstPage.getSize();

                firstPage.drawText(dname, {
                    x: width / 2 - (dname.length * 6) - 90,
                    y: height / 2,
                    size: 60,
                    font: customFont,
                    color: rgb(0, 0, 0)
                });

                const newPdfBytes = await newPdfDoc.save();
                const newPdfPath = `uploads/${dstudentnumber}.pdf`;
                fs.writeFileSync(newPdfPath, newPdfBytes);

                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: demail,
                    subject: "Your Attendance Certificate",
                    text: `Dear ${dname},\n\nPlease find attached your attendance certificate.\n\nBest regards,\nIAS Seminar Team`,
                    attachments: [
                        {
                            filename: `${dstudentnumber}.pdf`,
                            path: newPdfPath
                        }
                    ]
                };

                await transporter.sendMail(mailOptions);
            }

            res.json({ success: true, message: "PDF uploaded and emails sent successfully." });
        } catch (error) {
            console.error("Error processing PDF:", error);
            res.json({ success: false, message: "Error processing PDF." });
        } finally {
            fs.unlinkSync(pdfPath);
        }
    });
});