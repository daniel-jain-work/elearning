import { Graphql } from '@cl/types';
import { TeacherModel, UserModel } from 'cl-models';
import { IANAZone } from 'luxon';
import { GraphqlContext } from '../../graphql-handler';
import { geoTagUser } from '../../lib/ipstack';

export async function userLogin(_, args: Graphql.LoginArgs, ctx: GraphqlContext) {
  const user = await UserModel.findOne({
    include: [TeacherModel],
    where: {
      email: args.email.trim().toLowerCase()
    }
  });

  if (!user) {
    ctx.badRequest('Fail to login', {
      email: 'User not found'
    });
  }

  const fLogger = ctx.logger.child({ userId: user.id, mutation: 'userLogin' });

  const isMatch = await user.compare(args.password);
  if (!isMatch) {
    fLogger.warn('password %s does not match', args.password);
    ctx.badRequest('Fail to login', {
      password: 'Password does not match'
    });
  }

  if (args.internalOnly && !user.isOps) {
    fLogger.warn('%s not internal user', user.email);
    ctx.badRequest('Fail to login', {
      email: '👹👹 Come back as an Admin!'
    });
  }

  if (args.teacherOnly && !user.teacherId) {
    fLogger.warn('%s not a teacher', user.email);
    ctx.badRequest('Fail to login', {
      email: '👹👹 Come back as an Teacher!'
    });
  }

  if (args.timezone && IANAZone.isValidZone(args.timezone)) {
    if (args.timezone !== user.timezone) {
      await user.update({
        'details.timezone': args.timezone
      });
    }

    if (user.teacher && user.teacher.timezone !== args.timezone) {
      await user.teacher.update({
        'details.timezone': args.timezone
      });
    }
  }

  ctx.updateUser(user);

  return user;
}

export async function changePassword(
  _,
  args: Graphql.UpdatePasswordArgs,
  ctx: GraphqlContext
) {
  const user = await UserModel.findByPk(args.id, {
    rejectOnEmpty: true
  });

  const isMatch = await user.compare(args.previous);
  if (!ctx.isAdmin && !isMatch) {
    ctx.logger.warn(
      { userId: user.id },
      'old password %s does not match',
      args.previous
    );
    ctx.badRequest('Fail to login', {
      previous: 'Old Password does not match'
    });
  }

  await user.update({
    password: args.password
  });

  return true;
}

export async function tagUserGeolocation(
  _,
  args: Graphql.IdArgs,
  ctx: GraphqlContext
) {
  const user = await UserModel.findByPk(args.id, {
    rejectOnEmpty: true
  });

  if (user.clientIp) {
    await geoTagUser(user, ctx.logger);
  }

  return user;
}
