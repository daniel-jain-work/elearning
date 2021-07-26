import { MutationFunction } from '@apollo/react-common';
import { useMutation } from '@apollo/react-hooks';
import { FileInput, Graphql, Nullable } from '@cl/types';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  NativeSelect,
  TextField,
  Typography
} from '@material-ui/core';
import {
  AttachFileSharp,
  DeleteSharp,
  ExpandMore,
  SaveSharp
} from '@material-ui/icons';
import { getErrorMessage } from 'cl-next-app';
import { EditorState } from 'draft-js';
import React from 'react';
import { useAlert } from 'react-alert';
import { logEvent } from '../../analytics';
import {
  ClassWithTeacher,
  EmailTemplate,
  Promotion,
  Student
} from '../../data-types';
import { replacePlaceholders } from '../../email-utils';
import {
  GetEmailTemplatesQuery,
  GetEmailTemplatesResult,
  RemoveEmailTemplateMutation,
  SaveEmailTemplateData,
  SaveEmailTemplateMutation,
  SendFollowupEmailMutation,
  UpdateGenderData
} from '../../teacher-queries';
import { getHtmlFromContent, initEditorFromHtml } from '../rich-text-editor';
import EmailEditor from './email-editor';
import SelectStudent from './select-student';
import SelectTemplate from './select-template';

interface Props {
  klass: ClassWithTeacher;
  students: Student[];
  updateGender: MutationFunction<UpdateGenderData, Graphql.EditStudentProfileArgs>;
  isUpdatingGender: boolean;
  coupon?: Promotion;
}

