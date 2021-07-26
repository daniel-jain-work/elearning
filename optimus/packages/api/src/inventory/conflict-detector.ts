import { ClassModel, CourseModel } from 'cl-models';
import { Op } from 'sequelize';
import { getTeacherOccupancies } from '../lib/teacher-utils';

export async function bustConflicts(klass: ClassModel) {
  const occupancies = await getTeacherOccupancies(klass.startDate, klass.endDate);

  const potentialConflicts = await ClassModel.scope([
    'defaultScope',
    'countStudent'
  ]).findAll({
    include: [
      {
        model: CourseModel,
        required: true,
        attributes: ['id'],
        where: {
          official: true
        }
      }
    ],
    where: {
      active: true,
      id: {
        [Op.not]: klass.id
      },
      teacherId: {
        [Op.is]: null
      },
      startDate: {
        [Op.lte]: klass.endDate
      },
      endDate: {
        [Op.gte]: klass.startDate
      }
    }
  });

  const toKill: ClassModel[] = [];
  for (const item of potentialConflicts) {
    const available = occupancies.find(oc => oc.available(item));
    if (available) {
      available.assignClass(item);
    } else if (item.numberOfRegistrations === 0) {
      toKill.push(item);
    }
  }

  if (toKill.length > 0) {
    await ClassModel.update(
      { active: false },
      {
        where: {
          id: { [Op.in]: toKill.map(k => k.id) }
        }
      }
    );
  }
}
