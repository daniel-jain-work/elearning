import { CourseModel } from 'cl-models';
import { catalogStore } from '../lib/dataloader';

export default {
  subject(c: CourseModel) {
    return c.subject || catalogStore.getSubjectById(c.subjectId);
  },

  teachers(c: CourseModel) {
    return c.teachers || c.getTeachers();
  },

  async offer(c: CourseModel) {
    const promos = c.promotions || (await c.getPromotions());
    return promos.find(p => p.isValid);
  }
};
