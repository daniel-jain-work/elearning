import { ContentState, convertToRaw, EditorState } from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import htmlToDraft from 'html-to-draftjs';
import React from 'react';
import { Editor } from 'react-draft-wysiwyg';

interface Props {
  state: EditorState;
  onChange: (state: EditorState) => void;
  placeholder: string;
}

export function getHtmlFromContent(content: ContentState) {
  const rawContentState = convertToRaw(content);
  return draftToHtml(rawContentState);
}

export function initEditorFromHtml(html: string) {
  const { contentBlocks, entityMap } = htmlToDraft(html);
  const content = ContentState.createFromBlockArray(contentBlocks, entityMap);
  return EditorState.createWithContent(content);
}

export function RichTextEditor(props: Props) {
  return (
    <Editor
      editorState={props.state}
      onEditorStateChange={props.onChange}
      placeholder={props.placeholder}
      editorStyle={{
        minHeight: 96,
        backgroundColor: '#f8f9fa',
        paddingLeft: 8,
        paddingRight: 8
      }}
      toolbar={{
        options: ['inline', 'list', 'link', 'remove']
      }}
    />
  );
}
