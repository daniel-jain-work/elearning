import { useMutation } from '@apollo/react-hooks';
import { Graphql } from '@cl/types';
import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader
} from '@material-ui/core';
import { parseApolloError } from 'cl-next-app';
import omit from 'lodash/omit';
import React from 'react';
import { useAlert } from 'react-alert';
import { ChangePasswordMutation } from '../teacher-queries';
import TextInput from './text-input';

export default function ResetPassword(props: { id: string }) {
  const alert = useAlert();

  const [previous, setPrevious] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setContfirm] = React.useState('');
  const [errors, setErrors] = React.useState({});

  const [changePassword, passwordState] = useMutation<
    any,
    Graphql.UpdatePasswordArgs
  >(ChangePasswordMutation, {
    variables: {
      id: props.id,
      previous,
      password
    },
    onCompleted: () => {
      alert.success('Password is updated successfully', {
        timeout: 5000
      });
    },
    onError(err) {
      const { message, details } = parseApolloError(err);
      alert.error(message, { timeout: 8000 });
      setErrors(details);
    }
  });

  return (
    <form
      onSubmit={evt => {
        evt.preventDefault();
        if (!password || !confirm || password !== confirm) {
          return setErrors({
            confirm: "These passwords don't match. Try again?"
          });
        }

        setErrors({});
        return changePassword({
          variables: {
            id: props.id,
            password,
            previous
          }
        });
      }}
    >
      <Card>
        <CardHeader title="Password Settings" />
        <CardContent>
          <TextInput
            margin="normal"
            name="previous"
            type="password"
            value={previous}
            errors={errors}
            label="Current Password"
            required
            onChange={evt => {
              setPrevious(evt.target.value);
            }}
          />

          <TextInput
            margin="normal"
            name="password"
            type="password"
            value={password}
            errors={errors}
            label="New Password"
            required
            onChange={evt => {
              setPassword(evt.target.value);
              setErrors(omit(errors, 'previous', 'confirm'));
            }}
          />

          <TextInput
            margin="normal"
            name="confirm"
            type="password"
            value={confirm}
            errors={errors}
            label="Confirm New Password"
            required
            onChange={evt => {
              setContfirm(evt.target.value);
              setErrors(omit(errors, 'previous', 'confirm'));
            }}
          />
        </CardContent>
        <CardActions>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={passwordState.loading}
          >
            Update Password
          </Button>
        </CardActions>
      </Card>
    </form>
  );
}
