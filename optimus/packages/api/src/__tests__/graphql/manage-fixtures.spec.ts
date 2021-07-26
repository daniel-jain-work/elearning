import { Graphql } from '@cl/types';
import { Topic } from 'cl-common';
import { CourseModel } from 'cl-models';
import { nanoid } from 'nanoid';
import sequelize from '../../sequelize';
import { gql, queryGraphqlAPI } from '../test-server';

const courseId = 'course-' + nanoid();

afterAll(async () => {
  await CourseModel.destroy({
    where: { id: courseId }
  });
  await sequelize.close();
});

const GetSubjectQuery = gql`
  query($id: ID!) {
    subject(id: $id) {
      name
      grades
      courses {
        id
        name
        grades
      }
    }
  }
`;

async function fetchSubject() {
  const res = await queryGraphqlAPI(GetSubjectQuery, {
    id: Topic.SN
  }).expect(200);

  return res.body.data.subject as {
    name: string;
    grades: [number, number];
    courses: { id: string; name: string; grades: [number, number] }[];
  };
}

const CreateCourseMutation = gql`
  mutation(
    $id: ID!
    $subjectId: ID!
    $level: Int!
    $name: String!
    $thumbnail: String!
    $capacity: Int!
    $duration: Int!
    $price: Int!
    $grades: [Int]!
    $description: String!
    $info: String
    $recording: String
  ) {
    createCourse(
      id: $id
      subjectId: $subjectId
      level: $level
      name: $name
      thumbnail: $thumbnail
      capacity: $capacity
      duration: $duration
      price: $price
      grades: $grades
      description: $description
      info: $info
      recording: $recording
    ) {
      id
    }
  }
`;

const UpdateCourseMuation = gql`
  mutation($id: ID!, $name: String, $grades: [Int]) {
    updateCourse(id: $id, name: $name, grades: $grades) {
      id
      name
      grades
    }
  }
`;

const UpdateSubjectMutation = gql`
  mutation($id: ID!, $name: String!) {
    updateSubject(id: $id, name: $name) {
      id
      name
    }
  }
`;

describe('manage fixtures', () => {
  test('create a new course', async () => {
    const vars: Graphql.CreateCourseArgs = {
      id: courseId,
      level: 0,
      name: 'whatever you like',
      subjectId: Topic.SN,
      thumbnail: 'https://cdn.create-learn.us/scratch/Scratch+Junior.png',
      capacity: 12,
      grades: [2, 3],
      duration: 50,
      price: 0,
      description: ''
    };

    await queryGraphqlAPI(CreateCourseMutation, vars).expect(200, {
      data: {
        createCourse: {
          id: courseId
        }
      }
    });

    const subject = await fetchSubject();
    const found = subject.courses.find(c => c.id === courseId);
    expect(found).toStrictEqual({
      id: courseId,
      name: vars.name,
      grades: vars.grades
    });
  });

  test('update course', async () => {
    const vars: Graphql.UpdateCourseArgs = {
      id: courseId,
      name: 'a-new-scratch',
      grades: [1, 100]
    };

    await queryGraphqlAPI(UpdateCourseMuation, vars).expect(200, {
      data: {
        updateCourse: {
          id: courseId,
          name: vars.name,
          grades: vars.grades
        }
      }
    });

    const subject = await fetchSubject();
    expect(subject.grades).toStrictEqual(vars.grades);
    const found = subject.courses.find(c => c.id === courseId);
    expect(found).toStrictEqual({
      id: courseId,
      name: vars.name,
      grades: vars.grades
    });
  });

  test('update subject', async () => {
    const vars: Graphql.UpdateSubjectArgs = {
      id: Topic.SN,
      name: 'a-new-scratch'
    };

    await queryGraphqlAPI(UpdateSubjectMutation, vars).expect(200, {
      data: {
        updateSubject: {
          id: Topic.SN,
          name: vars.name
        }
      }
    });

    const subject = await fetchSubject();
    expect(subject.name).toBe(vars.name);
  });
});
