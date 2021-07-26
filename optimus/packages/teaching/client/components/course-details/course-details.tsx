import { useQuery } from '@apollo/react-hooks';
import { Graphql } from '@cl/types';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Fab,
  Chip,
  Container,
  List,
  ListSubheader,
  Typography
} from '@material-ui/core';
import { Bookmark } from '@material-ui/icons';
import { Topic } from 'cl-common';
import { DateTime } from 'luxon';
import React from 'react';
import { ClassSearchQuery, ClassSearchQueryResult } from '../../class-queries';
import { Course } from '../../data-types';
import ClassListingRow from './class-listing-row';
import CreateClassModal from './create-class-modal';

interface Props {
  teacherId: string;
  course: Course;
}

export default function CourseDetails({ course, teacherId }: Props) {
  const today = React.useMemo(() => DateTime.local().startOf('day'), []);

  const variables: Graphql.ClassesQuery = {
    courseId: course.id,
    timeRange: {
      from: today.toJSDate(),
      to: today.plus({ month: 1 }).toJSDate()
    }
  };

  if (course.subjectId !== Topic.PARTNERS) {
    variables.teacherId = teacherId;
  }

  const result = useQuery<ClassSearchQueryResult, Graphql.ClassesQuery>(
    ClassSearchQuery,
    { variables }
  );

  return (
    <Container maxWidth="sm" style={{ marginTop: 32 }}>
      <Card>
        <CardContent>
          <Typography variant="h5">{course.name}</Typography>
          <Typography variant="subtitle1" gutterBottom>
            Grades {course.grades.join('-')}
          </Typography>
          <Typography
            paragraph
            variant="body2"
            color="textSecondary"
            gutterBottom
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {course.description}
          </Typography>
          {course.deck && (
            <Fab
              color="primary"
              size="small"
              variant="extended"
              href={course.deck}
              style={{ width: '100%', textAlign: 'center' }}
            >
              <Bookmark />
              &nbsp;&nbsp;Course Materials / Deck
            </Fab>
          )}
        </CardContent>

        {result.data?.list && (
          <List
            disablePadding
            subheader={<ListSubheader>Upcoming Classes</ListSubheader>}
          >
            {result.data.list.rows.map(klass => (
              <ClassListingRow key={klass.id} klass={klass} teacherId={teacherId} />
            ))}
          </List>
        )}
      </Card>
      {course.subjectId === Topic.PARTNERS && (
        <Box pt={3} textAlign="right">
          <CreateClassModal
            course={course}
            teacherId={teacherId}
            refetchVariables={variables}
          />
        </Box>
      )}
    </Container>
  );
}
