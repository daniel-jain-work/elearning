"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEnrollmentsStatus = exports.updateStudentsAttendance = void 0;
const assert = require("assert");
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const sequelize_1 = require("sequelize");
const cloudwatch_1 = require("../../lib/cloudwatch");
const sequelize_2 = require("../../sequelize");
async function updateStudentsAttendance(root, args, ctx) {
    assert.equal(args.statusCodes.length, args.students.length, 'students to update do not match status provided');
    const session = await cl_models_1.SessionModel.findByPk(args.sessionId, {
        rejectOnEmpty: true,
        include: [
            {
                model: cl_models_1.ClassModel,
                include: [cl_models_1.CourseModel, cl_models_1.TeacherModel]
            }
        ]
    });
    ctx.ownerOrInternal(session.class.teacherId);
    const statusMap = args.students.reduce((all, sid, idx) => {
        all[sid] = args.statusCodes[idx];
        return all;
    }, {});
    // ORDER is not guaranteed
    const students = await cl_models_1.StudentModel.findAll({
        where: {
            id: {
                [sequelize_1.Op.in]: args.students
            }
        }
    });
    const seats = [];
    const attendanceUpdates = students.map(s => {
        const statusCode = statusMap[s.id] || 0;
        ctx.logger.info({
            userId: s.parentId,
            classId: session.classId,
            mutation: 'updateStudentsAttendance'
        }, '%s changed status to %d', s.name, statusCode);
        seats.push({
            id: session.id + s.id,
            student: s,
            statusCode
        });
        return {
            sessionId: session.id,
            studentId: s.id,
            statusCode
        };
    });
    await cl_models_1.AttendanceModel.bulkCreate(attendanceUpdates, {
        updateOnDuplicate: ['statusCode', 'updatedAt']
    });
    await cl_models_1.ClassActivityLogModel.create({
        sessionId: session.id,
        type: cl_models_1.ClassActivityType.TeacherTagAttendance,
        details: {
            identity: ctx.identity,
            statusMap
        }
    });
    return seats;
}
exports.updateStudentsAttendance = updateStudentsAttendance;
async function updateEnrollmentsStatus(root, args, ctx) {
    assert.equal(args.statusCodes.length, args.students.length, 'students to update do not match status provided');
    const klass = await cl_models_1.ClassModel.findByPk(args.classId, {
        rejectOnEmpty: true,
        include: [cl_models_1.CourseModel]
    });
    ctx.ownerOrInternal(klass.teacherId);
    const statusMap = args.students.reduce((all, sid, idx) => {
        all[sid] = args.statusCodes[idx];
        return all;
    }, {});
    // ORDER is not guaranteed
    const enrollments = await cl_models_1.EnrollmentModel.findAll({
        where: {
            classId: klass.id,
            studentId: {
                [sequelize_1.Op.in]: args.students
            }
        },
        include: [
            {
                model: cl_models_1.StudentModel,
                required: true
            }
        ]
    });
    const attendedStudents = [];
    const firstTimers = new Map();
    const attendanceUpdates = [];
    const statusUpdates = enrollments.map(er => {
        const statusCode = statusMap[er.studentId] || 0;
        const oldStatusCode = er.statusCode;
        ctx.logger.info({ classId: klass.id, userId: er.student.parentId }, '%s changed status from %d to %d', er.student.name, oldStatusCode, statusCode);
        er.set('statusCode', statusCode);
        if (statusCode > 0) {
            attendedStudents.push(er.student);
            if (!er.student.parent.attended) {
                firstTimers.set(er.student.parentId, er.student.parent);
            }
        }
        klass.sessions.forEach(ses => {
            attendanceUpdates.push({
                sessionId: ses.id,
                studentId: er.student.id,
                statusCode
            });
        });
        return {
            id: er.id,
            statusCode
        };
    });
    // bulk update status once
    const tx = await sequelize_2.default.transaction();
    try {
        await cl_models_1.EnrollmentModel.bulkCreate(statusUpdates, {
            updateOnDuplicate: ['statusCode', 'updatedAt'],
            transaction: tx
        });
        await cl_models_1.AttendanceModel.bulkCreate(attendanceUpdates, {
            updateOnDuplicate: ['statusCode', 'updatedAt'],
            transaction: tx
        });
        if (firstTimers.size > 0) {
            const userIds = [];
            const creditsToCreate = [];
            for (const user of firstTimers.values()) {
                userIds.push(user.id);
                if (user.refererId) {
                    creditsToCreate.push({
                        userId: user.refererId,
                        cents: cl_common_1.ReferralCredits.attendance,
                        type: cl_common_1.CreditType.Referral,
                        details: {
                            reason: `${user.firstName} has attended ${klass.course.name}`,
                            createdBy: 'firstTrial',
                            attribution: {
                                userId: user.id,
                                classId: klass.id,
                                courseId: klass.courseId
                            }
                        }
                    });
                }
            }
            await cl_models_1.UserModel.update({ attended: true }, {
                transaction: tx,
                where: {
                    id: {
                        [sequelize_1.Op.in]: userIds
                    }
                }
            });
            if (creditsToCreate.length > 0) {
                await cl_models_1.CreditModel.bulkCreate(creditsToCreate, {
                    transaction: tx
                });
            }
        }
        await cl_models_1.ClassActivityLogModel.create({
            sessionId: klass.sessions[0].id,
            type: cl_models_1.ClassActivityType.TeacherTagAttendance,
            details: {
                identity: ctx.identity,
                statusMap
            }
        }, {
            transaction: tx
        });
        await tx.commit();
    }
    catch (err) {
        await tx.rollback();
        throw err;
    }
    if (attendedStudents.length > 0) {
        await cloudwatch_1.writeCloudwatchEvents(attendedStudents.map(s => ({
            type: 'TRIAL_ATTENDED',
            payload: {
                userId: s.parentId,
                timestamp: klass.startDate.toJSON(),
                contentId: klass.course.id,
                contentName: klass.course.name
            }
        })));
    }
    return enrollments;
}
exports.updateEnrollmentsStatus = updateEnrollmentsStatus;
