import { Graphql, Seat } from '@cl/types';
import * as assert from 'assert';
import { ClassActivityType, CreditType, ReferralCredits } from 'cl-common';
import {
  AttendanceModel,
  ClassActivityLogModel,
  ClassModel,
  CourseModel,
  CreditModel,
  EnrollmentModel,
  SessionModel,
  StudentModel,
  TeacherModel,
  UserModel
} from 'cl-models';
import { Op } from 'sequelize';
import { GraphqlContext } from '../../graphql-handler';
import { track } from '../../lib/segment';
import sequelize from '../../sequelize';

export async function updateStudentsAttendance(
  root: any,
  args: Graphql.UpdateStudentsAttendanceVars,
  ctx: GraphqlContext
) {
  assert.equal(
    args.statusCodes.length,
    args.students.length,
    'students to update do not match status provided'
  );

  const session = await SessionModel.findByPk(args.sessionId, {
    rejectOnEmpty: true,
    include: [
      {
        model: ClassModel,
        include: [CourseModel, TeacherModel]
      }
    ]
  });

  ctx.ownerOrInternal(session.class.teacherId);

  const statusMap = args.students.reduce((all, sid, idx) => {
    all[sid] = args.statusCodes[idx];
    return all;
  }, {});

  // ORDER is not guaranteed
  const students = await StudentModel.findAll({
    where: {
      id: {
        [Op.in]: args.students
      }
    }
  });

  const seats: Seat<StudentModel>[] = [];

  const attendanceUpdates = students.map(s => {
    const statusCode = statusMap[s.id] || 0;

    ctx.logger.info(
      {
        userId: s.parentId,
        classId: session.classId,
        mutation: 'updateStudentsAttendance'
      },
      '%s changed status to %d',
      s.name,
      statusCode
    );

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

  await AttendanceModel.bulkCreate(attendanceUpdates, {
    updateOnDuplicate: ['statusCode', 'updatedAt']
  });

  await ClassActivityLogModel.create({
    sessionId: session.id,
    type: ClassActivityType.TeacherTagAttendance,
    details: {
      identity: ctx.identity,
      statusMap
    }
  });

  return seats;
}

export async function updateEnrollmentsStatus(
  root: any,
  args: Graphql.UpdateEnrollmentsStatusVars,
  ctx: GraphqlContext
) {
  assert.equal(
    args.statusCodes.length,
    args.students.length,
    'students to update do not match status provided'
  );

  const klass = await ClassModel.findByPk(args.classId, {
    rejectOnEmpty: true,
    include: [CourseModel]
  });

  ctx.ownerOrInternal(klass.teacherId);

  const statusMap = args.students.reduce((all, sid, idx) => {
    all[sid] = args.statusCodes[idx];
    return all;
  }, {});

  // ORDER is not guaranteed
  const enrollments = await EnrollmentModel.findAll({
    where: {
      classId: klass.id,
      studentId: {
        [Op.in]: args.students
      }
    },
    include: [
      {
        model: StudentModel,
        required: true
      }
    ]
  });

  const attendedStudents: StudentModel[] = [];
  const firstTimers = new Map<string, UserModel>();
  const attendanceUpdates = [];

  const statusUpdates = enrollments.map(er => {
    const statusCode = statusMap[er.studentId] || 0;
    const oldStatusCode = er.statusCode;

    ctx.logger.info(
      { classId: klass.id, userId: er.student.parentId },
      '%s changed status from %d to %d',
      er.student.name,
      oldStatusCode,
      statusCode
    );

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
  const tx = await sequelize.transaction();
  try {
    await EnrollmentModel.bulkCreate(statusUpdates, {
      updateOnDuplicate: ['statusCode', 'updatedAt'],
      transaction: tx
    });

    await AttendanceModel.bulkCreate(attendanceUpdates, {
      updateOnDuplicate: ['statusCode', 'updatedAt'],
      transaction: tx
    });

    if (firstTimers.size > 0) {
      const userIds: string[] = [];
      const creditsToCreate: {
        userId: string;
        cents: number;
        type: CreditType;
        details: CreditModel['details'];
      }[] = [];

      for (const user of firstTimers.values()) {
        userIds.push(user.id);
        if (user.refererId) {
          creditsToCreate.push({
            userId: user.refererId,
            cents: ReferralCredits.attendance,
            type: CreditType.Referral,
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

      await UserModel.update(
        { attended: true },
        {
          transaction: tx,
          where: {
            id: {
              [Op.in]: userIds
            }
          }
        }
      );

      if (creditsToCreate.length > 0) {
        await CreditModel.bulkCreate(creditsToCreate, {
          transaction: tx
        });
      }
    }

    await ClassActivityLogModel.create(
      {
        sessionId: klass.sessions[0].id,
        type: ClassActivityType.TeacherTagAttendance,
        details: {
          identity: ctx.identity,
          statusMap
        }
      },
      {
        transaction: tx
      }
    );

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }

  if (attendedStudents.length > 0) {
    await Promise.all(
      attendedStudents.map(s =>
        track(
          s.parent,
          {
            event: 'AttendTrial',
            timestamp: klass.startDate,
            properties: {
              content_name: klass.course.name,
              content_ids: [klass.courseId]
            }
          },
          ctx.logger.child({
            userId: s.parentId,
            classId: klass.id,
            mutation: 'updateStudentsAttendance'
          })
        )
      )
    );
  }

  return enrollments;
}
