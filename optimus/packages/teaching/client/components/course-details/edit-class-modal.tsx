import { useMutation } from '@apollo/react-hooks';
import { Graphql } from '@cl/types';
import {
  Button,
  DialogActions,
  DialogContent,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListSubheader,
  TextField
} from '@material-ui/core';
import { RemoveCircle } from '@material-ui/icons';
import { getErrorMessage } from 'cl-next-app';
import gql from 'graphql-tag';
import { DateTime } from 'luxon';
import React from 'react';
import { useAlert } from 'react-alert';
import { Class, ClassDetailsFragment } from '../../data-types';
import ModalWrapper from '../modal-wrapper';

interface Props {
  teacherId: string;
  klass: Class;
  onClose: () => void;
}

const UpdateClassStatusMutation = gql`
  mutation($id: ID!, $active: Boolean!) {
    updateClassStatus(id: $id, active: $active) {
      id
      active
    }
  }
`;

const UpdateClassMutation = gql`
  ${ClassDetailsFragment}
  mutation(
    $id: ID!
    $teacherId: ID!
    $schedules: [[DateTime]]!
    $dialInLink: String
  ) {
    updateClass(
      id: $id
      schedules: $schedules
      dialInLink: $dialInLink
      teacherId: $teacherId
      skipVerification: true
    ) {
      ...ClassDetailsFragment
    }
  }
`;

type Session = [string, string, string];

export default function EditClassModal(props: Props) {
  const alert = useAlert();

  const [dialInLink, setDialInLink] = React.useState(props.klass.dialInLink);
  const [sessions, setSessions] = React.useState<Session[]>(
    props.klass.sessions.map(ses => {
      const start = DateTime.fromISO(ses.startDate);
      const end = DateTime.fromISO(ses.endDate);
      return [
        start.toISODate(),
        start.toISOTime({ includeOffset: false }),
        end.toISOTime({ includeOffset: false })
      ];
    })
  );

  const [updateClassStatus, updateClassStatusResult] = useMutation<
    any,
    Graphql.UpdateClassStatusArgs
  >(UpdateClassStatusMutation, {
    variables: {
      id: props.klass.id,
      active: !props.klass.active
    },
    onError(err) {
      alert.error(getErrorMessage(err));
    },
    onCompleted() {
      props.onClose();
    }
  });

  const [updateClass, updateClassResult] = useMutation<any, Graphql.UpdateClassVars>(
    UpdateClassMutation,
    {
      onError(err) {
        alert.error(getErrorMessage(err));
      },
      onCompleted() {
        props.onClose();
      }
    }
  );

  const updateSession = (idx: number, session?: Session) => {
    const diff = [...sessions];

    if (session) {
      diff.splice(idx, 1, session);
    } else {
      diff.splice(idx, 1);
    }

    setSessions(diff);
  };

  return (
    <ModalWrapper
      open
      maxWidth="sm"
      fullWidth
      onClose={props.onClose}
      title={props.klass.course.name}
    >
      <DialogContent>
        <TextField
          value={dialInLink}
          type="url"
          fullWidth
          margin="normal"
          onChange={evt => setDialInLink(evt.target.value)}
          label="Zoom link"
          helperText="Leave blank, we will generate one automatically"
        />
        <List dense>
          <ListSubheader disableGutters disableSticky>
            Class Schedules
          </ListSubheader>
          {sessions.map((ses, idx) => (
            <ListItem disableGutters key={idx}>
              <Grid container spacing={1}>
                <Grid item>
                  <TextField
                    label={`Session ${idx + 1}`}
                    type="date"
                    value={ses[0]}
                    onChange={evt =>
                      updateSession(idx, [evt.target.value, ses[1], ses[2]])
                    }
                  />
                </Grid>
                <Grid item>
                  <TextField
                    label="start"
                    type="time"
                    value={ses[1]}
                    onChange={evt =>
                      updateSession(idx, [ses[0], evt.target.value, ses[2]])
                    }
                  />
                </Grid>
                <Grid item xs>
                  <TextField
                    label="end"
                    type="time"
                    value={ses[2]}
                    onChange={evt =>
                      updateSession(idx, [ses[0], ses[1], evt.target.value])
                    }
                  />
                </Grid>
              </Grid>
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => updateSession(idx)}
                  disabled={sessions.length <= 1}
                >
                  <RemoveCircle />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
          <Button
            color="primary"
            size="small"
            variant="outlined"
            onClick={() => {
              const last = sessions[sessions.length - 1];
              updateSession(sessions.length, [
                DateTime.fromISO(last[0]).plus({ week: 1 }).toISODate(),
                last[1],
                last[2]
              ]);
            }}
          >
            Add a Session
          </Button>
        </List>
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          disabled={updateClassStatusResult.loading}
          onClick={() => updateClassStatus()}
        >
          {props.klass.active ? 'Take Down' : 'List on Homepage'}
        </Button>

        <Button
          color="primary"
          variant="contained"
          disabled={updateClassResult.loading}
          onClick={() =>
            updateClass({
              variables: {
                id: props.klass.id,
                teacherId: props.teacherId,
                dialInLink,
                schedules: sessions.map(ses => [
                  new Date(ses[0] + 'T' + ses[1]),
                  new Date(ses[0] + 'T' + ses[2])
                ])
              }
            })
          }
        >
          Save
        </Button>
      </DialogActions>
    </ModalWrapper>
  );
}
