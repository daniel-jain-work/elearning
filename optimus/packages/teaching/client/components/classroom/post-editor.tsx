import { useMutation } from '@apollo/react-hooks';
import { FileInput, Graphql, TokenPayload } from '@cl/types';
import {
  Button,
  Card,
  CardActions,
  CardContent,
  IconButton
} from '@material-ui/core';
import { AttachFileSharp } from '@material-ui/icons';
import { ApolloError } from 'apollo-client';
import { EditorState } from 'draft-js';
import React from 'react';
import { AddThreadMutation, GetClassroomQuery } from '../../classroom-queries';
import Accessories from '../accessories';
import { getHtmlFromContent, RichTextEditor } from '../rich-text-editor';

export default function PostEditor(props: {
  me: TokenPayload;
  classId: string;
  onError: (err: ApolloError) => void;
}) {
  const emptyState = React.useMemo(() => EditorState.createEmpty(), []);
  const [editorState, setEditorState] = React.useState(emptyState);
  const [attachments, setAttachments] = React.useState<FileInput[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const resetEditor = () => {
    setEditorState(emptyState);
    setAttachments([]);
  };

  const [addThread, addThreadState] = useMutation<any, Graphql.AddThreadArgs>(
    AddThreadMutation,
    {
      onError: props.onError,
      onCompleted: resetEditor,
      refetchQueries: [
        {
          query: GetClassroomQuery,
          variables: { id: props.classId }
        }
      ]
    }
  );

  const editorContent = editorState.getCurrentContent();

  return (
    <Card>
      <CardContent>
        <RichTextEditor
          state={editorState}
          onChange={setEditorState}
          placeholder="Share something with your class"
        />
        <Accessories
          files={attachments}
          setFiles={setAttachments}
          inputRef={fileInputRef}
        />
      </CardContent>
      <CardActions>
        <IconButton
          disabled={attachments.length >= 4}
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.click();
            }
          }}
        >
          <AttachFileSharp />
        </IconButton>
        <div style={{ marginLeft: 'auto' }}>
          <Button onClick={resetEditor}>Cancel</Button>
          <Button
            disabled={!editorContent.hasText() || addThreadState.loading}
            variant="contained"
            color="primary"
            onClick={() =>
              addThread({
                variables: {
                  teacherId: props.me.teacherId,
                  classId: props.classId,
                  content: getHtmlFromContent(editorContent),
                  attachments
                }
              })
            }
          >
            Post
          </Button>
        </div>
      </CardActions>
    </Card>
  );
}
