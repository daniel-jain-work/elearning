import { useMutation } from '@apollo/react-hooks';
import { Graphql, Seat } from '@cl/types';
import { Button, Card, CardHeader, List, ListItem } from '@material-ui/core';
import { getErrorMessage } from 'cl-next-app';
import React from 'react';
import { useAlert } from 'react-alert';
import {
  UpdateEnrollmentsStatusMutation,
  UpdateStudentsAttendanceMutation
} from '../../class-queries';
import { ClassDetails, Student } from '../../data-types';
import ClassStudent from './class-student';

interface Props {
  klass: ClassDetails;
  sessionId?: string;
  roster: Seat<Student>[];
}

export default function ManageAttendances(props: Props) {
  const alert = useAlert();
  const [statusDiff, setStatusDiff] = React.useState<{ [sid: string]: number }>({});

  const [updateClassStatus, classStatusResult] = useMutation<
    any,
    Graphql.UpdateEnrollmentsStatusVars
  >(UpdateEnrollmentsStatusMutation, {
    onCompleted() {
      alert.success('Status updated');
      setStatusDiff({});
    },
    onError(err) {
      alert.error(getErrorMessage(err));
    }
  });

  const [updateSessionStatus, sessionStatusResult] = useMutation<
    any,
    Graphql.UpdateStudentsAttendanceVars
  >(UpdateStudentsAttendanceMutation, {
    onCompleted() {
      alert.success('Status updated');
      setStatusDiff({});
    },
    onError(err) {
      alert.error(getErrorMessage(err));
    }
  });

  const students = Object.keys(statusDiff);

  const onSubmit = () => {
    if (loading || students.length === 0) {
      return;
    }

    const statusCodes = students.map(sid => statusDiff[sid]);

    if (props.sessionId) {
      return updateSessionStatus({
        variables: {
          students,
          statusCodes,
          sessionId: props.sessionId
        }
      });
    } else {
      return updateClassStatus({
        variables: {
          students,
          statusCodes,
          classId: props.klass.id
        }
      });
    }
  };

  const loading = classStatusResult.loading || sessionStatusResult.loading;

  return (
    <Card square elevation={0}>
      <CardHeader subheader="Registered Students" />
      <List dense>
        {props.roster.map(record => {
          const sid = record.student.id;
          const value = sid in statusDiff ? statusDiff[sid] : record.statusCode;

          return (
            <ClassStudent
              key={sid}
              course={props.klass.course}
              student={record.student}
              statusCode={value}
              addedOn={record.addedOn}
              movedOut={record.movedOut}
              loading={loading}
              onChange={evt => {
                const statusCode = parseInt(evt.target.value, 10);
                const updated = { ...statusDiff };

                if (statusCode === record.statusCode) {
                  delete updated[sid];
                } else {
                  updated[sid] = statusCode;
                }

                setStatusDiff(updated);
              }}
            />
          );
        })}
        <ListItem style={{ justifyContent: 'flex-end' }}>
          {students.length > 0 && (
            <Button
              color="secondary"
              size="small"
              variant="contained"
              disabled={loading}
              onClick={onSubmit}
            >
              {loading ? 'Saving ...' : 'Save all changes'}
            </Button>
          )}
        </ListItem>
      </List>
    </Card>
  );
}
