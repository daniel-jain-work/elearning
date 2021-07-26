import { useMutation } from '@apollo/react-hooks';
import { Graphql, TokenPayload } from '@cl/types';
import {
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  ListSubheader,
  TextField
} from '@material-ui/core';
import { Close, Send } from '@material-ui/icons';
import { ApolloError } from 'apollo-client';
import React from 'react';
import {
  AddCommentMutation,
  DeleteCommentMutation,
  GetClassroomQuery
} from '../../classroom-queries';
import { Comment } from '../../data-types';
import UserAvatar from '../user-avatar';

export default function ThreadCommentList(props: {
  me: TokenPayload;
  classId: string;
  threadId: string;
  comments: Comment[];
  onError: (err: ApolloError) => void;
}) {
  const [commentValue, setCommentValue] = React.useState('');

  const [addComment, addState] = useMutation<any, Graphql.AddCommentArgs>(
    AddCommentMutation,
    {
      onError: props.onError,
      onCompleted() {
        setCommentValue('');
      },
      variables: {
        threadId: props.threadId,
        teacherId: props.me.teacherId,
        content: commentValue
      },
      refetchQueries: [
        {
          query: GetClassroomQuery,
          variables: { id: props.classId }
        }
      ]
    }
  );

  const [deleteComment, deleteState] = useMutation<boolean, Graphql.IdArgs>(
    DeleteCommentMutation,
    {
      onError: props.onError,
      refetchQueries: [
        {
          query: GetClassroomQuery,
          variables: { id: props.classId }
        }
      ]
    }
  );

  return (
    <>
      {props.comments.length > 0 && (
        <List dense subheader={<ListSubheader>Comments</ListSubheader>}>
          {props.comments.map(comment => (
            <ListItem key={comment.id}>
              <ListItemAvatar style={{ minWidth: 45 }}>
                <UserAvatar
                  user={comment.author}
                  style={{ width: 30, height: 30 }}
                />
              </ListItemAvatar>
              <ListItemText
                primary={comment.author.name}
                secondary={comment.content}
              />
              {comment.author.id === props.me.teacherId && (
                <ListItemSecondaryAction>
                  <IconButton
                    size="small"
                    disabled={deleteState.loading}
                    onClick={() =>
                      deleteComment({
                        variables: {
                          id: comment.id
                        }
                      })
                    }
                  >
                    <Close />
                  </IconButton>
                </ListItemSecondaryAction>
              )}
            </ListItem>
          ))}
        </List>
      )}
      <form
        onSubmit={evt => {
          evt.preventDefault();
          addComment();
        }}
      >
        <TextField
          required
          fullWidth
          disabled={addState.loading}
          size="small"
          variant="outlined"
          value={commentValue}
          onChange={evt => setCommentValue(evt.target.value)}
          label="Add class comment..."
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton disabled={!commentValue} type="submit">
                  <Send />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </form>
    </>
  );
}
