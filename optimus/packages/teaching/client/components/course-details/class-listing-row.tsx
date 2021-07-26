import {
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText
} from '@material-ui/core';
import { Edit, EventAvailable, EventBusy } from '@material-ui/icons';
import { DateTime } from 'luxon';
import React from 'react';
import { Class } from '../../data-types';
import EditClassModal from './edit-class-modal';

export default function ClassListingRow(props: { klass: Class; teacherId: string }) {
  const [isEditing, toggleEditting] = React.useState(false);
  const ts = DateTime.fromISO(props.klass.startDate);
  const te = DateTime.fromISO(props.klass.endDate);

  return (
    <>
      {isEditing && (
        <EditClassModal {...props} onClose={() => toggleEditting(false)} />
      )}
      <ListItem>
        <ListItemIcon>
          {props.klass.active ? <EventAvailable color="primary" /> : <EventBusy />}
        </ListItemIcon>
        {props.klass.teacherId === props.teacherId ? (
          <ListItemText
            primary={ts.toFormat('cccc t')}
            secondary={ts.toFormat('DD - ') + te.toFormat('DD')}
          />
        ) : (
          <ListItemText
            primary={ts.toFormat('fff')}
            secondary="Assigned to another Teacher"
          />
        )}

        {props.klass.editable && (
          <ListItemSecondaryAction>
            <IconButton color="primary" onClick={() => toggleEditting(true)}>
              <Edit />
            </IconButton>
          </ListItemSecondaryAction>
        )}
      </ListItem>
    </>
  );
}
