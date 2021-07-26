"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleClassEnrolled = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const sequelize_1 = require("sequelize");
const cloudwatch_1 = require("../lib/cloudwatch");
const enrollment_emails_1 = require("../lib/enrollment-emails");
const teacher_utils_1 = require("../lib/teacher-utils");
const zoom_api_1 = require("../zoomtopia/zoom-api");
const getPriorEnrollment = (student, klass) => cl_models_1.EnrollmentModel.findOne({
    order: [
        [cl_models_1.ClassModel, cl_models_1.CourseModel, 'level', 'DESC'],
        ['statusCode', 'DESC']
    ],
    where: {
        studentId: student.id
    },
    include: [
        {
            model: cl_models_1.ClassModel.unscoped(),
            required: true,
            where: {
                startDate: {
                    [sequelize_1.Op.lt]: new Date()
                }
            },
            include: [
                {
                    model: cl_models_1.TeacherModel,
                    required: true
                },
                {
                    model: cl_models_1.CourseModel,
                    required: true,
                    where: {
                        subjectId: klass.course.subjectId,
                        level: {
                            [sequelize_1.Op.gte]: 0,
                            [sequelize_1.Op.lt]: klass.course.level
                        }
                    }
                }
            ]
        }
    ]
});
async function handleClassEnrolled(data, fLogger) {
    const { class: klass, student, transactions } = await cl_models_1.EnrollmentModel.findOne({
        rejectOnEmpty: true,
        where: {
            id: data.id,
            classId: data.classId
        },
        include: [
            cl_models_1.StudentModel,
            cl_models_1.TransactionModel,
            {
                model: cl_models_1.ClassModel.scope(['defaultScope', 'countStudent']),
                include: [cl_models_1.CourseModel, cl_models_1.TeacherModel]
            }
        ]
    });
    let prior;
    if (klass.course.isRegular) {
        prior = await getPriorEnrollment(student, klass);
    }
    await preflightCheck({
        klass,
        course: klass.course,
        priorTeacher: prior === null || prior === void 0 ? void 0 : prior.class.teacher,
        fLogger
    });
    if (data.isReschedule) {
        await enrollment_emails_1.sendRescheduleConfirmation(student, klass, klass.course);
    }
    else {
        const saleTransaction = transactions.find(t => t.type === cl_models_1.TransactionOperation.Sale);
        await enrollment_emails_1.sendRegistrationConfirmation(student, klass, klass.course, saleTransaction);
        if (klass.course.subjectId === cl_common_1.Topic.WEBINARS &&
            !student.parent.paid &&
            !student.parent.attended) {
            await enrollment_emails_1.sendOpenClassFollowup(student);
        }
        if (klass.course.isRegular) {
            await enrollment_emails_1.sendPurchaseNotification(klass, klass.course, student, prior === null || prior === void 0 ? void 0 : prior.class.teacher);
            if (klass.course.level === 1 && !prior) {
                await enrollment_emails_1.sendRegisterTrialReminder(klass, klass.course, student);
            }
        }
        if (prior) {
            await cl_models_1.AttributionModel.bulkCreate([
                {
                    sourceId: prior.id,
                    nextupId: data.id
                }
            ], {
                ignoreDuplicates: true
            });
        }
    }
    if (klass.numberOfRegistrations === 1 && klass.teacher) {
        await teacher_utils_1.announceAssignment(klass.teacher, klass, klass.course);
    }
    if (klass.numberOfRegistrations >= klass.course.capacity) {
        fLogger.warn('class %s is full', klass.course.name);
        await cloudwatch_1.emitClassFullEvent({ classId: klass.id });
    }
}
exports.handleClassEnrolled = handleClassEnrolled;
async function preflightCheck(opts) {
    let teacherCreated = false;
    let meetingCreated = false;
    let failed = false;
    if (!opts.klass.dialInLink) {
        const meeting = await zoom_api_1.createMeeting(opts.klass, opts.course, opts.fLogger);
        if (meeting) {
            meetingCreated = true;
        }
        else {
            opts.fLogger.warn('no zoom host available');
            failed = true;
        }
    }
    if (!opts.klass.teacherId &&
        (opts.course.isTrial || (opts.course.isRegular && opts.course.level > 1))) {
        const teacher = await teacher_utils_1.suggestBestFit(opts.klass, opts.course, opts.priorTeacher);
        if (teacher) {
            await opts.klass.setTeacher(teacher);
            opts.klass.teacher = teacher;
            teacherCreated = true;
            opts.fLogger.info('teacher %s assigned to class', teacher.email);
            if (opts.course.isTrial) {
                await teacher_utils_1.useTrialToken(teacher, opts.course, opts.fLogger);
            }
        }
        else {
            opts.fLogger.warn('no teacher available');
            failed = true;
        }
    }
    if (failed && opts.klass.active) {
        await opts.klass.update({ active: false });
        await enrollment_emails_1.sendClassIsTakenDownAlert(opts.klass, opts.course);
    }
    if (teacherCreated || meetingCreated) {
        await cloudwatch_1.emitClassUpdatedEvent({
            classId: opts.klass.id,
            teacherChanged: teacherCreated,
            scheduleChanged: false
        });
    }
}
