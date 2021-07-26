import { DateTime, Interval } from 'luxon';
import { Session, SessionClass } from './data-types';

export interface Task {
  title: string;
  start: DateTime;
  end: DateTime;
  data: SessionClass;
  ended: boolean;
}

export function generateTasks(sessions: SessionClass[]) {
  const allTasks: Record<string, Task[]> = {};
  const now = DateTime.local();

  for (const data of sessions) {
    const start = DateTime.fromISO(data.startDate);
    const end = DateTime.fromISO(data.endDate);

    const key = start.toISODate();

    let title = data.class.course.name;
    if (data.idx > 0) {
      title += `, session ${data.idx + 1}`;
    }

    if (allTasks[key]) {
      allTasks[key].push({ start, end, title, data, ended: end < now });
    } else {
      allTasks[key] = [{ start, end, title, data, ended: end < now }];
    }
  }

  return allTasks;
}

export function hasActiveClass(sessions: Session[]) {
  const now = DateTime.local();
  for (const ses of sessions) {
    if (
      Interval.fromDateTimes(
        DateTime.fromISO(ses.startDate).minus({ minutes: 20 }),
        DateTime.fromISO(ses.endDate).plus({ minutes: 20 })
      ).contains(now)
    ) {
      return true;
    }
  }

  return false;
}

export function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hh = h < 10 ? '0' + h : h;
  const mm = m < 10 ? '0' + m : m;
  return [hh, mm].join(':');
}

export function timeToMinutes(time: string) {
  const [hh, mm] = time.split(':');
  return parseInt(hh) * 60 + parseInt(mm);
}
