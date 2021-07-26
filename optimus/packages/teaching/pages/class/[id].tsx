import { useMutation, useQuery } from '@apollo/react-hooks';
import { Graphql } from '@cl/types';
import { Grid } from '@material-ui/core';
import { AuthedNextPage } from 'cl-next-app';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import React from 'react';
import { ClassRosterQuery, ClassRosterResult } from '../../client/class-queries';
import ClassInfoCard from '../../client/components/class-info-card';
import ClassRecordings from '../../client/components/class-recordings';
import ManageAttendances from '../../client/components/feedback/manage-attendances';
import Layout from '../../client/components/layout';
import TrialPromotion from '../../client/components/trial-promotion';
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

export default function ClassPage(props: PageProps) {
  const rosterResult = useQuery<ClassRosterResult, Graphql.IdArgs>(
    ClassRosterQuery,
    {
      fetchPolicy: 'cache-and-network',
      pollInterval: 15 * 60 * 1000, // prevent stale data after teacher keeps the tab open for too long
      variables: { id: props.id }
    }
  );

  const [updateGender, updateGenderStatus] = useMutation<
    UpdateGenderData,
    Graphql.EditStudentProfileArgs
  >(UpdateGenderMutation, {
    update(store, result) {
      if (rosterResult.data && result.data) {
        for (const er of rosterResult.data.class.enrollments) {
          if (er.student.id === result.data.editStudentProfile.id) {
            er.student.gender = result.data.editStudentProfile.gender;
          }
          store.writeQuery({
            query: ClassRosterQuery,
            variables: rosterResult.variables,
            data: rosterResult.data
          });
        }
      }
    }
  });

  const klass = rosterResult.data?.class;
  if (!klass) {
    return <Layout queryResult={rosterResult} />;
  }

  return (
    <Layout>
      <Head>
        <title>{klass.course.name} class | Teaching Portal</title>
      </Head>
      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <ClassInfoCard klass={klass} me={props.me} />
          <TrialPromotion course={klass.course} />
          <ClassRecordings classId={klass.id} classTime={klass.startDate} />
        </Grid>
        {klass.enrollments.length > 0 ? (
          <Grid item xs={12} md={8}>
            <ManageAttendances klass={klass} roster={klass.enrollments} />
            {klass.teacher?.id === props.me.teacherId && (
              <CommunicationManager
                klass={klass}
                coupon={klass.course.offer}
                students={klass.enrollments.map(er => er.student)}
                updateGender={updateGender}
                isUpdatingGender={updateGenderStatus.loading}
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
