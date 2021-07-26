import { coolDownInterval } from 'cl-common';
import { ClassModel, SessionModel } from 'cl-models';
import { DateTime } from 'luxon';
import { Op } from 'sequelize';

export async function isHostAvailable(klass: ClassModel) {
  if (!klass.zoomhostId) {
    return true;
  }

  const timeQuery = klass.sessions.map(ses => ({
    startDate: {
      [Op.lte]: DateTime.fromJSDate(ses.endDate)
        .plus({ minutes: coolDownInterval })
        .toJSDate()
    },
    endDate: {
      [Op.gte]: DateTime.fromJSDate(ses.startDate)
        .minus({ minutes: coolDownInterval })
        .toJSDate()
    }
  }));

  const conflict = await SessionModel.findOne({
    include: [
      {
        model: ClassModel.unscoped(),
        attributes: ['id'],
        required: true,
        where: {
          zoomhostId: klass.zoomhostId,
          id: {
            [Op.not]: klass.id
          }
        }
      }
    ],
    where: {
      [Op.or]: timeQuery
    }
  });

  return !conflict;
}
