import { FileInput, Nullable } from '@cl/types';
import { makeStyles, Typography } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { EditorState } from 'draft-js';
import React from 'react';
import { Student } from '../../data-types';
import { templateVars } from '../../email-utils';
import Accessories from '../accessories';
import { RichTextEditor } from '../rich-text-editor';

const useStyles = makeStyles(theme => ({
  warpper: {
    margin: theme.spacing(2)
  },

  vars: {
    ...theme.typography.body1,
    color: theme.palette.text.secondary,
    margin: theme.spacing(1, 0),
    '&>code': {
      userSelect: 'all',
      backgroundColor: theme.palette.grey[200],
      padding: '2px 4px',
      borderRadius: theme.shape.borderRadius,
      marginRight: theme.spacing(1),
      '&:last-of-type': {
        marginRight: 0
      }
    }
  }
}));

interface Props {
  state: EditorState;
  onChange: (state: EditorState) => void;
  student: Nullable<Student>;
  attachments: FileInput[];
  setAttachments: (files: FileInput[]) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export default function EmailEditor(props: Props) {
  const classes = useStyles({});

  let genderWarning = '';
  if (
    props.student &&
    props.student.gender !== 'male' &&
    props.student.gender !== 'female'
  ) {
    genderWarning = `Be careful of using gender related macros since we don't know if ${props.student.name} is 👧🏻 or 👦🏻`;
  }

  return (
    <div className={classes.warpper}>
      <Typography variant="subtitle2">Supported variables</Typography>
      {genderWarning && <Alert color="warning">{genderWarning}</Alert>}
      <div className={classes.vars}>
        {Object.keys(templateVars).map(key => (
          <code key={key}>{`{{${templateVars[key]}}}`}</code>
        ))}
      </div>
      <RichTextEditor
        state={props.state}
        onChange={props.onChange}
        placeholder="Send a message"
      />
      <Accessories
        files={props.attachments}
        setFiles={props.setAttachments}
        inputRef={props.fileInputRef}
      />
    </div>
  );
}
