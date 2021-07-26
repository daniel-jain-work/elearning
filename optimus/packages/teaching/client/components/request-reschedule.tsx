import { useMutation } from '@apollo/react-hooks';
import { Graphql } from '@cl/types';
import {
  Button,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography
} from '@material-ui/core';
import { EventBusy } from '@material-ui/icons';
import { getErrorMessage } from 'cl-next-app';
import { DateTime } from 'luxon';
import React from 'react';
import { useAlert } from 'react-alert';
import { ClassDetails } from '../data-types';
import { RequestReassignMutation } from '../teacher-queries';

export default function RequestReschedule({ klass }: { klass: ClassDetails }) {
  const alert = useAlert();
  const [isModalOpen, toggleModal] = React.useState(false);
  const [reason, setReason] = React.useState('');

  const closeModal = () => toggleModal(false);
  const openModal = () => toggleModal(true);

  const [requestReassign, reassignResult] = useMutation<
    any,
    Graphql.RequestReassignArgs
  >(RequestReassignMutation, {
    variables: {
      classId: klass.id,
      reason
    },
    onCompleted: () => {
      closeModal();
      alert.success('You are all set! Thanks for letting us know.', {
        timeout: 10000
      });
    },
    onError(err) {
      alert.error(getErrorMessage(err), { timeout: 5000 });
    }
  });

  if (
    (!klass.course.isRegular && !klass.course.isTrial) ||
    DateTime.fromISO(klass.startDate).diffNow('minutes').minutes < 30
  ) {
    return null;
  }

  return (
    <CardContent>
      <Button
        variant="outlined"
        size="small"
        style={{ width: '100%', marginBottom: 8 }}
        onClick={openModal}
        startIcon={<EventBusy />}
      >
        Request Reschedule
      </Button>
      <Typography color="textSecondary" variant="body2" align="center">
        No longer available to teach this class?
      </Typography>
      <Dialog open={isModalOpen} onClose={closeModal} maxWidth="sm" fullWidth>
        <form
          onSubmit={evt => {
            evt.preventDefault();
            requestReassign();
          }}
        >
          <DialogTitle>Request a Change</DialogTitle>
          <DialogContent>
            File this request will reassign the class to another teacher, if you want
            to instead reschedule the class to a different time, please reach out to
            teacher support as usual.
          </DialogContent>
          <DialogContent>
            <TextField
              multiline
              label="Leave a note"
              rows={2}
              variant="outlined"
              fullWidth
              value={reason}
              required
              onChange={evt => setReason(evt.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeModal}>Cancel</Button>
            <Button
              disabled={reassignResult.loading}
              variant="contained"
              color="primary"
              type="submit"
            >
              Submit
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </CardContent>
  );
}
