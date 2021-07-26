import { commonRoutes } from 'cl-common';
import sequelize from '../../sequelize';
import { apiServer, gql, queryGraphqlAPI } from '../test-server';

interface Subject {
  id: string;
  courses: { id: string; level: number }[];
}

const GetSubjectsQuery = gql`
  {
    subjects {
      id
      courses {
        id
        level
      }
    }
  }
`;

afterAll(async () => {
  await sequelize.close();
});

test('Graphql API server', async () => {
  await apiServer
    .post(commonRoutes.graphql)
    .send({
      query: GetSubjectsQuery
    })
    .expect(401, 'UNAUTHENTICATED');
  const res = await queryGraphqlAPI(GetSubjectsQuery);
  const data: { subjects: Subject[] } = res.body.data;
  expect(data.subjects.length).toBeGreaterThan(0);
  for (const subject of data.subjects) {
    expect(Array.isArray(subject.courses)).toBeTruthy();
    for (const course of subject.courses) {
      expect(course.level).toBeGreaterThanOrEqual(0);
    }
  }
});
