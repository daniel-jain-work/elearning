import { Container, Paper } from '@material-ui/core';
import { useRouter } from 'next/router';
import * as React from 'react';
import SignInForm from '../client/components/sign-in-form';

export default function SignIn() {
  const router = useRouter();

  return (
    <Container maxWidth="sm">
      <Paper style={{ marginTop: 50 }}>
        <SignInForm
          onSuccess={() => {
            let nextUrl = '/';
            if (typeof router.query.next === 'string') {
              nextUrl = router.query.next;
            }
            router.replace(nextUrl);
          }}
        />
      </Paper>
    </Container>
  );
}
