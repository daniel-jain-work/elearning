import { useMutation } from '@apollo/react-hooks';
import { Graphql, TokenPayload } from '@cl/types';
import {
  Card,
  CardContent,
  CardHeader,
  Divider,
  GridList,
  GridListTile,
  GridListTileBar,
  IconButton,
  Menu,
  MenuItem,
  Typography
} from '@material-ui/core';
import { MoreVert, OpenInBrowser } from '@material-ui/icons';
import { ApolloError } from 'apollo-client';
import { DateTime } from 'luxon';
import React from 'react';
import { DeleteThreadMutation, GetClassroomQuery } from '../../classroom-queries';
import { Thread } from '../../data-types';
import UserAvatar from '../user-avatar';
import ThreadCommentList from './thread-comment-list';

export default function ThreadItem(props: {
  me: TokenPayload;
  classId: string;
  thread: Thread;
  onError: (err: ApolloError) => void;
}) {
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);

  const [deleteThread, deleteThreadState] = useMutation<any, Graphql.IdArgs>(
    DeleteThreadMutation,
    {
      onError: props.onError,
      variables: { id: props.thread.id },
      refetchQueries: [
        {
          query: GetClassroomQuery,
          variables: { id: props.classId }
        }
      ]
    }
  );

  let threadAction: React.ReactNode = null;
  if (
    props.thread.comments.length === 0 &&
    props.thread.author.id === props.me.teacherId
  ) {
    threadAction = (
      <IconButton onClick={evt => setMenuAnchor(evt.currentTarget)}>
        <MoreVert />
      </IconButton>
    );
  }

  return (
    <Card>
      <CardHeader
        avatar={<UserAvatar user={props.thread.author} />}
        title={props.thread.author?.name || '--'}
        subheader={DateTime.fromISO(props.thread.createdAt).toFormat('f')}
        action={threadAction}
      />
      <Menu
        anchorEl={menuAnchor}
        keepMounted
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          disabled={deleteThreadState.loading}
          onClick={() => deleteThread()}
        >
          Remove
        </MenuItem>
      </Menu>
      <CardContent>
        <Typography
          component="div"
          variant="body2"
          dangerouslySetInnerHTML={{
            __html: props.thread.content
          }}
        />
        {props.thread.attachments.length > 0 && (
          <GridList cellHeight={128} cols={4} style={{ marginBottom: 24 }}>
            {props.thread.attachments.map(attachment => (
              <GridListTile key={attachment}>
                <img src={attachment} />
                <GridListTileBar
                  actionIcon={
                    <IconButton href={attachment} target="_blank">
                      <OpenInBrowser style={{ color: 'rgba(255,255,255,0.85)' }} />
                    </IconButton>
                  }
                />
              </GridListTile>
            ))}
          </GridList>
        )}
        <Divider style={{ marginBottom: 24 }} />

        <ThreadCommentList
          me={props.me}
          classId={props.classId}
          threadId={props.thread.id}
          comments={props.thread.comments}
          onError={props.onError}
        />
      </CardContent>
    </Card>
  );
}
