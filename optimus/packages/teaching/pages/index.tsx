import { useQuery } from '@apollo/react-hooks';
import {
  Box,
  Button,
  FormControlLabel,
  Grid,
  Radio,
  RadioGroup
} from '@material-ui/core';
import { EventBusy, OpenInBrowser } from '@material-ui/icons';
import { emailDomain } from 'cl-common';
import { AuthedNextPage } from 'cl-next-app';
import { DateTime } from 'luxon';
import Router from 'next/router';
import React from 'react';
import {
  TeacherAssignmentsQuery,
  TeacherAssignmentsResult
} from '../client/class-queries';
import HomeFeed from '../client/components/home-feed';
import Layout from '../client/components/layout';
import AddTimeoff from '../client/components/schedules/add-timeoff';
import TeacherCalendar from '../client/components/schedules/teacher-calendar';

const monthly = 'monthly';
const weekly = 'weekly';

interface Props extends AuthedNextPage {
  view?: string;
  teacherId?: string;
}

function getMaxDate(d1: DateTime, d2: DateTime) {
  return d1 > d2 ? d1.toJSDate() : d2.toJSDate();
}

function getMinDate(d1: DateTime, d2: DateTime) {
  return d1 < d2 ? d1.toJSDate() : d2.toJSDate();
}

export default function IndexPage(props: Props) {
  const [defaultDate, setDefaultDate] = React.useState(DateTime.local());
  const [view, selectView] = React.useState(props.view || weekly);
  const [isTimeoffOpen, toggleTimeoffModal] = React.useState(false);

  const from = getMinDate(defaultDate.startOf('month'), defaultDate.startOf('week'));
  const to = getMaxDate(defaultDate.endOf('month'), defaultDate.endOf('week'));

  let teacherId = props.me.teacherId;
  if (props.teacherId && props.me.isAdmin) {
    teacherId = props.teacherId;
  }

  const result = useQuery<TeacherAssignmentsResult>(TeacherAssignmentsQuery, {
    variables: {
      teacherId,
      from,
      to
    }
  });

  const onToggleView = (evt: React.ChangeEvent<HTMLInputElement>) => {
    selectView(evt.target.value);
    Router.push(
      {
        pathname: '/',
        query: {
          view: evt.target.value
        }
      },
      undefined,
      {
        shallow: true
      }
    );
  };

  return (
    <Layout queryResult={result}>
      {isTimeoffOpen && (
        <AddTimeoff me={props.me} onClose={() => toggleTimeoffModal(false)} />
      )}
      {result.data && (
        <Grid container spacing={4}>
          {props.me.teacherId === result.data.teacher.id && (
            <Grid item xs={12} md={3}>
              <HomeFeed teacher={result.data.teacher} />
              {props.me.email.includes(emailDomain) && (
                <Button
                  href="https://sites.google.com/createandlearn.us/information-for-teachers/home"
                  target="_blank"
                  rel="noopener noreferrer"
                  color="primary"
                  variant="outlined"
                  size="small"
                  endIcon={<OpenInBrowser />}
                  fullWidth
                  style={{ marginTop: 32, marginBottom: 32 }}
                >
                  Teacher Portal
                </Button>
              )}
              <Box boxShadow={2} borderRadius={5}>
                <a
                  href="https://cdn.create-learn.us/Class+Checklist.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src="/checklist.png" style={{ maxWidth: '100%' }} />
                </a>
              </Box>
            </Grid>
          )}
          <Grid item xs={12} md={9}>
            <Box
              display="flex"
              mb={2}
              justifyContent="space-between"
              alignItems="center"
            >
              <RadioGroup value={view} row onChange={onToggleView}>
                <FormControlLabel
                  value={monthly}
                  control={<Radio color="primary" />}
                  label="Month"
                />
                <FormControlLabel
                  value={weekly}
                  control={<Radio color="primary" />}
                  label="Week"
                />
              </RadioGroup>
              <Button
                size="small"
                color="primary"
                startIcon={<EventBusy />}
                onClick={() => toggleTimeoffModal(true)}
              >
                Timeoff
              </Button>
            </Box>
            <TeacherCalendar
              monthly={view === monthly}
              defaultDate={defaultDate}
              setDefaultDate={setDefaultDate}
              teacher={result.data.teacher}
            />
          </Grid>
        </Grid>
      )}
    </Layout>
  );
}
