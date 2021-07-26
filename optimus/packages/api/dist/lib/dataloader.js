"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teacherStore = exports.catalogStore = void 0;
const cl_models_1 = require("cl-models");
const logger_1 = require("./logger");
class Store {
    constructor(ttl, onLoad) {
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
class CatalogStore extends Store {
    constructor() {
        super(20 * 60 * 1000, () => {
            logger_1.default.info('CatalogStore:load');
            return cl_models_1.SubjectModel.findAll({
                order: [[cl_models_1.CourseModel, 'level', 'ASC']],
                include: [cl_models_1.CourseModel]
            });
        });
        this.sData = new Map();
        this.cData = new Map();
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
    reset() {
        this.sData.clear();
        this.cData.clear();
    }
    async getSubjects() {
        if (this.sData.size === 0 || this.isExpired()) {
            await this.load();
        }
        return Array.from(this.sData.values());
    }
    async getSubjectById(id) {
        if (!this.sData.has(id) || this.isExpired()) {
            await this.load();
        }
        return this.sData.get(id);
    }
    async getCourseById(id) {
        if (!this.cData.has(id) || this.isExpired()) {
            await this.load();
        }
        return this.cData.get(id);
    }
    async getNextLevel(k) {
        const course = await this.getCourseById(k.courseId);
        const subject = await this.getSubjectById(course.subjectId);
        if (course.official && course.level < subject.exitLevel) {
            return subject.courses.find(c => c.level === course.level + 1);
        }
    }
}
class TeacherStore extends Store {
    constructor() {
        super(10 * 60 * 1000, () => {
            logger_1.default.info('TeacherStore:load');
            return cl_models_1.TeacherModel.findAll({
                include: [cl_models_1.CourseModel]
            });
        });
        this.data = new Map();
    }
    async load() {
        const teachers = await this.query();
        for (const teacher of teachers) {
            this.data.set(teacher.id, teacher);
        }
    }
    update(teacher) {
        this.data.set(teacher.id, teacher);
    }
    delete(id) {
        this.data.delete(id);
    }
    async getAll() {
        if (this.data.size === 0 || this.isExpired()) {
            await this.load();
        }
        return Array.from(this.data.values());
    }
    async getById(id) {
        if (!this.data.has(id) || this.isExpired()) {
            await this.load();
        }
        return this.data.get(id);
    }
}
exports.catalogStore = new CatalogStore();
exports.teacherStore = new TeacherStore();
