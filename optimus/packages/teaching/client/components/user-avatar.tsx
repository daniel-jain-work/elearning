import { Author } from '@cl/types';
import { Avatar } from '@material-ui/core';
import { AvatarProps } from '@material-ui/core/Avatar';
import { defaultAvatarUrl } from 'cl-common';
import React from 'react';
import { Student, Teacher } from '../data-types';

interface Props extends AvatarProps {
  user?: Author | Student | Teacher;
}

function UserAvatar({ user, ...avatarProps }: Props) {
  let avatarUrl = '';
  let name = '';

  if (user) {
    if (user.avatar) {
      avatarUrl = user.avatar;
    } else {
      name = 'name' in user ? user.name : user.firstName;
    }
  } else {
    avatarUrl = defaultAvatarUrl;
  }

  return avatarUrl ? (
    <Avatar src={avatarUrl} {...avatarProps} />
  ) : (
    <Avatar {...avatarProps}>{name.charAt(0)}</Avatar>
  );
}

export default React.memo(UserAvatar);
