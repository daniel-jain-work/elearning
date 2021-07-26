import { Topic } from 'cl-common';
import { ClassModel } from 'cl-models';
import { catalogStore } from '../lib/dataloader';

const defaultOption = [Topic.SN, Topic.AI];
const codingTypes = [
  Topic.SN,
  Topic.AS,
  Topic.MC,
  Topic.MOBILE,
  Topic.PY,
  Topic.JAVA
];
const optionsByAge: Record<number, Topic[]> = {
  7: [Topic.SN, Topic.JROBO],
  8: [Topic.SN, Topic.JROBO],
  9: [Topic.SN, Topic.AI, Topic.JROBO, Topic.DESIGN, Topic.MOBILE, Topic.DS],
  10: [Topic.SN, Topic.AI, Topic.ROBO, Topic.DESIGN, Topic.MOBILE, Topic.DS],
  11: [
    Topic.AS,
    Topic.AI,
    Topic.ROBO,
    Topic.DESIGN,
    Topic.MOBILE,
    Topic.MC,
    Topic.DS,
    Topic.WEB,
    Topic.PY,
    Topic.JAVA
  ],
  12: [
    Topic.AS,
    Topic.AI,
    Topic.ROBO,
    Topic.DESIGN,
    Topic.MOBILE,
    Topic.MC,
    Topic.DS,
    Topic.WEB,
    Topic.PY,
    Topic.JAVA
  ],
  13: [
    Topic.AS,
    Topic.AI,
    Topic.ROBO,
    Topic.MC,
    Topic.DS,
    Topic.WEB,
    Topic.PY,
    Topic.JAVA,
    Topic.BIO
  ],
  14: [Topic.AS, Topic.MC, Topic.WEB, Topic.PY, Topic.JAVA, Topic.BIO],
  15: [Topic.PY, Topic.MC, Topic.WEB, Topic.JAVA, Topic.BIO]
};

export async function getNextCourse(klass: ClassModel) {
  const course = await catalogStore.getCourseById(klass.courseId);
  if (course.isRegular) {
    const subject = await catalogStore.getSubjectById(course.subjectId);
    if (course.level < subject.exitLevel) {
      return subject.courses.find(c => c.level === course.level + 1);
    }
  }
}

export async function getRecommendation(age = 0, history: ClassModel[]) {
  const suppress = new Map<Topic, number>();
  let doneCoding = false;

  const suppressIt = (topic: Topic, level: number) => {
    if (!suppress.has(topic) || suppress.get(topic) < level) {
      suppress.set(topic, level);
    }
  };

  for (const cls of history) {
    const { subjectId, level } = await catalogStore.getCourseById(cls.courseId);

    if (codingTypes.includes(subjectId) && level > 0) {
      doneCoding = true;
    }

    suppressIt(subjectId, level);

    switch (subjectId) {
      case Topic.SN:
        suppressIt(Topic.AS, level);
        break;
      case Topic.AS:
        suppressIt(Topic.SN, level);
        break;
      case Topic.JROBO:
        suppressIt(Topic.ROBO, level);
        break;
      case Topic.ROBO:
        suppressIt(Topic.JROBO, level);
        break;
    }
  }

  const options = optionsByAge[age] || defaultOption;

  for (const subjectId of options) {
    const subject = await catalogStore.getSubjectById(subjectId);
    if (suppress.has(subjectId)) {
      const finalLevel = suppress.get(subjectId);
      if (finalLevel < subject.exitLevel) {
        return subject.courses.find(c => c.level === finalLevel + 1);
      }

      continue;
    }

    if (doneCoding && codingTypes.includes(subjectId)) {
      continue;
    }

    return subject.courses.find(c => c.level === 1);
  }
}
