import { useMutation } from '@apollo/react-hooks';
import { Graphql } from '@cl/types';
import { Button, DialogActions, DialogContent, Typography } from '@material-ui/core';
import { ApolloError } from 'apollo-client';
import { getErrorMessage } from 'cl-next-app';
import gql from 'graphql-tag';
import React from 'react';
import { useAlert } from 'react-alert';
import ModalWrapper from '../modal-wrapper';

interface Props {
  timeoffId: string;
  onClose: () => void;
}

const RemoveTimeOffMutation = gql`
  mutation($id: ID!) {
    removeTeacherTimeOff(id: $id) {
      id
      timeoffs {
        id
        start
        end
      }
    }
  }
`;

export default function RemoveTimeoffModal(props: Props) {
  const alert = useAlert();
  const [removeTimeoff, result] = useMutation<any, Graphql.IdArgs>(
    RemoveTimeOffMutation,
    {
      onError(err: ApolloError) {
        alert.error(getErrorMessage(err), {
          timeout: 5000
        });
      },
      variables: {
        id: props.timeoffId
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
      title="Delete a Timeoff"
    >
      <form
        onSubmit={evt => {
          evt.preventDefault();
          removeTimeoff();
        }}
      >
        <DialogContent>
          <Typography variant="subtitle1">
            Change your plan? Delete this timeoff request and start accepting new
            assignments.
          </Typography>
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
