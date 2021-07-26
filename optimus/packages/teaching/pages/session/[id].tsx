import { useMutation, useQuery } from '@apollo/react-hooks';
import { Graphql } from '@cl/types';
import { Grid } from '@material-ui/core';
import { AuthedNextPage } from 'cl-next-app';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import React from 'react';
import { SessionRosterQuery, SessionRosterResult } from '../../client/class-queries';
import ClassInfoCard from '../../client/components/class-info-card';
import ClassRecordings from '../../client/components/class-recordings';
import ManageAttendances from '../../client/components/feedback/manage-attendances';
import StudentsHistory from '../../client/components/feedback/students-history';
import Layout from '../../client/components/layout';
import Recommendations from '../../client/components/recommendations';
import {
  UpdateGenderData,
  UpdateGenderMutation
} from '../../client/teacher-queries';

interface PageProps extends AuthedNextPage {
  id: string;
}

const CommunicationManager = dynamic(
  () => import('../../client/components/feedback/communication-manager'),
  {
    ssr: false
  }
);

export default function SessionPage(props: PageProps) {
  const rosterResult = useQuery<SessionRosterResult, Graphql.IdArgs>(
    SessionRosterQuery,
    {
      fetchPolicy: 'cache-and-network',
      pollInterval: 30 * 60 * 1000, // prevent stale data after teacher keeps the tab open for too long
      variables: { id: props.id }
    }
  );

  const [updateGender, updateGenderStatus] = useMutation<
    UpdateGenderData,
    Graphql.EditStudentProfileArgs
  >(UpdateGenderMutation, {
    update(store, result) {
      if (rosterResult.data && result.data) {
        for (const seat of rosterResult.data.session.roster) {
          if (seat.student.id === result.data.editStudentProfile.id) {
            seat.student.gender = result.data.editStudentProfile.gender;
          }
          store.writeQuery({
            query: SessionRosterQuery,
            variables: rosterResult.variables,
            data: rosterResult.data
          });
        }
      }
    }
  });

  const session = rosterResult.data?.session;
  if (!session) {
    return <Layout queryResult={rosterResult} />;
  }

  return (
    <Layout>
      <Head>
        <title>
          {session.class.course.name} session {session.idx + 1} | Teaching Portal
        </title>
      </Head>
      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <ClassInfoCard klass={session.class} idx={session.idx} me={props.me} />
          <ClassRecordings classId={session.classId} classTime={session.startDate} />
        </Grid>
        {session.roster.length > 0 ? (
          <Grid item xs={12} md={8}>
            <ManageAttendances
              klass={session.class}
              sessionId={session.id}
              roster={session.roster}
            />
            {session.class.teacher?.id === props.me.teacherId && (
              <CommunicationManager
                klass={session.class}
                students={session.roster.map(seat => seat.student)}
                updateGender={updateGender}
                isUpdatingGender={updateGenderStatus.loading}
              />
            )}
            {session.class.course.isRegular && session.idx >= 2 && (
              <Recommendations session={session} />
            )}
            {session.class.course.isRegular && (
              <StudentsHistory
                classId={session.classId}
                teacherId={session.class.teacherId}
              />
            )}
          </Grid>
        ) : (
          <Grid item xs={12} md={8}>
            No student enrolled yet
          </Grid>
        )}
      </Grid>
    </Layout>
  );
}
