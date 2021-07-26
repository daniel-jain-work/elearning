import { useLazyQuery } from '@apollo/react-hooks';
import { Typography } from '@material-ui/core';
import { DateTime } from 'luxon';
import React from 'react';
import {
  ClassStudentsHistoryQuery,
  ClassStudentsHistoryResult
} from '../../teacher-queries';
import LazyLoader from '../lazy-loader';
import StudentsProgresses from '../students-progresses';

interface Props {
  classId: string;
  teacherId: string;
}

export default function StudentsHistory(props: Props) {
  const now = DateTime.local();

  const [getClassStudents, queryResult] = useLazyQuery<ClassStudentsHistoryResult>(
    ClassStudentsHistoryQuery
  );

  const activeStudents = new Set<string>();
  const studentSubjects: { [id: string]: string[] } = {};
  const students = queryResult.data?.class.students;

  let earlist = now.startOf('week');
  let latest = now.endOf('week');

  if (students) {
    students.forEach(student => {
      const subjects = new Set<string>();
      student.classes.forEach(c => {
        const cstart = DateTime.fromISO(c.startDate);
        const cend = DateTime.fromISO(c.endDate);

        if (cstart < earlist) {
          earlist = cstart;
        }

        if (cend > latest) {
          latest = cend;
        }

        if (cend > now) {
          activeStudents.add(student.id);
        }

        subjects.add(c.course.subjectId);
      });

      studentSubjects[student.id] = Array.from(subjects);
    });
  }

  const start = earlist.startOf('week');
  const end = latest.endOf('week');
  const numberOfWeeks = Math.ceil(end.diff(start, 'weeks').weeks);

  return (
    <LazyLoader
      square
      elevation={0}
      style={{ marginTop: 32 }}
      loading={queryResult.loading}
      summary={<Typography color="textSecondary">Students Progress</Typography>}
      onExpanded={() => {
        if (!queryResult.called) {
          getClassStudents({
            variables: {
              id: props.classId,
              from: now.minus({ months: 3 }).startOf('month').toJSDate()
            }
          });
        }
      }}
    >
      {students && (
        <StudentsProgresses
          teacherId={props.teacherId}
          students={students}
          studentSubjects={studentSubjects}
          activeStudents={activeStudents}
          start={start}
          end={end}
          numberOfWeeks={numberOfWeeks}
        />
      )}
    </LazyLoader>
  );
}
