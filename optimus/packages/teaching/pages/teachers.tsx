import { useQuery } from '@apollo/react-hooks';
import { Button, Card, CardActions, CardHeader, Grid } from '@material-ui/core';
import { AuthedNextPage } from 'cl-next-app';
import gql from 'graphql-tag';
import NextLink from 'next/link';
import React from 'react';
import Layout from '../client/components/layout';
import UserAvatar from '../client/components/user-avatar';
import { Teacher, TeacherFragment } from '../client/data-types';

const TeachersQuery = gql`
  ${TeacherFragment}
  query {
    teachers {
      ...TeacherFragment
    }
  }
`;

export default function TeachersPage(props: AuthedNextPage) {
  const result = useQuery<{ teachers: Teacher[] }>(TeachersQuery, {
    skip: !props.me.isAdmin
  });

  const teachers = (result.data && result.data.teachers) || [];

  return (
    <Layout queryResult={result}>
      <Grid container spacing={3}>
        {teachers.map(t => (
          <Grid key={t.id} item xs={12} sm={6} md={4} lg={3}>
            <Card>
              <CardHeader
                avatar={<UserAvatar user={t} />}
                title={t.fullName}
                subheader={t.email}
              />
              <CardActions>
                <NextLink
                  href={{ pathname: '/', query: { teacherId: t.id } }}
                  passHref
                >
                  <Button size="small" color="primary">
                    Schedules
                  </Button>
                </NextLink>
                <NextLink
                  href={{ pathname: '/courses', query: { teacherId: t.id } }}
                  passHref
                >
                  <Button size="small" color="primary">
                    Courses
                  </Button>
                </NextLink>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Layout>
  );
}
