"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cl_models_1 = require("cl-models");
exports.default = {
    async activityLogs(ses) {
        return ses.getClassActivityLogs();
    },
    async students(ses) {
        return ses.students || ses.getStudents();
    },
    async roster(ses) {
        const items = await cl_models_1.SeatModel.findAll({
            include: [cl_models_1.StudentModel],
            where: {
                sessionId: ses.id
            }
        });
        const attendances = ses.attendances || (await ses.getAttendances());
        const seats = [];
        for (const item of items) {
            const tagged = attendances.find(at => at.studentId === item.studentId);
            seats.push({
                id: item.sessionId + item.studentId,
                student: item.student,
                addedOn: item.addedOn,
                movedOut: item.movedOut,
                statusCode: tagged ? tagged.statusCode : 0
            });
        }
        return seats;
    }
};
