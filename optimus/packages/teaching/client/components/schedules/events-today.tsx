import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListSubheader
} from '@material-ui/core';
import { EmojiPeople, EventAvailable, History } from '@material-ui/icons';
import { DateTime } from 'luxon';
import NextLink, { LinkProps } from 'next/link';
import * as React from 'react';
import { Task } from '../../calendar-utils';

export default class EventToday extends React.PureComponent<{
  date: DateTime;
  events: Task[];
}> {
  renderEvent(evt: Task) {
    const link: LinkProps =
      evt.data.class.schedules.length > 1
        ? { href: '/session/[id]', as: `/session/${evt.data.id}` }
        : { href: '/class/[id]', as: `/class/${evt.data.classId}` };

    let item: React.ReactNode = null;

    if (evt.ended) {
      item = (
        <ListItem button>
          <ListItemIcon>
            <History />
          </ListItemIcon>
          <ListItemText
            primary={evt.title}
            secondary={evt.start.toFormat("'(Ended)' ff")}
          />
        </ListItem>
      );
    } else if (evt.data.students.length === 0) {
      item = (
        <ListItem button>
          <ListItemIcon>
            <EmojiPeople />
          </ListItemIcon>
          <ListItemText
            primary={evt.title}
            secondary={evt.start.toFormat("'(No Student)' ff")}
          />
        </ListItem>
      );
    } else {
      item = (
        <ListItem button>
          <ListItemIcon>
            <EventAvailable color="primary" />
          </ListItemIcon>
          <ListItemText
            primary={evt.title}
            primaryTypographyProps={{ color: 'primary' }}
            secondary={evt.start.toFormat('fff')}
          />
        </ListItem>
      );
    }

    return (
      <NextLink key={evt.data.id} {...link}>
        {item}
      </NextLink>
    );
  }

  render() {
    if (this.props.events.length === 0) {
      return null;
    }

    return (
      <List
        dense
        disablePadding
        subheader={
          <ListSubheader>
            {this.props.date.toLocaleString(DateTime.DATE_FULL)}
          </ListSubheader>
        }
      >
        {this.props.events.map(this.renderEvent, this)}
      </List>
    );
  }
}
