import { TokenPayload } from '@cl/types';
import {
  Card,
  CardContent,
  CardHeader,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@material-ui/core';
import {
  BookmarkSharp,
  CommentSharp,
  PeopleAltSharp,
  VideoCallSharp
} from '@material-ui/icons';
import { DateTime } from 'luxon';
import NextLink from 'next/link';
import React from 'react';
import { logPageView } from '../analytics';
import { ClassDetails, Session } from '../data-types';
import RequestReschedule from './request-reschedule';
import StartZoomMeeting from './start-zoom-meeting';
import UserAvatar from './user-avatar';

export default class ClassInfoCard extends React.PureComponent<{
  klass: ClassDetails;
  idx?: number;
  me: TokenPayload;
}> {
  componentDidMount() {
    logPageView('ClassDetails', {
      label: this.props.klass.id,
      variant: this.props.klass.course.name
    });
  }

  renderTime(ses: Session, active: boolean) {
    const dts = DateTime.fromISO(ses.startDate);
    const dte = DateTime.fromISO(ses.endDate);

    return (
      <ListItem disableGutters key={ses.idx}>
        {active ? (
          <ListItemText
            primary={dts.toFormat('DDDD')}
            primaryTypographyProps={{ style: { fontWeight: 'bold' } }}
            secondary={dts.toFormat('t - ') + dte.toFormat('t')}
            secondaryTypographyProps={{
              style: { fontWeight: 'bold' }
            }}
          />
        ) : (
          <ListItemText
            primary={dts.toFormat('DDDD')}
            secondary={`Session ${ses.idx + 1}`}
          />
        )}
      </ListItem>
    );
  }

  render() {
    const { klass, idx } = this.props;
    const session = typeof idx === 'number' ? klass.sessions[idx] : null;

    return (
      <Card style={{ marginBottom: 24 }}>
        <CardHeader
          avatar={<UserAvatar user={klass.teacher} />}
          title={klass.course.name}
          subheader={
            session
              ? `Session ${session.idx + 1}`
              : `Assigned to ${klass.teacher?.fullName || 'N/A'}`
          }
        />
        <CardContent>
          <List dense disablePadding>
            {klass.sessions.length === 1
              ? this.renderTime(klass.sessions[0], true)
              : klass.sessions.map(ses => this.renderTime(ses, ses.idx === idx))}
          </List>
        </CardContent>
        <CardContent>
          <List dense disablePadding>
            {klass.observers.length > 0 && (
              <ListItem disableGutters>
                <ListItemIcon style={{ minWidth: 40 }}>
                  <PeopleAltSharp color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Observers"
                  secondary={klass.observers.map(ob => ob.fullName).join(', ')}
                />
              </ListItem>
            )}

            {klass.dialInLink && (
              <ListItem disableGutters>
                <ListItemIcon style={{ minWidth: 40 }}>
                  <VideoCallSharp color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={klass.dialInLink}
                  primaryTypographyProps={{
                    style: {
                      wordBreak: 'break-all'
                    }
                  }}
                  secondary={
                    klass.meeting
                      ? 'This is the url students receive, start the class by clicking "start zoom meeting" button instead'
                      : 'This meeting is created manually, please login as host'
                  }
                />
              </ListItem>
            )}
            <ListItem disableGutters>
              <ListItemIcon style={{ minWidth: 40 }}>
                <CommentSharp color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <NextLink
                    href="/classroom/[id]"
                    as={'/classroom/' + klass.id}
                    passHref
                  >
                    <Link color="primary">Classroom</Link>
                  </NextLink>
                }
                secondary="Student can access the classroom by login to their account and find the link under class schedules"
              />
            </ListItem>
            {klass.course.deck && (
              <ListItem disableGutters>
                <ListItemIcon style={{ minWidth: 40 }}>
                  <BookmarkSharp color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Link color="primary" href={klass.course.deck} target="_blank">
                      Course Materials / Deck
                    </Link>
                  }
                  secondary={klass.course.deck}
                />
              </ListItem>
            )}
          </List>
        </CardContent>
        <StartZoomMeeting klass={klass} />
        {this.props.me.teacherId === klass.teacherId && (
          <RequestReschedule klass={klass} />
        )}
      </Card>
    );
  }
}
