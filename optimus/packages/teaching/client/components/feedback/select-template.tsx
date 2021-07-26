import { useLazyQuery } from '@apollo/react-hooks';
import { Graphql, Nullable } from '@cl/types';
import { TextField } from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import React from 'react';
import { EmailTemplate } from '../../data-types';
import {
  GetEmailTemplatesQuery,
  GetEmailTemplatesResult
} from '../../teacher-queries';

interface Props {
  templateId: string;
  handleChange: (template: Nullable<EmailTemplate>) => void;
  getTemplatesVars: Graphql.TeacherEmailTemplatesArgs;
}

export default function SelectTemplate(props: Props) {
  const [getTemplates, templateResult] = useLazyQuery<
    GetEmailTemplatesResult,
    Graphql.TeacherEmailTemplatesArgs
  >(GetEmailTemplatesQuery, {
    variables: props.getTemplatesVars
  });

  const templates = templateResult.data?.tpls.sort((t1, t2) => {
    if (t1.teacherId && !t2.teacherId) {
      return 1;
    }

    if (!t1.teacherId && t2.teacherId) {
      return -1;
    }

    return 0;
  });

  return (
    <Autocomplete
      multiple={false}
      onOpen={() => getTemplates()}
      options={templates || []}
      value={templates?.find(t => t.id === props.templateId) || null}
      loading={templateResult.loading}
      getOptionLabel={t => t.name}
      groupBy={t => (t.teacherId ? 'My Templates' : 'System Templates')}
      onChange={(evt, value) => props.handleChange(value)}
      renderInput={params => (
        <TextField {...params} margin="dense" label="Select a Template" fullWidth />
      )}
    />
  );
}
