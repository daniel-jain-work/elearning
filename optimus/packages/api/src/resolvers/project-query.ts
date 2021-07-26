import { ProjectModel, UserModel } from 'cl-models';

export default {
  subject(p: ProjectModel) {
    return p.subject || p.getSubject();
  },

  student(p: ProjectModel) {
    return p.student || p.getStudent();
  },

  async reactions(p: ProjectModel) {
    return p.getReactions({
      order: [['createdAt', 'DESC']],
      limit: 99,
      include: [UserModel]
    });
  }
};
