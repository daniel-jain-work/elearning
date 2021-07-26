"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMeetingNotStartedAlert = void 0;
const cl_common_1 = require("cl-common");
const cl_models_1 = require("cl-models");
const luxon_1 = require("luxon");
const sequelize_1 = require("sequelize");
const mailer_1 = require("../mailer");
const mailer_utils_1 = require("../mailer-utils");
const sendSOSAlert = async (ses, fLogger) => {
    fLogger.info({ classId: ses.classId }, 'class not started');
    const classTime = luxon_1.DateTime.fromJSDate(ses.startDate, cl_common_1.tzOpts).toFormat('ttt');
    const className = ses.class.course.name;
    const classUrl = mailer_utils_1.getOpsClassUrl(ses.class);
    if (ses.class.teacher.phoneNumber) {
        await mailer_1.sendTextMessage(ses.class.teacher.phoneNumber, `You have a ${className} class starting right now at ${classTime}`);
    }
    await mailer_1.sendEmail({ ToAddresses: [mailer_1.supportEmail, ses.class.teacher.email] }, {
        Subject: {
            Data: `💥💥 Attention Required - You have a class right now`
        },
        Body: {
            Html: {
                Data: `
            <p>${ses.class.teacher.firstName}</p>
            <p>You have a <a href="${classUrl}">${className}</a> class starting right now at ${classTime}.</p>
            <p>Go to ${mailer_utils_1.siteUrl.teaching} to start the class.</p>
            <p>
              We are sending this email to make sure you see the class assignment. If you are unable to start the class, please contact ${mailer_1.supportEmail} right away.
            </p>
            <p>If you believe this email was sent in error, please email ${mailer_1.supportEmail}. We will take a look.</p>
            <p>Thanks!<br/>Your friendly ops team.</p>
          `
            }
        }
    });
};
async function sendMeetingNotStartedAlert(dt, fLogger) {
    const sessions = await cl_models_1.SessionModel.findAll({
        where: {
            startDate: {
                [sequelize_1.Op.gte]: dt.minus({ minutes: 5 }).startOf('minute').toJSDate(),
                [sequelize_1.Op.lte]: dt.toJSDate()
            }
        },
        include: [
            {
                model: cl_models_1.ClassActivityLogModel,
                required: false,
                where: {
                    type: cl_models_1.ClassActivityType.MeetingStarted
                }
            },
            {
                model: cl_models_1.StudentModel.unscoped(),
                attributes: ['id'],
                required: true
            },
            {
                model: cl_models_1.ClassModel,
                required: true,
                include: [
                    cl_models_1.CourseModel,
                    {
                        model: cl_models_1.TeacherModel,
                        required: true
                    }
                ]
            }
        ]
    });
    const problems = sessions.filter(ses => ses.class.active &&
        ses.class.course.official &&
        ses.classActivityLogs.length === 0);
    if (problems.length > 0) {
        await Promise.all(problems.map(ses => sendSOSAlert(ses, fLogger)));
    }
}
exports.sendMeetingNotStartedAlert = sendMeetingNotStartedAlert;
