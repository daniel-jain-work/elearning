import { ApolloProvider } from '@apollo/react-common';
import { Dialog, DialogTitle } from '@material-ui/core';
import { getApolloClient } from 'cl-next-app';
import React from 'react';
import SignInForm from './sign-in-form';

interface Props {
  children: any;
}

export default function ApolloWrapper(props: Props) {
  const [sessionExpired, setSessionExpired] = React.useState(false);
  const onClose = () => {
    window.location.reload();
  };

  const apolloClient = getApolloClient({
    handleUnauthenticated() {
      setSessionExpired(true);
    }
  });

  return (
    <ApolloProvider client={apolloClient}>
      <Dialog open={sessionExpired} onClose={onClose}>
        <DialogTitle>Session Expired</DialogTitle>
        <SignInForm onSuccess={onClose} />
      </Dialog>
      {props.children}
    </ApolloProvider>
  );
}
