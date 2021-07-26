import {
  Chip,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@material-ui/core';
import { ChipProps } from '@material-ui/core/Chip';
import { DateTime } from 'luxon';
import React from 'react';
import { Class, StudentWithClasses } from '../data-types';

interface Props {
  teacherId: string;
  students: StudentWithClasses[];
  studentSubjects: { [id: string]: string[] };
  activeStudents: Set<string>;
  start: DateTime;
  end: DateTime;
  numberOfWeeks: number;
}

const stripHeight = 20;
const minCellHeigh = 42;

const styles: {
  [name: string]: React.CSSProperties;
} = {
  todayCell: {
    backgroundColor: 'green',
    color: 'white',
    fontWeight: 'bold'
  },

  classChip: {
    width: '100%',
    overflow: 'hidden',
    height: '100%',
    fontSize: '13px'
  }
};

export default class StudentProgresses extends React.PureComponent<Props> {
  renderClassStrip(c: Class, offset: number) {
    const { start, end, teacherId } = this.props;
    const unit = 100 / end.diff(start, 'days').days;
    const cstart = DateTime.fromISO(c.startDate);
    const cend = DateTime.fromISO(c.endDate);

    const left = Math.ceil(cstart.diff(start, 'days').days) * unit;
    const right = Math.floor(end.diff(cend, 'days').days) * unit;

    const chipProps: ChipProps = {
      label: c.course.name,
      style: styles.classChip
    };

    const helpText = [c.course.name, cstart.toFormat('D ~ ') + cend.toFormat('D')];

    if (cend.toMillis() < Date.now()) {
      chipProps.variant = 'outlined';
    }

    if (c.teacherId !== teacherId) {
      helpText.push('with another teacher');
    } else {
      chipProps.color = 'primary';
    }

    return (
      <div
        key={c.id}
        style={{
          left: `${left}%`,
          right: `${right}%`,
          position: 'absolute',
          top: offset * stripHeight,
          height: stripHeight,
          padding: '1px 0'
        }}
      >
        <Tooltip title={helpText.join(', ')}>
          <Chip {...chipProps} />
        </Tooltip>
      </div>
    );
  }

  render() {
    const { students, studentSubjects, numberOfWeeks, activeStudents } = this.props;

    const nameRows: React.ReactNodeArray = [];
    const classesRows: React.ReactNodeArray = [];
    const weekCells: React.ReactNodeArray = [];

    for (const s of students) {
      const subjects = studentSubjects[s.id];
      const cellStyle: React.CSSProperties = {
        position: 'relative',
        height: subjects.length * stripHeight,
        minHeight: minCellHeigh
      };

      nameRows.push(
        <TableRow key={s.id}>
          <TableCell>
            <div style={cellStyle}>
              <Typography
                variant="subtitle2"
                color={activeStudents.has(s.id) ? 'textPrimary' : 'textSecondary'}
              >
                {s.name}
              </Typography>
            </div>
          </TableCell>
        </TableRow>
      );

      classesRows.push(
        <TableRow key={s.id}>
          <TableCell colSpan={numberOfWeeks}>
            <div style={cellStyle}>
              {s.classes.map(c =>
                this.renderClassStrip(c, subjects.indexOf(c.course.subjectId))
              )}
            </div>
          </TableCell>
        </TableRow>
      );
    }

    let w = this.props.start;
    for (let i = 0; i < numberOfWeeks; i++, w = w.plus({ week: 1 })) {
      weekCells.push(
        <TableCell
          variant="head"
          key={i}
          style={w.hasSame(DateTime.local(), 'week') ? styles.todayCell : undefined}
        >
          {w.toLocaleString(DateTime.DATE_SHORT)}
        </TableCell>
      );
    }

    return (
      <Grid container wrap="nowrap" component={Paper}>
        <Grid item xs="auto">
          <Table
            size="small"
            style={{ borderRight: '1px solid rgba(224, 224, 224, 0.9)' }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Students</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>{nameRows}</TableBody>
          </Table>
        </Grid>
        <Grid item xs style={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>{weekCells}</TableRow>
            </TableHead>
            <TableBody>{classesRows}</TableBody>
          </Table>
        </Grid>
      </Grid>
    );
  }
}
