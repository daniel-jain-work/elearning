import { Seat } from '@cl/types';
import { SeatModel, SessionModel, StudentModel } from 'cl-models';

export default {
  async activityLogs(ses: SessionModel) {
    return ses.getClassActivityLogs();
  },

  async students(ses: SessionModel) {
    return ses.students || ses.getStudents();
  },

  async roster(ses: SessionModel) {
    const items = await SeatModel.findAll({
      include: [StudentModel],
      where: {
        sessionId: ses.id
      }
    });

    const attendances = ses.attendances || (await ses.getAttendances());
    const seats: Seat<StudentModel>[] = [];

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
