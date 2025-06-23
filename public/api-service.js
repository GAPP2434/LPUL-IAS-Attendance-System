// API Service Module - Handles all backend requests
// This separates request logic from UI logic

class APIService {
    constructor(baseURL = 'http://localhost:5000') {
        this.baseURL = baseURL;
    }

    // Generic request method with error handling
    async makeRequest(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            };

            console.log(`API Request: ${options.method || 'GET'} ${endpoint}`);
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`API Response:`, data);
            return data;
        } catch (error) {
            console.error(`API Error for ${endpoint}:`, error);
            throw error;
        }
    }

    // Student-related requests
    async fetchStudent(studentId) {
        return this.makeRequest('/fetch_student', {
            method: 'POST',
            body: JSON.stringify({ student_id: studentId })
        });
    }

    async checkAttendanceStatus(studentId) {
        return this.makeRequest('/check_attendance_status', {
            method: 'POST',
            body: JSON.stringify({ student_id: studentId })
        });
    }

    // Time tracking requests
    async timeIn(studentId) {
        return this.makeRequest('/time_in', {
            method: 'POST',
            body: JSON.stringify({ student_id: studentId })
        });
    }

    async timeOut(studentId) {
        return this.makeRequest('/time_out', {
            method: 'POST',
            body: JSON.stringify({ student_id: studentId })
        });
    }

    // Data fetching requests
    async fetchLogs() {
        return this.makeRequest('/fetch_logs', {
            method: 'GET'
        });
    }

    async clearEntry(studentId) {
        return this.makeRequest('/clear_entry', {
            method: 'POST',
            body: JSON.stringify({ student_id: studentId })
        });
    }

    // Combined request methods for complex operations
    async getStudentWithLogs(studentId) {
        try {
            // Execute requests in sequence
            const studentData = await this.fetchStudent(studentId);
            if (!studentData.success) {
                return studentData;
            }

            const [logsData, statusData] = await Promise.all([
                this.fetchLogs(),
                this.checkAttendanceStatus(studentId)
            ]);

            // Find student's log entries
            const studentLogs = logsData.success ? 
                logsData.logs.filter(log => log.dstudentnumber === studentId) : [];
            
            const timeInLog = studentLogs.find(log => log.ttimein !== null);
            const timeOutLog = studentLogs.find(log => log.ttimeout !== null);

            return {
                success: true,
                student: studentData,
                timeIn: timeInLog ? timeInLog.ttimein : null,
                timeOut: timeOutLog ? timeOutLog.ttimeout : null,
                status: statusData.success ? statusData.status : 'UNKNOWN',
                logs: studentLogs
            };
        } catch (error) {
            return {
                success: false,
                message: 'Failed to fetch complete student data',
                error: error.message
            };
        }
    }

    async processTimeIn(studentId) {
        try {
            // Execute time in
            const timeInResult = await this.timeIn(studentId);
            if (!timeInResult.success) {
                return timeInResult;
            }

            // Get updated logs to return fresh timestamp
            const logsData = await this.fetchLogs();
            const studentLog = logsData.logs?.find(log => 
                log.dstudentnumber === studentId && log.ttimein !== null
            );

            return {
                success: true,
                message: timeInResult.message,
                timeIn: studentLog ? studentLog.ttimein : null
            };
        } catch (error) {
            return {
                success: false,
                message: 'Failed to process time in',
                error: error.message
            };
        }
    }

    async processTimeOut(studentId) {
        try {
            // Check status first
            const statusData = await this.checkAttendanceStatus(studentId);
            if (!statusData.success) {
                return {
                    success: false,
                    message: 'Could not check attendance status'
                };
            }

            // Return status info for confirmation if needed
            if (statusData.status === 'INCOMPLETE') {
                return {
                    success: true,
                    requiresConfirmation: true,
                    status: statusData.status,
                    message: 'Status is INCOMPLETE - confirmation needed'
                };
            }

            // Execute time out
            const timeOutResult = await this.timeOut(studentId);
            if (!timeOutResult.success) {
                return timeOutResult;
            }

            // Get updated logs
            const logsData = await this.fetchLogs();
            const studentLog = logsData.logs?.find(log => 
                log.dstudentnumber === studentId && log.ttimeout !== null
            );

            return {
                success: true,
                message: timeOutResult.message,
                timeOut: studentLog ? studentLog.ttimeout : null
            };
        } catch (error) {
            return {
                success: false,
                message: 'Failed to process time out',
                error: error.message
            };
        }
    }

    // Force time out (after confirmation)
    async forceTimeOut(studentId) {
        try {
            const timeOutResult = await this.timeOut(studentId);
            if (!timeOutResult.success) {
                return timeOutResult;
            }

            const logsData = await this.fetchLogs();
            const studentLog = logsData.logs?.find(log => 
                log.dstudentnumber === studentId && log.ttimeout !== null
            );

            return {
                success: true,
                message: timeOutResult.message,
                timeOut: studentLog ? studentLog.ttimeout : null
            };
        } catch (error) {
            return {
                success: false,
                message: 'Failed to force time out',
                error: error.message
            };
        }
    }
}

// Export for use in other scripts
window.APIService = APIService; 