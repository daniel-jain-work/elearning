import { useMutation } from '@apollo/react-hooks';
import { Graphql } from '@cl/types';
import {
  Button,
  IconButton,
  DialogActions,
  DialogContent,
  Fab,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListSubheader,
  TextField
} from '@material-ui/core';
import { Add, RemoveCircle } from '@material-ui/icons';
import { ApolloError } from 'apollo-client';
import { tzOpts } from 'cl-common';
import { getErrorMessage } from 'cl-next-app';
import gql from 'graphql-tag';
import { DateTime } from 'luxon';
import React from 'react';
import { useAlert } from 'react-alert';
import { ClassSearchQuery } from '../../class-queries';
import { Course } from '../../data-types';
import ModalWrapper from '../modal-wrapper';

interface Props {
  teacherId: string;
  course: Course;
  refetchVariables: Graphql.ClassesQuery;
}

const CreateClassMutation = gql`
  mutation(
    $courseId: ID!
    $teacherId: ID!
    $dialInLink: String
    $schedules: [[DateTime]]!
  ) {
    createClass(
      active: true
      courseId: $courseId
      dialInLink: $dialInLink
      schedules: $schedules
      teacherId: $teacherId
      skipVerification: true
    ) {
      id
    }
  }
`;

export default function CreateClassModal(props: Props) {
  const alert = useAlert();
  const [isEditing, toggleEidting] = React.useState(false);

  const [dialInLink, setDialInLink] = React.useState('');
  const [duration, setDuration] = React.useState(60);
  const [startTime, setStartTime] = React.useState('10:00');
  const [dates, setDates] = React.useState([
    DateTime.local().plus({ days: 1 }).toISODate()
  ]);

  const onEdit = () => toggleEidting(true);
  const onClose = () => toggleEidting(false);

  const [createClass, createResult] = useMutation<any, Graphql.CreateClassVars>(
    CreateClassMutation,
    {
      refetchQueries: [
        {
          query: ClassSearchQuery,
          variables: props.refetchVariables
        }
      ],
      onError(err: ApolloError) {
        alert.error(getErrorMessage(err));
      },
      onCompleted() {
        onClose();
      }
    }
  );

  const handleScheduleChange = (idx: number) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setDates(
      dates.map((date, index) => (index === idx ? event.target.value : date))
    );
  };

  const removeSchedule = (idx: number) => {
    const diff = [...dates];
    diff.splice(idx, 1);
    setDates(diff);
  };

  const pushSchedule = () => {
    let newDate: DateTime;
    if (dates.length > 0) {
      newDate = DateTime.fromISO(dates[dates.length - 1]).plus({
        weeks: 1
      });
    } else {
      newDate = DateTime.local().plus({ days: 1 });
    }

    setDates([...dates, newDate.toISODate()]);
  };

  const renderSchedule = (schedule: string, idx: number, disabled: boolean) => {
    return (
      <ListItem key={idx} disableGutters>
        <TextField
          label={`Session ${idx + 1}`}
          type="date"
          name="date"
          required
          InputLabelProps={{
            shrink: true
          }}
          value={schedule}
          onChange={handleScheduleChange(idx)}
        />
        <ListItemSecondaryAction>
          <IconButton
            size="small"
            edge="end"
            disabled={disabled}
            onClick={() => removeSchedule(idx)}
          >
            <RemoveCircle />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>
    );
  };

  const onSubmit = (evt: React.FormEvent) => {
    evt.preventDefault();

    let schedules: [Date, Date][] = [];
    schedules = dates.map(s => {
      const start = DateTime.fromISO(`${s}T${startTime}`, tzOpts).toUTC();
      return [start.toJSDate(), start.plus({ minutes: duration }).toJSDate()];
    });

    return createClass({
      variables: {
        teacherId: props.teacherId,
        courseId: props.course.id,
        dialInLink,
        schedules
      }
    });
  };

  return (
    <>
      <Fab color="primary" size="small" onClick={onEdit}>
        <Add />
      </Fab>
      <ModalWrapper
        open={isEditing}
        maxWidth="sm"
        fullWidth
        onClose={onClose}
        title={props.course.name}
      >
        <DialogContent>
          <TextField
            value={dialInLink}
            type="url"
            fullWidth
            onChange={evt => setDialInLink(evt.target.value)}
            label="Zoom link"
            margin="normal"
            helperText="Leave blank, we will generate one automatically"
          />
          <TextField
            type="tel"
            value={duration}
            fullWidth
            required
            margin="normal"
            onChange={evt => setDuration(parseInt(evt.target.value))}
            label="Duration, min"
          />
          <TextField
            type="time"
            value={startTime}
            fullWidth
            required
            margin="normal"
            onChange={evt => setStartTime(evt.target.value)}
            label="Start time"
            InputLabelProps={{
              shrink: true
            }}
          />
          <List disablePadding dense>
            <ListSubheader disableGutters disableSticky>
              Class Dates
            </ListSubheader>
            {dates.map((classDate, idx) =>
              renderSchedule(classDate, idx, dates.length === 1)
            )}
            <Button
              color="primary"
              size="small"
              variant="outlined"
              onClick={pushSchedule}
            >
              Add a Session
            </Button>
          </List>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={onSubmit}
            color="primary"
            variant="contained"
            disabled={createResult.loading}
          >
            Submit
          </Button>
        </DialogActions>
      </ModalWrapper>
    </>
  );
}
