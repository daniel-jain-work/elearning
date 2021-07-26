import { CardContent, Fab, Typography } from '@material-ui/core';
import { CameraAltOutlined } from '@material-ui/icons';
import React from 'react';
import { logEvent } from '../analytics';
import { hasActiveClass } from '../calendar-utils';
import { ClassDetails } from '../data-types';

const startZoomLabel = 'start zoom meeting';

export default class StartZoomMeeting extends React.PureComponent<{
  klass: ClassDetails;
}> {
  handleStartMeeting = (evt: React.MouseEvent<HTMLButtonElement>) => {
    const { klass } = this.props;

    if (!hasActiveClass(klass.sessions)) {
      const confirmed = window.confirm(
        `${klass.course.name} is scheduled for a different time, we suggest starting class 15 minutes in advance, confirm to start.`
      );

      if (!confirmed) {
        evt.preventDefault();
        logEvent('Start Zoom Meeting (Wrong Time)', {
          label: klass.course.name,
          variant: klass.id
        });
        return;
      }
    }

    logEvent('Start Zoom Meeting', {
      label: klass.course.name,
      variant: klass.id,
      startUrl: klass.meeting?.startUrl
    });
  };

  render() {
    const { klass } = this.props;

    if (!klass.meeting) {
      return null;
    }

    return (
      <CardContent>
        <Fab
          variant="extended"
          color="secondary"
          size="small"
          style={{ width: '100%' }}
          href={klass.meeting.startUrl}
          onClick={this.handleStartMeeting}
        >
          <CameraAltOutlined style={{ marginRight: 8 }} />
          {startZoomLabel}
        </Fab>
        <Typography
          color="textSecondary"
          variant="body2"
          style={{ marginTop: 16, wordBreak: 'break-all' }}
        >
          When in doubt, dialin using <u>{klass.dialInLink}</u> on a different device
          (e.g mobile) to verify the connection.
        </Typography>
      </CardContent>
    );
  }
}
