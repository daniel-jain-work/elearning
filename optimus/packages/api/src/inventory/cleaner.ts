import { ClassModel, EnrollmentModel, MoverModel, ThreadModel } from 'cl-models';
import { Logger } from 'pino';
import { Op, QueryTypes } from 'sequelize';
import { deleteEvent } from '../lib/google-calendar';
import sequelize from '../sequelize';

const deadListingQuery = `
  SELECT *
  FROM ${ClassModel.tableName}
  WHERE active = false
    AND endDate > CURTIME()
    AND teacherId IS NULL
    AND id NOT IN (
      SELECT classId FROM ${EnrollmentModel.tableName}
      UNION SELECT classId FROM ${MoverModel.tableName}
      UNION SELECT originalClassId FROM ${MoverModel.tableName}
      UNION SELECT classId FROM ${ThreadModel.tableName}
    )
`;

export async function cleanStock(fLogger: Logger) {
  const deadlist = await sequelize.query<ClassModel>(deadListingQuery, {
    type: QueryTypes.SELECT,
    mapToModel: true,
    model: ClassModel
  });

  if (deadlist.length === 0) {
    return;
  }

  for (const klass of deadlist) {
    await deleteEvent(klass, fLogger.child({ classId: klass.id }));
  }

  const deleted = await ClassModel.destroy({
    where: {
      id: {
        [Op.in]: deadlist.map(k => k.id)
      }
    }
  });

  fLogger.info('%d dead class deleted', deleted);
}
