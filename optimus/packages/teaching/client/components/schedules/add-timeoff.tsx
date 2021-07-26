import { useMutation } from '@apollo/react-hooks';
import { Graphql, TokenPayload } from '@cl/types';
import {
  Button,
  DialogActions,
  DialogContent,
  TextField,
  Typography
} from '@material-ui/core';
import { ApolloError } from 'apollo-client';
import { getErrorMessage } from 'cl-next-app';
import gql from 'graphql-tag';
import { DateTime } from 'luxon';
import React from 'react';
import { useAlert } from 'react-alert';
import ModalWrapper from '../modal-wrapper';

interface Props {
  me: TokenPayload;
  onClose: () => void;
}

const AddTimeOffMutation = gql`
  mutation($teacherId: ID!, $start: DateTime!, $end: DateTime!) {
    setTeacherTimeOff(teacherId: $teacherId, start: $start, end: $end) {
      id
      timeoffs {
        id
        start
        end
      }
    }
  }
`;

export default function AddTimeoffModal(props: Props) {
  const alert = useAlert();

  const tomorrow = DateTime.local().plus({ day: 1 }).startOf('day');

  const [fromTime, setFrom] = React.useState(
    tomorrow.set({ hour: 8 }).toISO({ includeOffset: false, suppressSeconds: true })
  );

  const [toTime, setTo] = React.useState(
    tomorrow.set({ hour: 20 }).toISO({ includeOffset: false, suppressSeconds: true })
  );

  const [addTimeoff, result] = useMutation<any, Graphql.AddTeacherTimeOffVars>(
    AddTimeOffMutation,
    {
      onError(err: ApolloError) {
        alert.error(getErrorMessage(err), {
          timeout: 5000
        });
      },
      onCompleted() {
        props.onClose();
      }
    }
  );

  return (
    <ModalWrapper
      open
      maxWidth="sm"
      fullWidth
      onClose={props.onClose}
      title="Request a Timeoff"
    >
      <form
        onSubmit={evt => {
          evt.preventDefault();
          const start = new Date(fromTime);
          const end = new Date(toTime);
          if (start < end) {
            addTimeoff({
              variables: {
                teacherId: props.me.teacherId,
                start,
                end
              }
            });
          }
        }}
      >
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            Not available during your regular schedules? Add a timeoff request to
            prevent future assignments. Remember that, this action will not affect
            classes already assigned, to change these classes, please reach out to
            teacher support.
          </Typography>

          <TextField
            value={fromTime}
            type="datetime-local"
            inputProps={{
              min: tomorrow.toISO({ includeOffset: false })
            }}
            fullWidth
            margin="normal"
            onChange={evt => setFrom(evt.target.value)}
            label="From"
            required
          />
          <TextField
            value={toTime}
            type="datetime-local"
            inputProps={{
              min: tomorrow.toISO({ includeOffset: false })
            }}
            fullWidth
            margin="normal"
            onChange={evt => setTo(evt.target.value)}
            label="To"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose}>Cancel</Button>
          <Button
            type="submit"
            color="primary"
            variant="contained"
            disabled={result.loading}
          >
            Submit
          </Button>
        </DialogActions>
      </form>
    </ModalWrapper>
  );
}
