import { render } from 'micromustache';
import { ClassWithTeacher, Promotion, Student } from './data-types';

export const templateVars: Record<string, string> = {
  className: 'class_name',
  studentName: 'student_name',
  userName: 'user_name',
  teacherName: 'teacher_name',
  teacherFullname: 'teacher_full',
  heShe: 'he/she',
  heSheCap: 'He/She',
  hisHer: 'his/her',
  hisHerCap: 'His/Her',
  hisHers: 'his/hers',
  himHer: 'him/her',
  promoCode: 'promo_code',
  promoRules: 'promo_rules'
};

const genderMapping: Record<string, Record<string, string>> = {
  heShe: {
    male: 'he',
    female: 'she'
  },
  heSheCap: {
    male: 'He',
    female: 'She'
  },
  hisHer: {
    male: 'his',
    female: 'her'
  },
  hisHerCap: {
    male: 'His',
    female: 'Her'
  },
  hisHers: {
    male: 'his',
    female: 'hers'
  },
  himHer: {
    male: 'him',
    female: 'her'
  }
};

export function replacePlaceholders(
  html: string,
  klass: ClassWithTeacher,
  student: Student,
  promo?: Promotion
): string {
  const gender = student.gender || 'male';

  return render(html, {
    [templateVars.className]: klass.course.name,
    [templateVars.teacherName]: klass.teacher.firstName,
    [templateVars.teacherFullname]: klass.teacher.fullName,
    [templateVars.studentName]: student.firstName,
    [templateVars.userName]: student.parent.firstName,
    [templateVars.heShe]: genderMapping.heShe[gender] || templateVars.heShe,
    [templateVars.heSheCap]: genderMapping.heSheCap[gender] || templateVars.heSheCap,
    [templateVars.hisHer]: genderMapping.hisHer[gender] || templateVars.hisHer,
    [templateVars.hisHerCap]:
      genderMapping.hisHerCap[gender] || templateVars.hisHerCap,
    [templateVars.hisHers]: genderMapping.hisHers[gender] || templateVars.hisHers,
    [templateVars.himHer]: genderMapping.himHer[gender] || templateVars.himHer,
    [templateVars.promoCode]: promo?.code,
    [templateVars.promoRules]: promo?.description
  });
}
