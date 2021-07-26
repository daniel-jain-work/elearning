"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClass = exports.updateClass = exports.autoAssignTeacher = exports.setClassObservers = exports.removeTeacherFromClass = exports.updateClassStatus = exports.upsertCalendarEvent = exports.deleteZoomMeeting = exports.upsertZoomMeeting = void 0;
const apollo_server_lambda_1 = require("apollo-server-lambda");
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const lodash_1 = require("lodash");
const luxon_1 = require("luxon");
const sequelize_1 = require("sequelize");
const conflict_detector_1 = require("../../inventory/conflict-detector");
const cloudwatch_1 = require("../../lib/cloudwatch");
const google_calendar_1 = require("../../lib/google-calendar");
const host_manager_1 = require("../../lib/host-manager");
const mailer_1 = require("../../lib/mailer");
const mailer_utils_1 = require("../../lib/mailer-utils");
const teacher_utils_1 = require("../../lib/teacher-utils");
const sequelize_2 = require("../../sequelize");
const zoom_api_1 = require("../../zoomtopia/zoom-api");
async function upsertZoomMeeting(_, args, ctx) {
    ctx.internalOnly();
    const fLogger = ctx.logger.child({
        classId: args.id,
        mutation: 'upsertZoomMeeting'
    });
    const klass = await cl_models_1.ClassModel.findByPk(args.id, {
        rejectOnEmpty: true,
        include: [cl_models_1.CourseModel, cl_models_1.TeacherModel, cl_models_1.ZoomhostModel]
    });
    if (klass.zoomId) {
        await zoom_api_1.updateMeeting(klass, klass.course, fLogger);
    }
    else {
        const meeting = await zoom_api_1.createMeeting(klass, klass.course, fLogger);
        if (meeting) {
            await google_calendar_1.upsertEvent(klass, klass.course, fLogger);
        }
    }
    return klass;
}
exports.upsertZoomMeeting = upsertZoomMeeting;
async function deleteZoomMeeting(_, args, ctx) {
    ctx.internalOnly();
    const fLogger = ctx.logger.child({
        classId: args.id,
        mutation: 'deleteZoomMeeting'
    });
    const klass = await cl_models_1.ClassModel.findByPk(args.id, {
        rejectOnEmpty: true,
        include: [cl_models_1.CourseModel, cl_models_1.TeacherModel]
    });
    if (klass.zoomId) {
        await zoom_api_1.deleteMeeting(klass, fLogger);
        await google_calendar_1.updateEvent(klass, klass.course, fLogger);
        await klass.update({
            zoomhostId: null,
            details: lodash_1.omit(klass.details, 'dialInLink', 'zoomId', 'password')
        });
    }
    return klass;
}
exports.deleteZoomMeeting = deleteZoomMeeting;
async function upsertCalendarEvent(_, args, ctx) {
    ctx.internalOnly();
    const fLogger = ctx.logger.child({
        classId: args.id,
        mutation: 'upsertCalendarEvent'
    });
    const klass = await cl_models_1.ClassModel.findByPk(args.id, {
        rejectOnEmpty: true,
        include: [cl_models_1.CourseModel, cl_models_1.TeacherModel, cl_models_1.ZoomhostModel]
    });
    await google_calendar_1.upsertEvent(klass, klass.course, fLogger);
    return klass;
}
exports.upsertCalendarEvent = upsertCalendarEvent;
async function updateClassStatus(_, args, ctx) {
    ctx.internalOnly();
    const fLogger = ctx.logger.child({
        classId: args.id,
        mutation: 'updateClassStatus'
    });
    const klass = await cl_models_1.ClassModel.findByPk(args.id, {
        rejectOnEmpty: true,
        include: [cl_models_1.CourseModel, cl_models_1.EnrollmentModel, cl_models_1.TeacherModel, cl_models_1.ZoomhostModel]
    });
    await klass.update({ active: args.active });
    fLogger.info('class status changed to %s', args.active);
    if (args.active) {
        await google_calendar_1.upsertEvent(klass, klass.course, fLogger);
        return klass;
    }
    if (klass.enrollments.length === 0) {
        await zoom_api_1.deleteMeeting(klass, fLogger);
        await google_calendar_1.deleteEvent(klass, fLogger);
        await klass.update({
            zoomhostId: null,
            details: lodash_1.omit(klass.details, 'eventId', 'dialInLink', 'zoomId', 'password')
        });
    }
    return klass;
}
exports.updateClassStatus = updateClassStatus;
async function removeTeacherFromClass(_, args, ctx) {
    ctx.internalOnly();
    const fLogger = ctx.logger.child({
        classId: args.classId,
        mutation: 'removeTeacherFromClass'
    });
    const klass = await cl_models_1.ClassModel.findByPk(args.classId, {
        rejectOnEmpty: true,
        include: [cl_models_1.CourseModel]
    });
    if (!klass.teacherId) {
        fLogger.warn('No teacher is assigned to class');
        return;
    }
    await klass.update({ teacherId: null });
    fLogger.info('Teacher is removed from class');
    await google_calendar_1.updateEvent(klass, klass.course, fLogger);
    return klass;
}
exports.removeTeacherFromClass = removeTeacherFromClass;
async function setClassObservers(_, args, ctx) {
    ctx.internalOnly();
    const klass = await cl_models_1.ClassModel.findByPk(args.classId, {
        include: [cl_models_1.CourseModel]
    });
    await klass.setObservers(args.teacherIds);
    klass.observers = await klass.getObservers();
    ctx.logger.info({ classId: args.classId }, 'class has %d observers', klass.observers.length);
    if (klass.observers.length > 0) {
        const startTime = luxon_1.DateTime.fromJSDate(klass.startDate, cl_common_1.tzOpts).toFormat('ffff');
        await mailer_1.sendTemplatedEmail({
            from: mailer_1.ClassMaster,
            templateId: 'd-1fda1e3af655445e9fe7073265a53e5d',
            asm: { groupId: cl_common_1.UnsubscribeGroups.Classes },
            personalizations: klass.observers.map(t => ({
                to: t.email,
                dynamicTemplateData: {
                    startTime,
                    ...mailer_utils_1.createClassParams(klass, klass.course),
                    ...mailer_utils_1.createTeacherParams(t)
                }
            }))
        });
    }
    return klass;
}
exports.setClassObservers = setClassObservers;
async function autoAssignTeacher(_, args, ctx) {
    ctx.internalOnly();
    const klass = await cl_models_1.ClassModel.findByPk(args.classId, {
        rejectOnEmpty: true,
        include: [cl_models_1.CourseModel]
    });
    if (klass.teacherId) {
        return;
    }
    const fLogger = ctx.logger.child({
        classId: klass.id,
        mutation: 'autoAssignTeacher'
    });
    let teacher;
    if (args.hintId) {
        const hint = await cl_models_1.TeacherModel.findByPk(args.hintId, {
            include: [
                { model: cl_models_1.CourseModel, required: true, where: { id: klass.courseId } }
            ]
        });
        if (hint && (await teacher_utils_1.canYouTeachThisClass(hint, klass))) {
            fLogger.info('preferered teacher %s is available', hint.fullName);
            teacher = hint;
        }
    }
    if (!teacher) {
        teacher = await teacher_utils_1.suggestBestFit(klass, klass.course, fLogger);
    }
    if (teacher) {
        fLogger.info('teacher %s is assigned to teach', teacher.fullName);
        const tx = await sequelize_2.default.transaction();
        try {
            await klass.setTeacher(teacher, { transaction: tx });
            await teacher_utils_1.useTrialToken(teacher, klass.course, fLogger, { transaction: tx });
            await tx.commit();
        }
        catch (err) {
            await tx.rollback();
            throw err;
        }
        await google_calendar_1.upsertEvent(klass, klass.course, fLogger);
        await conflict_detector_1.bustConflicts(klass);
    }
    return teacher;
}
exports.autoAssignTeacher = autoAssignTeacher;
async function updateClass(_, args, ctx) {
    ctx.internalOnly();
    const fLogger = ctx.logger.child({
        classId: args.id,
        mutation: 'updateClass'
    });
    const klass = await cl_models_1.ClassModel.findByPk(args.id, {
        rejectOnEmpty: true,
        include: [cl_models_1.CourseModel, { model: cl_models_1.MoverModel, as: 'addons' }]
    });
    fLogger.info({ payload: args });
    let scheduleChanged = false;
    let teacherChanged = false;
    if (args.schedules && args.schedules.length > 0) {
        scheduleChanged = !lodash_1.isEqual(klass.schedules, args.schedules);
        if (scheduleChanged) {
            assertSchedulesValid(args.schedules, ctx);
            if (!args.skipVerification) {
                assertAddonNotAffected(klass, args.schedules, ctx);
            }
        }
    }
    if (args.dialInLink && args.dialInLink !== klass.dialInLink) {
        klass.set('zoomhostId', null);
        klass.set('details', {
            ...lodash_1.omit(klass.details, 'zoomId', 'dialInLink', 'password'),
            dialInLink: args.dialInLink
        });
    }
    if (args.teacherId) {
        if (args.teacherId !== klass.teacherId) {
            klass.set('teacherId', args.teacherId);
            teacherChanged = true;
        }
    }
    else if (klass.teacherId) {
        klass.set('teacherId', null);
        teacherChanged = true;
    }
    const tx = await sequelize_2.default.transaction();
    try {
        if (scheduleChanged) {
            const sessions = args.schedules.map((schedule, idx) => {
                const session = klass.sessions[idx] ||
                    new cl_models_1.SessionModel({
                        classId: klass.id,
                        idx
                    });
                session.set('startDate', schedule[0]);
                session.set('endDate', schedule[1]);
                return session;
            });
            if (sessions.length < klass.sessions.length) {
                const idsToRemove = klass.sessions.slice(sessions.length).map(ses => ses.id);
                await cl_models_1.SessionModel.destroy({
                    transaction: tx,
                    where: {
                        id: {
                            [sequelize_1.Op.in]: idsToRemove
                        }
                    }
                });
            }
            await cl_models_1.SessionModel.bulkCreate(sessions.map(ses => ses.toJSON()), {
                transaction: tx,
                updateOnDuplicate: ['startDate', 'endDate']
            });
            klass.set('sessions', sessions);
            klass.set('startDate', sessions[0].startDate);
            klass.set('endDate', lodash_1.last(sessions).endDate);
            fLogger.info('class schedule is updated %o', klass.schedules);
        }
        if (klass.teacherId) {
            klass.teacher = await getTeacherIfAvailable(klass.teacherId, klass, args.skipVerification, fLogger);
        }
        if (scheduleChanged && klass.zoomhostId) {
            const stillAvailable = await host_manager_1.isHostAvailable(klass);
            if (!stillAvailable) {
                await zoom_api_1.deleteMeeting(klass, fLogger);
                klass.set('zoomhostId', null);
                klass.set('details', {
                    ...lodash_1.omit(klass.details, 'zoomId', 'dialInLink', 'password')
                });
            }
        }
        await klass.save({ transaction: tx });
        await tx.commit();
    }
    catch (err) {
        await tx.rollback();
        throw err;
    }
    await cloudwatch_1.emitClassUpdatedEvent({
        classId: klass.id,
        teacherChanged,
        scheduleChanged
    });
    return klass;
}
exports.updateClass = updateClass;
async function createClass(_, args, ctx) {
    ctx.internalOnly();
    assertSchedulesValid(args.schedules, ctx);
    const klass = new cl_models_1.ClassModel({
        active: args.active,
        courseId: args.courseId,
        details: lodash_1.pick(args, 'dialInLink'),
        startDate: args.schedules[0][0],
        endDate: lodash_1.last(args.schedules)[1],
        notes: args.note ? [{ content: args.note }] : [],
        sessions: args.schedules.map((session, idx) => ({
            idx,
            startDate: session[0],
            endDate: session[1]
        }))
    }, {
        include: [cl_models_1.NoteModel, cl_models_1.SessionModel]
    });
    const fLogger = ctx.logger.child({ classId: klass.id, mutation: 'createClass' });
    if (args.teacherId) {
        const teacher = await getTeacherIfAvailable(args.teacherId, klass, args.skipVerification, fLogger);
        klass.teacherId = teacher.id;
        klass.teacher = teacher;
    }
    await klass.save();
    fLogger.info({ payload: args }, 'class created');
    await cloudwatch_1.emitClassCreatedEvent({
        classId: klass.id
    });
    return klass;
}
exports.createClass = createClass;
function assertSchedulesValid(schedules, ctx) {
    let error = '';
    for (let idx = 0; idx < schedules.length; idx++) {
        const [start, end] = schedules[idx];
        if (!start || !end || start >= end) {
            error = `Session ${idx + 1} has invalid time`;
            break;
        }
        if (schedules[idx + 1]) {
            const nextStart = schedules[idx + 1][0];
            if (end > nextStart) {
                error = `Session ${idx + 1} ends later than next session`;
            }
        }
    }
    if (error) {
        ctx.badRequest(error, {
            schedules
        });
    }
}
function assertAddonNotAffected(klass, schedules, ctx) {
    const affected = new Set();
    klass.schedules.forEach((previous, idx) => {
        if (lodash_1.isEqual(previous, schedules[idx])) {
            return;
        }
        if (klass.addons.find(addon => addon.idx === idx)) {
            affected.add(idx + 1);
        }
    });
    if (affected.size > 0) {
        const sessions = [...affected].join(', ');
        ctx.badRequest(`Addon students on these sessions: ${sessions} will be affected`);
    }
}
async function getTeacherIfAvailable(teacherId, klass, skipVerification, fLogger) {
    const teacher = await cl_models_1.TeacherModel.findByPk(teacherId, {
        rejectOnEmpty: true,
        include: [
            {
                model: cl_models_1.CourseModel,
                where: { id: klass.courseId },
                required: false
            }
        ]
    });
    if (!skipVerification) {
        const [canYou, reason] = await teacher_utils_1.canYouTeachThisClass(teacher, klass);
        if (!canYou) {
            fLogger.warn(`%s cannot teach this:: %s`, teacher.fullName, reason);
            throw new apollo_server_lambda_1.UserInputError(reason);
        }
    }
    return teacher;
}
