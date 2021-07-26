import { FileInput } from '@cl/types';
import {
  Avatar,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText
} from '@material-ui/core';
import { Remove } from '@material-ui/icons';
import React from 'react';
import { useAlert } from 'react-alert';

interface Props {
  files: FileInput[];
  setFiles: (files: FileInput[]) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

const maxFileSize = 2.5; //mb

export default function Accessories(props: Props) {
  const alert = useAlert();

  return (
    <>
      {props.files.length > 0 && (
        <List dense>
          {props.files.map((file, idx) => (
            <ListItem disableGutters key={idx} divider>
              <ListItemAvatar>
                <Avatar variant="square" src={file.content} />
              </ListItemAvatar>
              <ListItemText primary={file.name} />
              <ListItemSecondaryAction>
                <IconButton
                  onClick={() => props.setFiles(props.files.filter(f => f !== file))}
                >
                  <Remove />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}
      <input
        type="file"
        accept="image/*, application/pdf"
        ref={props.inputRef}
        style={{ display: 'none' }}
        onChange={evt => {
          if (!evt.target.files || evt.target.files.length < 1) {
            return;
          }

          const file = evt.target.files[0];
          if (file.size > maxFileSize * 1024 * 1024) {
            alert.error(
              `Maximum allowed file size is ${maxFileSize}mb, try resize ${file.name}.`
            );
            return;
          }

          const fReader = new FileReader();
          fReader.onload = () => {
            if (typeof fReader.result === 'string') {
              props.setFiles(
                props.files.concat({
                  name: file.name,
                  content: fReader.result
                })
              );
            }
          };

          fReader.readAsDataURL(file);
        }}
      />
    </>
  );
}
