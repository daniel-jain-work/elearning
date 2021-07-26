import { useLazyQuery } from '@apollo/react-hooks';
import { Graphql } from '@cl/types';
import {
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@material-ui/core';
import { PlayCircleFilled } from '@material-ui/icons';
import gql from 'graphql-tag';
import { DateTime } from 'luxon';
import React from 'react';
import { logEvent } from '../analytics';
import LazyLoader from './lazy-loader';

const GetRecordingsQuery = gql`
  query($id: ID!) {
    class(id: $id) {
      id
      recordings {
        password
        playUrl
        start
      }
    }
  }
`;

interface GetRecordingsResult {
  class: Graphql.IdArgs & {
    recordings?: {
      password: string;
      playUrl: string;
      start: string;
    }[];
  };
}

export default function ClassRecordings(props: {
  classId: string;
  classTime: string;
}) {
  const [getClassRecordings, recordingsResult] = useLazyQuery<
    GetRecordingsResult,
    Graphql.IdArgs
  >(GetRecordingsQuery, {
    variables: {
      id: props.classId
    }
  });

  const ct = DateTime.fromISO(props.classTime);
  if (
    ct > DateTime.local().minus({ hours: 2 }) ||
    ct < DateTime.local().minus({ weeks: 2 })
  ) {
    return null;
  }

  const recordings = recordingsResult.data?.class?.recordings || [];

  return (
    <LazyLoader
      loading={recordingsResult.loading}
      summary={<Typography variant="subtitle1">Class Recordings</Typography>}
      onExpanded={() => getClassRecordings()}
    >
      {recordings.length > 0 ? (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell variant="head" colSpan={2}>
                Audio
              </TableCell>
              <TableCell variant="head" align="right">
                Password
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recordings.map((data, idx) => (
              <TableRow key={idx}>
                <TableCell>{DateTime.fromISO(data.start).toFormat('D t')}</TableCell>
                <TableCell>
                  <IconButton
                    href={data.playUrl}
                    color="primary"
                    onClick={() =>
                      logEvent('Recording Playback', {
                        label: props.classId
                      })
                    }
                  >
                    <PlayCircleFilled />
                  </IconButton>
                </TableCell>
                <TableCell align="right">
                  <Chip label={data.password} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        'No Recordings found'
      )}
    </LazyLoader>
  );
}
