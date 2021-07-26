import {
  ClassActivityLogModel,
  ClassModel,
  CommentModel,
  StudentModel,
  TeacherModel,
  TransactionModel
} from 'cl-models';
import { DateTime } from 'luxon';
import { Op } from 'sequelize';
import { GraphqlContext } from '../graphql-handler';
import { isClassEditable } from '../lib/class-validator';
import { catalogStore, teacherStore } from '../lib/dataloader';
import { getClassroomUrl, getEnrollClassUrl } from '../lib/url-utils';
import { getMeeting, getMeetingRecordings } from '../zoomtopia/zoom-api';

export default {
  async addons(c: ClassModel) {
    return (
      c.addons ||
      c.getAddons({
        include: [StudentModel]
      })
    );
  },

  course(c: ClassModel) {
    return c.course || catalogStore.getCourseById(c.courseId);
  },

  editable(c: ClassModel, _, ctx: GraphqlContext) {
    return isClassEditable(c, ctx);
  },

  offline(c: ClassModel) {
    return (
      c.offline ||
      c.getOffline({
        include: [TransactionModel]
      })
    );
  },

  enrollUrl(c: ClassModel) {
    return getEnrollClassUrl(c);
  },

  classroomUrl(c: ClassModel) {
    return getClassroomUrl(c);
  },

  async enrollments(c: ClassModel) {
    if (c.enrollments) {
      return c.enrollments.slice(0, 199);
    }

    return c.getEnrollments({
      order: [['createdAt', 'DESC']],
      include: [StudentModel],
      limit: 199
    });
  },

  async students(c: ClassModel) {
    if (c.students) {
      return c.students.slice(0, 199);
    }

    return c.getStudents({
      limit: 199
    });
  },

  async threads(c: ClassModel, _, ctx: GraphqlContext) {
    ctx.ownerOrInternal(c.teacherId);

    return c.getThreads({
      order: [
        ['createdAt', 'DESC'],
        [CommentModel, 'createdAt', 'DESC']
      ],
      include: [
        TeacherModel,
        StudentModel.unscoped(),
        {
          model: CommentModel,
          include: [TeacherModel, StudentModel.unscoped()]
        }
      ]
    });
  },

  async activityLogs(c: ClassModel) {
    const sessions = await c.getSessions({
      order: [[ClassActivityLogModel, 'createdAt', 'ASC']],
      include: [ClassActivityLogModel]
    });

    return sessions.map(s => s.classActivityLogs).flat();
  },

  async teacher(c: ClassModel) {
    if (c.teacher) {
      return c.teacher;
    }

    if (c.teacherId) {
      return teacherStore.getById(c.teacherId);
    }
  },

  async observers(c: ClassModel) {
    return c.observers || c.getObservers();
  },

  async zoomhost(c: ClassModel) {
    return c.zoomhost || c.getZoomhost();
  },

  async meeting(c: ClassModel, _, ctx: GraphqlContext) {
    if (
      c.endDate < DateTime.local().minus({ weeks: 2 }).toJSDate() ||
      !c.zoomhostId ||
      !c.zoomId
    ) {
      return null;
    }

    return getMeeting(c.zoomId, ctx.logger);
  },

  async recordings(c: ClassModel, _, ctx: GraphqlContext) {
    if (
      c.endDate < DateTime.local().minus({ weeks: 2 }).toJSDate() ||
      !c.zoomhostId ||
      !c.zoomId
    ) {
      return [];
    }

    return getMeetingRecordings(c.zoomId, ctx.logger);
  },

  async numberOfRegistrations(c: ClassModel) {
    if (typeof c.numberOfRegistrations === 'number') {
      return c.numberOfRegistrations;
    }

    if (c.enrollments) {
      return c.enrollments.length;
    }

    return c.countEnrollments();
  },

  async numberOfAttendants(c: ClassModel) {
    if (c.endDate > new Date()) {
      return 0;
    }

    const course = c.course || (await catalogStore.getCourseById(c.courseId));
    if (!course.isTrial) {
      return 0;
    }

    if (c.enrollments) {
      return c.enrollments.filter(e => e.statusCode > 0).length;
    }

    return c.countEnrollments({
      where: {
        statusCode: {
          [Op.gt]: 0
        }
      }
    });
  },

  async notes(c: ClassModel) {
    return c.notes || c.getNotes();
  }
};
