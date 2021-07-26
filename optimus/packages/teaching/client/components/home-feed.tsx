import {
  Card,
  CardHeader,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@material-ui/core';
import { History, Settings, WatchLater } from '@material-ui/icons';
import { DateTime } from 'luxon';
import NextLink from 'next/link';
import React from 'react';
import { TeacherAssignmentsResult } from '../class-queries';
import UserAvatar from './user-avatar';

export default function HomeFeed(props: TeacherAssignmentsResult) {
  const now = DateTime.local();
  const earlist = now.minus({ hours: 40 });
  const latest = now.plus({ hours: 40 });

  return (
    <Card elevation={0}>
      <CardHeader
        title={props.teacher.fullName}
        avatar={<UserAvatar user={props.teacher} />}
        action={
          <NextLink href="/settings" passHref>
            <IconButton>
              <Settings />
            </IconButton>
          </NextLink>
        }
      />
      <List dense disablePadding>
        {props.teacher.sessions.map(ses => {
          const startTime = DateTime.fromISO(ses.startDate);
          if (startTime < earlist || startTime > latest) {
            return null;
          }

          let title = ses.class.course.name;
          if (ses.idx > 0) {
            title += `, session ${ses.idx + 1}`;
          }

          return (
            <ListItem key={ses.id}>
              <ListItemIcon>
                {startTime < now ? <History /> : <WatchLater color="primary" />}
              </ListItemIcon>
              <ListItemText
                primary={title}
                secondary={startTime.toLocaleString(DateTime.DATETIME_MED)}
              />
            </ListItem>
          );
        })}
      </List>
    </Card>
  );
}
