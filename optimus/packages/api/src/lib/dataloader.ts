import {
  CourseModel,
  SubjectModel,
  TeacherCourseModel,
  TeacherModel
} from 'cl-models';
import logger from './logger';

class Store<T> {
  private loader: Promise<T[]>;
  private onLoad: () => Promise<T[]>;
  private lastUpdate: number;
  private ttl: number;

  constructor(ttl: number, onLoad: () => Promise<T[]>) {
    this.ttl = ttl;
    this.lastUpdate = 0;
    this.onLoad = onLoad;
  }

  isExpired() {
    return Date.now() - this.lastUpdate > this.ttl;
  }

  async query() {
    if (!this.loader) {
      this.loader = this.onLoad();
    }

    const result = await this.loader;
    this.loader = null;
    this.lastUpdate = Date.now();
    return result;
  }
}

class CatalogStore extends Store<SubjectModel> {
  private sData = new Map<string, SubjectModel>();
  private cData = new Map<string, CourseModel>();

  constructor() {
    super(5 * 60 * 1000, () => {
      logger.info('CatalogStore:load');
      return SubjectModel.findAll({
        order: [[CourseModel, 'level', 'ASC']],
        include: [CourseModel]
      });
    });
  }

  async load() {
    const subjects = await this.query();
    for (const subject of subjects) {
      this.sData.set(subject.id, subject);
      for (const course of subject.courses) {
        this.cData.set(course.id, course);
      }
    }
  }

  updateCache(subject: SubjectModel) {
    this.sData.set(subject.id, subject);
    subject.courses.forEach(course => this.cData.set(course.id, course));
  }

  async getSubjects(officialOnly = false) {
    if (this.sData.size === 0 || this.isExpired()) {
      await this.load();
    }

    const result: SubjectModel[] = [];
    for (const subject of this.sData.values()) {
      if (subject.official || !officialOnly) {
        result.push(subject);
      }
    }

    return result;
  }

  async getSubjectById(id: string) {
    if (!this.sData.has(id) || this.isExpired()) {
      await this.load();
    }

    return this.sData.get(id);
  }

  async getCourseById(id: string) {
    if (!this.cData.has(id) || this.isExpired()) {
      await this.load();
    }

    return this.cData.get(id);
  }
}

class TeacherStore extends Store<TeacherModel> {
  private data = new Map<string, TeacherModel>();

  constructor() {
    super(5 * 60 * 1000, () => {
      logger.info('TeacherStore:load');
      return TeacherModel.findAll({
        order: [['createdAt', 'DESC']],
        include: [CourseModel, TeacherCourseModel]
      });
    });
  }

  async load() {
    const teachers = await this.query();
    for (const teacher of teachers) {
      this.data.set(teacher.id, teacher);
    }
  }

  update(teacher: TeacherModel) {
    this.data.set(teacher.id, teacher);
  }

  delete(id: string) {
    this.data.delete(id);
  }

  async getAll() {
    if (this.data.size === 0 || this.isExpired()) {
      await this.load();
    }

    return Array.from(this.data.values());
  }

  async getById(id: string) {
    if (!this.data.has(id) || this.isExpired()) {
      await this.load();
    }

    return this.data.get(id);
  }
}

export const catalogStore = new CatalogStore();
export const teacherStore = new TeacherStore();
