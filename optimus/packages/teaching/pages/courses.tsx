import { useQuery } from '@apollo/react-hooks';
import { Graphql, Nullable } from '@cl/types';
import {
  GridList,
  GridListTile,
  GridListTileBar,
  IconButton,
  makeStyles
} from '@material-ui/core';
import { Info, InfoOutlined } from '@material-ui/icons';
import { Topic } from 'cl-common';
import { AuthedNextPage } from 'cl-next-app';
import React from 'react';
import CourseDetails from '../client/components/course-details/course-details';
import Layout from '../client/components/layout';
import { Course } from '../client/data-types';
import {
  TeacherWithCoursesQuery,
  TeacherWithCoursesResult
} from '../client/teacher-queries';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    overflow: 'hidden',
    backgroundColor: theme.palette.background.paper
  },
  gridList: {
    flexWrap: 'nowrap',
    transform: 'translateZ(0)'
  },

  titleBar: {
    background:
      'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0) 100%)'
  }
}));

interface PageProps extends AuthedNextPage {
  teacherId?: string;
}

function courseFilter(course: Course) {
  return course.subjectId !== Topic.WEBINARS && course.subjectId !== Topic.INTERNAL;
}

export default function CoursesPage(props: PageProps) {
  const classes = useStyles();
  const [selected, selectCourse] = React.useState<Nullable<Course>>(null);

  let teacherId = props.me.teacherId;
  if (props.teacherId && props.me.isAdmin) {
    teacherId = props.teacherId;
  }

  const result = useQuery<TeacherWithCoursesResult, Graphql.TeacherIdArgs>(
    TeacherWithCoursesQuery,
    {
      variables: {
        teacherId
      },
      onCompleted(data) {
        const first = data.teacher.courses.find(courseFilter);
        if (first) {
          selectCourse(first);
        }
      }
    }
  );

  const courses = result.data?.teacher.courses
    .filter(courseFilter)
    .sort((c1, c2) => c1.id.localeCompare(c2.id));

  return (
    <Layout queryResult={result}>
      {courses && (
        <GridList className={classes.gridList} cols={2.5} cellHeight={240}>
          {courses.map(course => (
            <GridListTile
              key={course.id}
              style={{ cursor: 'pointer' }}
              onClick={() => selectCourse(course)}
            >
              <img src={course.thumbnail} alt={course.name} />
              <GridListTileBar
                title={course.name}
                className={classes.titleBar}
                actionIcon={
                  <IconButton>
                    {course === selected ? (
                      <Info style={{ color: 'orange' }} />
                    ) : (
                      <InfoOutlined />
                    )}
                  </IconButton>
                }
              />
            </GridListTile>
          ))}
        </GridList>
      )}
      {selected && <CourseDetails course={selected} teacherId={teacherId} />}
    </Layout>
  );
}
