import { useQuery } from '@apollo/react-hooks';
import { Graphql } from '@cl/types';
import {
  Card,
  Chip,
  Grid,
  makeStyles,
  Tab,
  Tabs,
  Typography
} from '@material-ui/core';
import { BookmarkOutlined } from '@material-ui/icons';
import { ApolloError } from 'apollo-client';
import { AuthedNextPage, parseApolloError } from 'cl-next-app';
import { DateTime } from 'luxon';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import React from 'react';
import { useAlert } from 'react-alert';
import { logPageView } from '../../client/analytics';
import {
  GetClassroomQuery,
  GetClassroomResult
} from '../../client/classroom-queries';
import ClassInfoCard from '../../client/components/class-info-card';
import ThreadItem from '../../client/components/classroom/thread-item';
import Layout from '../../client/components/layout';

const PostEditor = dynamic(
  () => import('../../client/components/classroom/post-editor'),
  {
    ssr: false
  }
);

const ProjectEditor = dynamic(
  () => import('../../client/components/classroom/project-editor'),
  {
    ssr: false
  }
);

interface PageProps extends AuthedNextPage {
  id: string;
}

const useStyles = makeStyles(theme => ({
  hero: {
    overflow: 'hidden',
    marginBottom: theme.spacing(4),
    '&>header': {
      height: '14rem',
      backgroundSize: 'cover',
      backgroundImage: 'url("https://gstatic.com/classroom/themes/img_code.jpg")',
      position: 'relative',
      color: theme.palette.common.white,
      padding: theme.spacing(3)
    }
  },
  threads: {
    marginTop: theme.spacing(4),
    '&>div': {
      marginBottom: theme.spacing(2)
    }
  }
}));

export default function ClassroomPage(props: PageProps) {
  const alert = useAlert();
  const classes = useStyles({});
  const [editProject, setEditProject] = React.useState(false);

  const result = useQuery<GetClassroomResult, Graphql.IdArgs>(GetClassroomQuery, {
    fetchPolicy: 'cache-and-network',
    variables: { id: props.id },
    pollInterval: 60000
  });

  React.useEffect(() => logPageView('Classroom', { label: props.id }), [props.id]);

  if (!result.data) {
    return <Layout queryResult={result} />;
  }

  if (!result.data.classroom) {
    return (
      <Layout queryResult={result}>
        <Typography variant="h5" color="error">
          Classroom is not live yet
        </Typography>
      </Layout>
    );
  }

  const onError = (err: ApolloError) => {
    alert.error(parseApolloError(err).message, {
      timeout: 10000
    });
  };

  const { classroom } = result.data;
  const dstart = DateTime.fromISO(classroom.startDate);
  const dend = DateTime.fromISO(classroom.endDate);
  const now = DateTime.local();

  let subheader = '';
  if (dstart.plus({ hour: 1 }) < now) {
    subheader = 'Staring at ' + dstart.toFormat('DDDD');
  } else if (dend.minus({ hour: 1 }) > now) {
    subheader = 'Ended at ' + dend.toFormat('DDDD');
  } else {
    subheader = dstart.toFormat('t, D - ') + dend.toFormat('D');
  }

  return (
    <Layout>
      <Head>
        <title>Classroom | {classroom.course.name}</title>
      </Head>
      <Card className={classes.hero}>
        <header>
          <Typography variant="h4">{classroom.course.name}</Typography>
          <Typography variant="h6">{subheader}</Typography>
        </header>
      </Card>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Chip
            color="primary"
            icon={<BookmarkOutlined />}
            label="URL for Student"
            style={{ marginRight: 12 }}
          />
          <strong>{classroom.classroomUrl}</strong>
        </Grid>
        <Grid item xs={12} md={4}>
          <ClassInfoCard klass={classroom} me={props.me} />
        </Grid>
        <Grid item xs={12} md={8}>
          <Tabs
            value={editProject ? 1 : 0}
            onChange={(evt, val) => setEditProject(Boolean(val))}
          >
            <Tab label="Comments" />
            <Tab label="Share Project" />
          </Tabs>
          {editProject ? (
            <ProjectEditor
              me={props.me}
              classId={classroom.id}
              onError={onError}
              onClose={() => setEditProject(false)}
            />
          ) : (
            <PostEditor me={props.me} classId={classroom.id} onError={onError} />
          )}
          <div className={classes.threads}>
            {classroom.threads.map(thread => (
              <ThreadItem
                key={thread.id}
                me={props.me}
                classId={classroom.id}
                thread={thread}
                onError={onError}
              />
            ))}
          </div>
        </Grid>
      </Grid>
    </Layout>
  );
}
