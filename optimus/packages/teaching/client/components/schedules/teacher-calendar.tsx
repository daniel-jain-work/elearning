import { DateTime } from 'luxon';
import dynamic from 'next/dynamic';
import React from 'react';
import { TeacherAssignmentsResult } from '../../class-queries';
import RemoveTimeoff from './remove-timeoff';

const CalendarMonthly = dynamic(() => import('./calendar-monthly'), { ssr: false });
const CalendarWeekly = dynamic(() => import('./calendar-weekly'), { ssr: false });

interface Props extends TeacherAssignmentsResult {
  defaultDate: DateTime;
  setDefaultDate: (defaultDate: DateTime) => void;
  monthly: boolean;
}

export default function TeacherCalendar(props: Props) {
  const [timeoffId, selectTimeoff] = React.useState('');
  const earlist = React.useMemo(() => DateTime.local().minus({ weeks: 6 }), []);

  return (
    <>
      {timeoffId && (
        <RemoveTimeoff timeoffId={timeoffId} onClose={() => selectTimeoff('')} />
      )}
      {props.monthly ? (
        <CalendarMonthly
          defaultDate={props.defaultDate}
          setDefaultDate={props.setDefaultDate}
          teacher={props.teacher}
          selectTimeoff={selectTimeoff}
          allowToGoBack={props.defaultDate > earlist}
        />
      ) : (
        <CalendarWeekly
          defaultDate={props.defaultDate}
          setDefaultDate={props.setDefaultDate}
          teacher={props.teacher}
          selectTimeoff={selectTimeoff}
          allowToGoBack={props.defaultDate > earlist}
        />
      )}
    </>
  );
}