export default function CommunicationManager(props: Props) {
  const alert = useAlert();

  const [editorState, setEditorState] = React.useState(EditorState.createEmpty());
  const [tplName, setTplName] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [selectedTpl, selectTpl] = React.useState<Nullable<EmailTemplate>>(null);
  const [selectedStudent, setStudent] = React.useState<Nullable<Student>>(null);
  const [attachments, setAttachments] = React.useState<FileInput[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const templateId = selectedTpl?.id || '';

  const getTemplatesVars: Graphql.TeacherEmailTemplatesArgs = {
    teacherId: props.klass.teacherId,
    subjectId: props.klass.course.subjectId
  };

  const [removeTpl, removeResult] = useMutation<any, Graphql.IdArgs>(
    RemoveEmailTemplateMutation,
    {
      variables: { id: templateId },
      onError(err) {
        alert.error(getErrorMessage(err));
      },
      onCompleted() {
        alert.success('Template removed successfully');
        selectTpl(null);
        setTplName('');
      },
      update(store) {
        const data = store.readQuery<GetEmailTemplatesResult>({
          query: GetEmailTemplatesQuery,
          variables: getTemplatesVars
        });

        if (data) {
          data.tpls = data.tpls.filter(t => t.id !== templateId);
          store.writeQuery({
            query: GetEmailTemplatesQuery,
            variables: getTemplatesVars,
            data
          });
        }
      }
    }
  );

  const [saveTpl, saveResult] = useMutation<
    SaveEmailTemplateData,
    Graphql.UpdateTeacherEmailTemplateArgs
  >(SaveEmailTemplateMutation, {
    onError(err) {
      alert.error(getErrorMessage(err));
    },
    onCompleted(data) {
      alert.success('Template saved successfully');
      selectTpl(data.tpl);
      setTplName(data.tpl.name);
    }
  });

  const [sendFollowup, sendResult] = useMutation<
    string,
    Graphql.SendFollowupEmailArgs
  >(SendFollowupEmailMutation, {
    onError(err) {
      alert.error(getErrorMessage(err));
    },
    onCompleted() {
      alert.success('Email sent successfully');
      logEvent('Send Followup Email', {
        label: subject,
        variant: tplName
      });
      setStudent(null);
      setAttachments([]);
    }
  });

  const contentState = editorState.getCurrentContent();
  const isEmpty = !contentState.hasText();

  let emailSubject = '';
  let emailBody = '';
  let hasError = false;
  let errorStack = '';

  if (!isEmpty && selectedStudent) {
    try {
      emailSubject = replacePlaceholders(
        subject,
        props.klass,
        selectedStudent,
        props.coupon
      );
      emailBody = replacePlaceholders(
        getHtmlFromContent(contentState),
        props.klass,
        selectedStudent,
        props.coupon
      );
    } catch (e) {
      hasError = true;
      errorStack = e.stack;
    }
  }

  const disableSaveTemplate =
    isEmpty || hasError || !subject || !tplName || saveResult.loading;
  const disableDeleteTemplate =
    !selectedTpl || !selectedTpl.teacherId || removeResult.loading;

  return (
    <Card square elevation={0} style={{ marginTop: 32 }}>
      <CardHeader subheader="Followup with student" />
      <CardContent>
        <SelectTemplate
          getTemplatesVars={getTemplatesVars}
          templateId={templateId}
          handleChange={tpl => {
            if (tpl) {
              selectTpl(tpl);
              setTplName(tpl.name);
              setSubject(tpl.subject);
              setEditorState(initEditorFromHtml(tpl.html));
            } else {
              selectTpl(null);
              setTplName('');
            }
          }}
        />
        <TextField
          fullWidth
          margin="dense"
          label="Template name"
          value={tplName}
          onChange={e => setTplName(e.target.value)}
        />
        <Grid container spacing={2}>
          <Grid item xs={8}>
            <SelectStudent
              students={props.students}
              selected={selectedStudent}
              handleChange={setStudent}
            />
          </Grid>
          <Grid item xs={4}>
            {selectedStudent ? (
              <FormControl
                fullWidth
                margin="dense"
                disabled={props.isUpdatingGender}
              >
                <InputLabel>Gender</InputLabel>
                <NativeSelect
                  value={selectedStudent.gender || ''}
                  onChange={evt => {
                    const gender = evt.target.value;
                    if (gender === 'male' || gender === 'female') {
                      return props.updateGender({
                        variables: {
                          id: selectedStudent.id,
                          gender
                        }
                      });
                    }
                  }}
                >
                  <option value="" disabled />
                  <option value="male">Boy</option>
                  <option value="female">Girl</option>
                </NativeSelect>
              </FormControl>
            ) : (
              <FormControl fullWidth margin="dense" disabled>
                <InputLabel>Gender</InputLabel>
                <NativeSelect>
                  <option value="" disabled />
                  <option value="male">Boy</option>
                  <option value="female">Girl</option>
                </NativeSelect>
              </FormControl>
            )}
          </Grid>
        </Grid>
        <TextField
          label="Email Subject"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          fullWidth
          margin="dense"
          required
        />
      </CardContent>
      <EmailEditor
        state={editorState}
        onChange={setEditorState}
        student={selectedStudent}
        attachments={attachments}
        setAttachments={setAttachments}
        fileInputRef={fileInputRef}
      />
      <Box
        px={2}
        py={1}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
      >
        <div>
          <Button
            color="primary"
            variant="contained"
            disabled={!emailSubject || !emailBody || sendResult.loading}
            onClick={() => {
              if (selectedStudent) {
                return sendFollowup({
                  variables: {
                    attachments,
                    classId: props.klass.id,
                    studentId: selectedStudent.id,
                    subject: emailSubject,
                    html: emailBody
                  }
                });
              }
            }}
          >
            Send Email
          </Button>

          <IconButton
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
          >
            <AttachFileSharp />
          </IconButton>
        </div>
        <div>
          <IconButton
            disabled={disableSaveTemplate}
            onClick={() =>
              selectedTpl && selectedTpl.teacherId
                ? saveTpl({
                    variables: {
                      name: tplName,
                      subject,
                      html: getHtmlFromContent(contentState),
                      teacherId: selectedTpl.teacherId,
                      id: selectedTpl.id
                    }
                  })
                : saveTpl({
                    variables: {
                      name: tplName,
                      subject,
                      html: getHtmlFromContent(contentState),
                      teacherId: props.klass.teacherId
                    },
                    update(store, result) {
                      const data = store.readQuery<GetEmailTemplatesResult>({
                        query: GetEmailTemplatesQuery,
                        variables: getTemplatesVars
                      });

                      if (data && result.data) {
                        data.tpls.push(result.data.tpl);
                        store.writeQuery({
                          query: GetEmailTemplatesQuery,
                          variables: getTemplatesVars,
                          data
                        });
                      }
                    }
                  })
            }
          >
            <SaveSharp />
          </IconButton>
          <IconButton disabled={disableDeleteTemplate} onClick={() => removeTpl()}>
            <DeleteSharp />
          </IconButton>
        </div>
      </Box>
      {selectedStudent && (
        <Accordion square defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography color="primary">Preview Email Content</Typography>
          </AccordionSummary>
          <AccordionDetails style={{ display: 'block' }}>
            <Typography variant="subtitle1">{emailSubject || subject}</Typography>
            <Typography color="textSecondary" variant="subtitle2">
              To: {selectedStudent.name}
            </Typography>
            {hasError ? (
              <Box
                mt={2}
                pt={2}
                borderTop="1px dashed #ddd"
                style={{ overflowX: 'auto' }}
              >
                <Typography color="error" variant="subtitle1" gutterBottom>
                  Please fix the syntax error
                </Typography>
                <Typography color="textSecondary" variant="body2" component="pre">
                  <code>{errorStack}</code>
                </Typography>
              </Box>
            ) : (
              <Box
                mt={2}
                pt={2}
                borderTop="1px dashed #ddd"
                minHeight={32}
                dangerouslySetInnerHTML={{
                  __html: emailBody
                }}
              />
            )}
          </AccordionDetails>
        </Accordion>
      )}
    </Card>
  );
}
