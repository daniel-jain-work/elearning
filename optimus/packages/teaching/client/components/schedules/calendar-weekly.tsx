import { EventApi, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { blue, green } from '@material-ui/core/colors';
import { DateTime } from 'luxon';
import Router from 'next/router';
import * as React from 'react';
import { minutesToTime } from '../../calendar-utils';
import { TeacherAssignmentsResult } from '../../class-queries';

interface Props extends TeacherAssignmentsResult {
  defaultDate: DateTime;
  setDefaultDate: (defaultDate: DateTime) => void;
  selectTimeoff: (timeoffId: string) => void;
  allowToGoBack: boolean;
}

const getCalendarEvents = (
  teacher: TeacherAssignmentsResult['teacher'],
  startOfWeek: DateTime
) => {
  const calendarEvents: EventInput[] = teacher.sessions.map(session => ({
    id: session.id,
    groupId: session.classId,
    start: session.startDate,
    end: session.endDate,
    title: session.class.course.name,
    color: session.students.length > 0 ? blue[500] : blue[200],
    extendedProps: {
      length: session.class.schedules.length
    }
  }));

  teacher.timeoffs.forEach(timeoff => {
    calendarEvents.push({
      id: timeoff.id,
      start: timeoff.start,
      end: timeoff.end,
      rendering: 'background',
      color: 'black',
      extendedProps: {
        timeoff: true
      }
    });
  });

  teacher.availableTime.forEach(at => {
    const startOfDay = startOfWeek.set({
      weekday: at.day === 0 ? 7 : at.day
    });

    at.times.forEach(time => {
      calendarEvents.push({
        start: startOfDay.plus({ minutes: time[0] }).toJSDate(),
        end: startOfDay.plus({ minutes: time[1] }).toJSDate(),
        rendering: 'background',
        color: green[400]
      });
    });
  });

  return calendarEvents;
};

export default function CalendarWeekly(props: Props) {
  const calendarComponentRef = React.useRef<FullCalendar>(null);

  const handleEventClick = (args: { event: EventApi; el: HTMLElement }) => {
    if (args.event.extendedProps.timeoff) {
      props.selectTimeoff(args.event.id);
    } else if (args.event.groupId) {
      if (args.event.extendedProps.length > 1) {
        Router.push('/session/[id]', `/session/${args.event.id}`);
      } else {
        Router.push('/class/[id]', `/class/${args.event.groupId}`);
      }
    }
  };

  let earlist = 8 * 60; // defaults to 8am
  let latest = 20 * 60; // defaults to 8pm
  props.teacher.availableTime.forEach(at => {
    at.times.forEach(t => {
      earlist = Math.min(earlist, t[0]);
      latest = Math.max(latest, t[1]);
    });
  });

  return (
    <FullCalendar
      defaultView="timeGridWeek"
      header={{
        left: props.allowToGoBack ? 'left, today' : 'today',
        center: 'title',
        right: 'right'
      }}
      selectable={true}
      plugins={[timeGridPlugin, dayGridPlugin]}
      ref={calendarComponentRef}
      events={getCalendarEvents(
        props.teacher,
        props.defaultDate.setZone(props.teacher.timezone).startOf('week')
      )}
      minTime={minutesToTime(earlist)}
      maxTime={minutesToTime(latest)}
      allDaySlot={false}
      firstDay={1}
      height="auto"
      defaultDate={props.defaultDate.toJSDate()}
      eventClick={handleEventClick}
      customButtons={{
        left: {
          text: '‹',
          click() {
            if (props.allowToGoBack) {
              props.setDefaultDate(props.defaultDate.minus({ week: 1 }));
              calendarComponentRef.current?.getApi().prev();
            }
          }
        },
        right: {
          text: '›',
          click() {
            props.setDefaultDate(props.defaultDate.plus({ week: 1 }));
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
  );
}
