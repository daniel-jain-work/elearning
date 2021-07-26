import { useMutation } from '@apollo/react-hooks';
import { Graphql, TokenPayload } from '@cl/types';
import { Avatar, Button, LinearProgress, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { canonicalUrl, commonRoutes, defaultAvatarUrl } from 'cl-common';
import { parseApolloError, setPassport } from 'cl-next-app';
import gql from 'graphql-tag';
import * as React from 'react';
import TextInput from './text-input';

const UserLoginMutation = gql`
  mutation($email: String!, $password: String!) {
    userLogin(email: $email, password: $password, teacherOnly: true) {
      userId: id
      teacherId
      isAdmin
      isOps
      email
    }
  }
`;

const useStyles = makeStyles(theme => ({
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: theme.spacing(3),
    position: 'relative'
  },
  avatar: {
    margin: theme.spacing(3, 1, 1, 1),
    backgroundColor: theme.palette.secondary.main,
    width: 80,
    height: 80
  },
  form: {
    marginTop: theme.spacing(1),
    display: 'block'
  },
  submit: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(1)
  }
}));

interface Props {
  onSuccess: () => void;
}

export default function SignInForm(props: Props) {
  const classes = useStyles({});

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errors, setErrors] = React.useState({});

  const [handleLogin, loginState] = useMutation<
    { userLogin: TokenPayload },
    Graphql.LoginArgs
  >(UserLoginMutation, {
    variables: {
      email,
      password
    },
    onError(err) {
      setErrors(parseApolloError(err).details);
    },
    onCompleted(data) {
      setPassport(data.userLogin);
      props.onSuccess();
    }
  });

  return (
    <div className={classes.wrapper}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          display: loginState.loading ? 'block' : 'none'
        }}
      >
        <LinearProgress color="secondary" />
      </div>
      <Avatar className={classes.avatar} src={defaultAvatarUrl} />
      <Typography variant="h5">Sign in as a Teacher</Typography>

      <form
        className={classes.form}
        onSubmit={evt => {
          evt.preventDefault();
          handleLogin();
        }}
      >
        <TextInput
          margin="normal"
          name="email"
          type="email"
          value={email}
          errors={errors}
          label="Your Create & Learn Email"
          required
          autoComplete="username"
          onChange={evt => {
            setEmail(evt.target.value);
            setErrors({ ...errors, email: null });
          }}
        />

        <TextInput
          margin="normal"
          name="password"
          type="password"
          value={password}
          errors={errors}
          label="Your Password"
          autoComplete="current-password"
          required
          onChange={evt => {
            setPassword(evt.target.value);
            setErrors({ ...errors, password: null });
          }}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          disabled={loginState.loading}
          className={classes.submit}
        >
          Sign In
        </Button>

        <Button fullWidth href={canonicalUrl + commonRoutes.forgotPassword}>
          Forget Password?
        </Button>
      </form>
    </div>
  );
}
