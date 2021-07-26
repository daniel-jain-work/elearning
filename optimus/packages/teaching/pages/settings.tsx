import { useMutation, useQuery } from '@apollo/react-hooks';
import { Graphql } from '@cl/types';
import { Grid } from '@material-ui/core';
import { AuthedNextPage, getErrorMessage } from 'cl-next-app';
import React from 'react';
import { useAlert } from 'react-alert';
import AvailabilitySettings from '../client/components/availability-settings';
import Layout from '../client/components/layout';
import ProfileSettings from '../client/components/profile-settings';
import ResetPassword from '../client/components/reset-password';
import {
  EditTeacherMutation,
  TeacherProfile,
  TeacherProfileQuery,
  UpdateAvailabilitiesMutation
} from '../client/teacher-queries';

export default function SettingsPage(props: AuthedNextPage) {
  const alert = useAlert();

  const result = useQuery<{ teacher: TeacherProfile }, Graphql.IdArgs>(
    TeacherProfileQuery,
    {
      variables: { id: props.me.teacherId }
    }
  );

  const [editTeacher, editTeacherResult] = useMutation<any, Graphql.EditTeacherVars>(
    EditTeacherMutation,
    {
      onError(err) {
        alert.error(getErrorMessage(err));
      },
      onCompleted() {
        alert.success('Profile setting updated', {
          timeout: 5000
        });
      }
    }
  );

  const [updateAvailabilities, updateAvailabilitiesResult] = useMutation<
    any,
    Graphql.UpdateTeacherAvailabilitiesVars
  >(UpdateAvailabilitiesMutation, {
    onError(err) {
      alert.error(getErrorMessage(err));
    },
    onCompleted() {
      alert.success('Working hours updated', {
        timeout: 5000
      });
    }
  });

  const teacher = result.data && result.data.teacher;

  return (
    <Layout queryResult={result}>
      {teacher && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <ProfileSettings
              teacher={teacher}
              loading={editTeacherResult.loading}
              handleSubmit={editTeacher}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <AvailabilitySettings
              teacher={teacher}
              loading={updateAvailabilitiesResult.loading}
              handleSubmit={updateAvailabilities}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <ResetPassword id={props.me.userId} />
          </Grid>
        </Grid>
      )}
    </Layout>
  );
}
