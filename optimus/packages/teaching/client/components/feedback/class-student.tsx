import {
  Avatar,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  NativeSelect
} from '@material-ui/core';
import { paidStatusCodes, trialStatusCodes } from 'cl-common';
import React from 'react';
import { ClassDetails, Student } from '../../data-types';

interface Props {
  course: ClassDetails['course'];
  student: Student;
  statusCode: number;
  addedOn?: boolean;
  movedOut?: boolean;
  loading: boolean;
  onChange: (evt: React.ChangeEvent<HTMLSelectElement>) => void;
}

function AttendOptions(props: Pick<Props, 'course'>) {
  if (props.course.isTrial) {
    return (
      <optgroup label="Attended">
        {Object.keys(trialStatusCodes).map(code => (
          <option value={code} key={code}>
            {trialStatusCodes[code]}
          </option>
        ))}
      </optgroup>
    );
  }

  if (props.course.isRegular) {
    return (
      <optgroup label="Attended">
        {Object.keys(paidStatusCodes).map(code => (
          <option value={code} key={code}>
            {paidStatusCodes[code]}
          </option>
        ))}
      </optgroup>
    );
  }

  return <option value="1">Attended</option>;
}

export default function ClassStudent(props: Props) {
  let studentInfo: React.ReactNode = null;
  if (props.addedOn) {
    studentInfo = '(temporarily added to this session, not a regular student)';
  } else if (props.movedOut) {
    studentInfo = '(temporarily moved out of this session, expect noshow)';
  } else {
    studentInfo = `Parent: ${props.student.parent.fullName}`;
  }

  return (
    <ListItem>
      <ListItemAvatar>
        <Avatar src={props.student.avatar} />
      </ListItemAvatar>
      <ListItemText
        primary={describeStudent(props.student)}
        primaryTypographyProps={{
          color: props.statusCode < 0 ? 'error' : 'textPrimary'
        }}
        secondary={studentInfo}
      />
      <ListItemSecondaryAction>
        <NativeSelect
          value={props.statusCode}
          disabled={props.loading || props.movedOut}
          onChange={props.onChange}
        >
          <option value="0" disabled />
          <option value="-1">Did not attend class</option>
          <AttendOptions course={props.course} />
        </NativeSelect>
      </ListItemSecondaryAction>
    </ListItem>
  );
}

function describeStudent(s: Student): string {
  if (s.gender) {
    const gender = s.gender === 'male' ? 'boy' : 'girl';
    return s.name + (s.age ? ` (${s.age} year old, ${gender})` : ` (${gender})`);
  }

  if (s.age) {
    return s.name + ` (${s.age} year old)`;
  }

  return s.name;
}
