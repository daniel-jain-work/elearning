import { headerNames } from 'cl-common';
import { UserModel } from 'cl-models';
import { nanoid } from 'nanoid';
import { createToken } from '../../lib/token-store';
import sequelize from '../../sequelize';
import { gql, queryGraphqlAPI } from '../test-server';

const userMock = {
  email: nanoid() + '@test.com',
  password: '123456',
  firstName: 'first',
  lastName: 'last'
};

const user = new UserModel(userMock);

beforeAll(() => user.save());

afterAll(async () => {
  await user.destroy();
  await sequelize.close();
});

const UserLoginMutation = gql`
  mutation(
    $email: String!
    $password: String!
    $teacherOnly: Boolean
    $internalOnly: Boolean
  ) {
    userLogin(
      email: $email
      password: $password
      internalOnly: $internalOnly
      teacherOnly: $teacherOnly
    ) {
      id
    }
  }
`;

describe('user login', () => {
  test('email does not match', async () => {
    const res = await queryGraphqlAPI(UserLoginMutation, {
      email: 'idontknow@sss.com',
      password: 'doesnotmatter'
    });

    expect(res.body.errors[0].message).toBe('Fail to login');
    expect(res.body.errors[0].extensions.email).toBeTruthy();
  });

  test('password does not match', async () => {
    const res = await queryGraphqlAPI(UserLoginMutation, {
      email: user.email,
      password: 'doesnotmatter'
    });

    expect(res.body.errors[0].message).toBe('Fail to login');
    expect(res.body.errors[0].extensions.password).toBeTruthy();
  });

  test('login success', async () => {
    const res = await queryGraphqlAPI(UserLoginMutation, {
      email: user.email,
      password: userMock.password
    });

    expect(res.header[headerNames.apiToken]).toBe(createToken(user));
    expect(res.body.data.userLogin).toStrictEqual({
      id: user.id
    });
  });

  test('internal only login', async () => {
    const res = await queryGraphqlAPI(UserLoginMutation, {
      email: user.email,
      password: userMock.password,
      internalOnly: true
    });

    expect(res.body.errors[0].message).toBe('Fail to login');
    expect(res.body.errors[0].extensions.email).toBeTruthy();
  });

  test('teacher only login', async () => {
    const res = await queryGraphqlAPI(UserLoginMutation, {
      email: user.email,
      password: userMock.password,
      teacherOnly: true
    });

    expect(res.body.errors[0].message).toBe('Fail to login');
    expect(res.body.errors[0].extensions.email).toBeTruthy();
  });
});
