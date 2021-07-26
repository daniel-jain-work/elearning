import { Graphql } from '@cl/types';
import sequelize from '../../sequelize';
import { trialClassMock } from '../mocks';
import { gql, queryGraphqlAPI } from '../test-server';

afterAll(async () => {
  await sequelize.close();
});

const CreateClassMutation = gql`
  mutation(
    $active: Boolean
    $courseId: ID!
    $dialInLink: String
    $note: String
    $schedules: [[DateTime]]!
  ) {
    createClass(
      active: $active
      courseId: $courseId
      dialInLink: $dialInLink
      note: $note
      schedules: $schedules
    ) {
      active
      startDate
      endDate
      zoomId
      dialInLink
      password
      notes {
        content
      }
    }
  }
`;

test('Create Class', async () => {
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 1000 * 60 * 60);

  const vars: Graphql.CreateClassVars = {
    active: true,
    courseId: trialClassMock.courseId,
    dialInLink: 'https://zoom.us/j/891856844?pwd=123456',
    note: 'test',
    schedules: [[startTime, endTime]]
  };

  const res = await queryGraphqlAPI(CreateClassMutation, vars);
  expect(res.body.data).toStrictEqual({
    createClass: {
      active: true,
      startDate: startTime.toISOString(),
      endDate: endTime.toISOString(),
      zoomId: '891856844',
      dialInLink: 'https://zoom.us/j/891856844?pwd=123456',
      password: '123456',
      notes: [
        {
          content: 'test'
        }
      ]
    }
  });
});
