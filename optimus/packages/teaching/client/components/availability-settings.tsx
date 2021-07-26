import { MutationFunction } from '@apollo/react-common';
import { Graphql } from '@cl/types';
import {
  Button,
  Card,
  CardActions,
  CardHeader,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Select,
  TextField
} from '@material-ui/core';
import { Add, Delete } from '@material-ui/icons';
import { DateTime } from 'luxon';
import React from 'react';
import { minutesToTime, timeToMinutes } from '../calendar-utils';
import { TeacherProfile } from '../teacher-queries';

interface Props {
  teacher: TeacherProfile;
  loading: boolean;
  handleSubmit: MutationFunction<any, Graphql.UpdateTeacherAvailabilitiesVars>;
}

interface Timeslot {
  day: string;
  start: string;
  end: string;
}

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default class AvailabilitySettings extends React.PureComponent<
  Props,
  { timeslots: Timeslot[] }
> {
  constructor(props: Props) {
    super(props);

    const timeslots: Timeslot[] = [];

    props.teacher.availableTime.forEach(item => {
      item.times.forEach(times => {
        timeslots.push({
          day: item.day.toString(),
          start: minutesToTime(times[0]),
          end: minutesToTime(times[1])
        });
      });
    });

    this.state = { timeslots };
  }

  handleSubmit = (evt: React.FormEvent) => {
    evt.preventDefault();

    const timesByDay: { [day: string]: [number, number][] } = {};
    this.state.timeslots.forEach(timeslot => {
      if (timesByDay[timeslot.day]) {
        timesByDay[timeslot.day].push([
          timeToMinutes(timeslot.start),
          timeToMinutes(timeslot.end)
        ]);
      } else {
        timesByDay[timeslot.day] = [
          [timeToMinutes(timeslot.start), timeToMinutes(timeslot.end)]
        ];
      }
    });

    const availabilities = Object.keys(timesByDay).map(day => ({
      day: parseInt(day, 10),
      times: timesByDay[day]
    }));

    this.props.handleSubmit({
      variables: {
        teacherId: this.props.teacher.id,
        availabilities
      }
    });
  };

  onTimeSlotchanged(idx: number, key: keyof Timeslot, value: string) {
    const timeslots = [...this.state.timeslots];
    timeslots[idx][key] = value;
    this.setState({
      timeslots
    });
  }

  onTimeSlotDeleted(idx: number) {
    const timeslots = [...this.state.timeslots];
    timeslots.splice(idx, 1);
    this.setState({
      timeslots
    });
  }

  onTimeSlotAdded() {
    this.setState({
      timeslots: this.state.timeslots.concat({
        day: '1',
        start: '',
        end: ''
      })
    });
  }

  renderTimeslot(timeslot: Timeslot, idx: number) {
    return (
      <ListItem key={idx}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Select
              native
              autoWidth
              value={timeslot.day}
              onChange={evt =>
                this.onTimeSlotchanged(idx, 'day', evt.target.value as string)
              }
            >
              <option value="" disabled>
                Day of Week
              </option>
              {weekdays.map((val, idx) => (
                <option key={idx} value={idx}>
                  {val}
                </option>
              ))}
            </Select>
          </Grid>
          <Grid item>
            <TextField
              type="time"
              value={timeslot.start}
              required
              onChange={evt =>
                this.onTimeSlotchanged(idx, 'start', evt.target.value)
              }
            />
          </Grid>
          <Grid item>
            <TextField
              type="time"
              value={timeslot.end}
              required
              onChange={evt => this.onTimeSlotchanged(idx, 'end', evt.target.value)}
            />
          </Grid>
        </Grid>
        <ListItemSecondaryAction>
          <IconButton onClick={() => this.onTimeSlotDeleted(idx)}>
            <Delete />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>
    );
  }

  render() {
    const local = DateTime.local().setZone(this.props.teacher.timezone);

    return (
      <form onSubmit={this.handleSubmit}>
        <Card>
          <CardHeader
            title="Working Hours"
            subheader={'Base on ' + local.offsetNameLong}
          />
          <List>
            {this.state.timeslots.map(this.renderTimeslot, this)}
            <ListItem>
              <ListItemText secondary="add..." />
              <ListItemSecondaryAction>
                <IconButton color="secondary" onClick={() => this.onTimeSlotAdded()}>
                  <Add />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          </List>
          <CardActions>
            <Button
              type="submit"
              disabled={this.props.loading}
              fullWidth
              variant="contained"
              color="primary"
            >
              Save Schedules
            </Button>
          </CardActions>
        </Card>
      </form>
    );
  }
}
