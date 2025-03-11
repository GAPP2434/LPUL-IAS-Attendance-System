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
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
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

// Fetch Student Data
app.post("/fetch_student", (req, res) => {
    const { student_id } = req.body;
    if (!student_id) return res.json({ success: false, message: "Student ID required" });

    // First, get the next available ID
    const getNextIdSql = `
        SELECT COALESCE(MAX(ID), 0) + 1 as nextId 
        FROM db_attendance.tbl_attendancestatus 
        WHERE ID IS NOT NULL
    `;

    db.query(getNextIdSql, (err, nextIdResult) => {
        if (err) {
            console.error("Query Error (getNextIdSql):", err);
            return res.json({ success: false, message: "Database error" });
        }

        const nextId = nextIdResult[0].nextId;

        // Check if we need to insert a new log entry
        const checkExistingSql = `
            SELECT 1 FROM db_attendance.tbl_attendancestatus 
            WHERE dstudentnumber = ? AND ID IS NOT NULL
        `;

        db.query(checkExistingSql, [student_id], (err, existingResult) => {
            if (err) {
                console.error("Query Error (checkExistingSql):", err);
                return res.json({ success: false, message: "Database error" });
            }

            // If no existing entry, insert new log
            if (existingResult.length === 0) {
                const insertLogSql = `
                    INSERT INTO db_attendance.tbl_logs (dstudentnumber) 
                    VALUES (?)
                `;

                db.query(insertLogSql, [student_id], (err) => {
                    if (err) {
                        console.error("Query Error (insertLogSql):", err);
                        return res.json({ success: false, message: "Database error" });
                    }

                    // Update attendance status with ID
                    const updateStatusSql = `
                        UPDATE db_attendance.tbl_attendancestatus 
                        SET ID = ?
                        WHERE dstudentnumber = ? AND ID IS NULL
                    `;

                    db.query(updateStatusSql, [nextId, student_id], (err) => {
                        if (err) {
                            console.error("Query Error (updateStatusSql):", err);
                            return res.json({ success: false, message: "Database error" });
                        }

                        fetchStudentInfo();
                    });
                });
            } else {
                fetchStudentInfo();
            }
        });
    });

    function fetchStudentInfo() {
        const getStudentSql = `
            SELECT s.dname, s.dcourse, s.dyearlevel, a.ID as attendance_id
            FROM db_attendance.tbl_students s
            JOIN db_attendance.tbl_attendancestatus a ON s.dstudentnumber = a.dstudentnumber
            WHERE s.dstudentnumber = ?
        `;

        db.query(getStudentSql, [student_id], (err, studentResult) => {
            if (err) {
                console.error("Query Error (getStudentSql):", err);
                return res.json({ success: false, message: "Database error" });
            }

            if (studentResult.length === 0) {
                return res.json({ success: false, message: "Student not found" });
            }

            res.json({
                success: true,
                name: studentResult[0].dname,
                course: studentResult[0].dcourse,
                year_level: studentResult[0].dyearlevel,
                attendance_id: studentResult[0].attendance_id
            });
        });
    }
});

// API Route to Fetch Log Data
app.get("/fetch_logs", (req, res) => {
    db.query("SET time_zone = '+08:00'", (err) => {
        if (err) {
            console.error("Error setting timezone:", err);
            return res.json({ success: false, message: "Database error" });
        }

        const sql = `
        SELECT
            CASE 
                WHEN a.ID IS NULL THEN '-'
                ELSE LPAD(a.ID, 3, '0') 
            END AS PlayerNumber,
            s.dstudentnumber,
            s.dname,
            s.dcourse,
            s.dyearlevel,
            s.demail,
            DATE_FORMAT(l.ttimein, '%Y-%m-%d %H:%i') AS ttimein,
            DATE_FORMAT(l.ttimeout, '%Y-%m-%d %H:%i') AS ttimeout,
            COALESCE(a.dattendancestatus, 'ABSENT') AS dattendancestatus
        FROM ${process.env.DB_NAME}.tbl_students s
        LEFT JOIN ${process.env.DB_NAME}.tbl_logs l ON s.dstudentnumber = l.dstudentnumber
        LEFT JOIN ${process.env.DB_NAME}.tbl_attendancestatus a ON s.dstudentnumber = a.dstudentnumber
        ORDER BY 
            CASE WHEN a.ID IS NULL THEN 999999 ELSE a.ID END ASC, 
            s.dname ASC
        `;


        db.query(sql, (err, results) => {
            if (err) {
                console.error("Query Error:", err);
                return res.json({ success: false, message: "Database error" });
            }
            res.json({ success: true, logs: results });
        });
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

// Time In/Out Handler
function handleTimeAction(req, res, action) {
    const { student_id } = req.body;
    const isTimeIn = action === 'in';
    
    const sql = `
        SET time_zone = '+08:00';
        UPDATE db_attendance.tbl_logs
        SET ${isTimeIn ? 'ttimein' : 'ttimeout'} = NOW()
        WHERE dstudentnumber = ? 
        ${isTimeIn ? '' : 'AND ttimein IS NOT NULL AND ttimeout IS NULL'}
        ORDER BY dlogid DESC LIMIT 1;

        UPDATE db_attendance.tbl_attendancestatus
        SET dattendancestatus = ?
        WHERE dstudentnumber = ?;
    `;

    db.query(sql, [
        student_id, 
        isTimeIn ? 'ONGOING' : 'ATTENDED',
        student_id
    ], (err, result) => {
        if (err) {
            console.error(`Query Error (time_${action}):`, err);
            return res.json({ success: false, message: "Database error" });
        }
        res.json({ 
            success: true, 
            message: `Time ${action} recorded and status updated to ${isTimeIn ? 'ONGOING' : 'ATTENDED'}` 
        });
    });
}

app.post("/time_in", (req, res) => handleTimeAction(req, res, 'in'));
app.post("/time_out", (req, res) => handleTimeAction(req, res, 'out'));

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
    
                // Load and embed the custom font
                const fontBytes = fs.readFileSync(path.join(__dirname, 'public/fonts/Tempting.ttf'));
                const customFont = await newPdfDoc.embedFont(fontBytes);
    
                const pages = newPdfDoc.getPages();
                const firstPage = pages[0];
                const { width, height } = firstPage.getSize();
    
                // Fix specific name issue
                let displayName = dname;
                if (dname === "Gabriel Dominic K. Altea") {
                    displayName = "Gabriel Dominic K. Altea";
                }
    
                // Updated font size to 40 and recalculated center position
                const fontSize = 40;
                const textWidth = customFont.widthOfTextAtSize(displayName, fontSize);
                const textX = (width - textWidth) / 2;
    
                // Draw the centered text with updated font size
                firstPage.drawText(displayName, {
                    x: textX,
                    y: height / 2, // Adjust this value to move the text up or down
                    size: fontSize,
                    font: customFont,
                    color: rgb(0, 0, 0) // Set color to black
                });

                const newPdfBytes = await newPdfDoc.save();
                const newPdfPath = `uploads/${dstudentnumber}.pdf`;
                fs.writeFileSync(newPdfPath, newPdfBytes);

                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: demail,
                    subject: "Certificate of Participation to the Seminar entitled “Squid Game: Cyber Edition – Don’t Let Your Data Get Eliminated”",
                    text: `Dear ${dname},\n\nThank you for participating in todays seminar. Don't forget to answer the feedback form if you haven't already. Here is your attendance certificate and thank you again for your participation.\n\nBest regards,\nIAS Seminar Team`,
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