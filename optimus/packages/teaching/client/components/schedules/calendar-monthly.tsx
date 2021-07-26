import { EventApi, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import { makeStyles } from '@material-ui/core';
import { green } from '@material-ui/core/colors';
import { DateTime } from 'luxon';
import * as React from 'react';
import { generateTasks } from '../../calendar-utils';
import { TeacherAssignmentsResult } from '../../class-queries';
import EventsToday from './events-today';

const useStyles = makeStyles(theme => ({
  active: {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
    display: 'inline-block',
    padding: '1px 3px',
    border: '0 none'
  },
  timeoff: {
    backgroundColor: theme.palette.grey[500],
    color: theme.palette.primary.contrastText,
    padding: '1px 3px',
    border: '0 none'
  }
}));

interface Props extends TeacherAssignmentsResult {
  defaultDate: DateTime;
  setDefaultDate: (defaultDate: DateTime) => void;
  selectTimeoff: (timeoffId: string) => void;
  allowToGoBack: boolean;
}

export default function CalendarMonthly(props: Props) {
  const classes = useStyles({});
  const calendarComponentRef = React.useRef<FullCalendar>(null);
  const [selected, setSelected] = React.useState(DateTime.local());

  const tasks = React.useMemo(() => generateTasks(props.teacher.sessions), [
    props.teacher.sessions
  ]);

  const selectedDateKey = selected.toISODate();
  const eventsToday = tasks[selectedDateKey] || [];

  const calendarEvents: EventInput[] = Object.keys(tasks).map(dateKey => ({
    date: dateKey,
    className: classes.active,
    title: '+' + tasks[dateKey].length
  }));

  props.teacher.timeoffs.map(timeoff => {
    calendarEvents.push({
      id: timeoff.id,
      start: timeoff.start,
      end: timeoff.end,
      className: classes.timeoff,
      title: 'Timeoff',
      extendedProps: {
        timeoff: true
      }
    });
  });

  const handleDateClick = (args: { date: Date }) => {
    setSelected(DateTime.fromJSDate(args.date));
  };

  const handleEventClick = (args: { event: EventApi }) => {
    if (args.event.extendedProps.timeoff) {
      props.selectTimeoff(args.event.id);
    } else if (args.event.start) {
      setSelected(DateTime.fromJSDate(args.event.start));
    }
  };

  const dayRender = (args: { date: Date; el: HTMLElement }) => {
    const dateKey = DateTime.fromJSDate(args.date).toISODate();
    if (dateKey === selectedDateKey) {
      args.el.style.backgroundColor = green[400];
    }
  };

  return (
    <>
      <FullCalendar
        defaultView="dayGridMonth"
        header={{
          left: props.allowToGoBack ? 'left, today' : 'today',
          center: 'title',
          right: 'right'
        }}
        plugins={[dayGridPlugin, interactionPlugin]}
        ref={calendarComponentRef}
        events={calendarEvents}
        allDaySlot={false}
        defaultDate={props.defaultDate.toJSDate()}
        aspectRatio={3}
        dayRender={dayRender}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        customButtons={{
          left: {
            text: '‹',
            click() {
              if (props.allowToGoBack) {
                props.setDefaultDate(props.defaultDate.minus({ month: 1 }));
                calendarComponentRef.current?.getApi().prev();
              }
            }
          },
          right: {
            text: '›',
            click() {
              props.setDefaultDate(props.defaultDate.plus({ month: 1 }));
              calendarComponentRef.current?.getApi().next();
            }
          },
          today: {
            text: 'today',
            click() {
              props.setDefaultDate(DateTime.local());
              calendarComponentRef.current?.getApi().gotoDate(new Date());
            }
          }
        }}
      />
      <EventsToday date={selected} events={eventsToday} />
    </>
  );
}
