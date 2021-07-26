import { useMutation } from '@apollo/react-hooks';
import { Graphql, TokenPayload, FileInput } from '@cl/types';
import {
  Paper,
  Button,
  DialogActions,
  DialogContent,
  TextField,
  Typography
} from '@material-ui/core';
import { ApolloError } from 'apollo-client';
import React from 'react';
import { AddThreadMutation, GetClassroomQuery } from '../../classroom-queries';
import ModalWrapper from '../modal-wrapper';
import Accessories from '../accessories';

export default function ProjectEditor(props: {
  me: TokenPayload;
  classId: string;
  onError: (err: ApolloError) => void;
  onClose: () => void;
}) {
  const [description, setDescription] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [attachments, setAttachments] = React.useState<FileInput[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [addThread, addThreadState] = useMutation<any, Graphql.AddThreadArgs>(
    AddThreadMutation,
    {
      onError: props.onError,
      onCompleted: props.onClose,
      refetchQueries: [
        {
          query: GetClassroomQuery,
          variables: { id: props.classId }
        }
      ]
    }
  );

  return (
    <ModalWrapper
      open
      maxWidth="sm"
      fullWidth
      onClose={props.onClose}
      title="Share a Project"
    >
      <DialogContent>
        <TextField
          name="title"
          label="Name your project"
          required
          fullWidth
          margin="dense"
          value={title}
          onChange={evt => {
            setTitle(evt.target.value);
          }}
        />
        <TextField
          name="description"
          label="Briefly describe how this project is done"
          variant="filled"
          required
          multiline
          fullWidth
          margin="dense"
          rows={3}
          value={description}
          onChange={evt => {
            setDescription(evt.target.value);
          }}
        />
        <TextField
          name="url"
          type="url"
          label="A link to where the project is hosted"
          placeholder="e.g. https://scratch.mit.edu/projects/269453003/"
          value={url}
          fullWidth
          margin="dense"
          required
          style={{ marginBottom: 24 }}
          onChange={evt => {
            setUrl(evt.target.value);
          }}
        />
        <Paper
          variant="outlined"
          square
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.click();
            }
          }}
          style={{
            display: 'block',
            padding: 8,
            textAlign: 'center',
            cursor: 'pointer'
          }}
        >
          <Typography variant="subtitle1" color="secondary">
            Select an Image or Video
          </Typography>
          <Typography variant="subtitle2">
            Drag a a file into this box or select from your device.
          </Typography>
        </Paper>
        <Accessories
          files={attachments}
          setFiles={setAttachments}
          inputRef={fileInputRef}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>Cancel</Button>
        <Button
          disabled={addThreadState.loading}
          variant="contained"
          color="primary"
          onClick={() =>
            addThread({
              variables: {
                teacherId: props.me.teacherId,
                classId: props.classId,
                content: `
                  <h3>${title}</h3>
                  <p><a href="${url}" target="_blank">${url}</a></p>
                  ${description}
                `,
                attachments
              }
            })
          }
        >
          Submit
        </Button>
      </DialogActions>
    </ModalWrapper>
  );
}
