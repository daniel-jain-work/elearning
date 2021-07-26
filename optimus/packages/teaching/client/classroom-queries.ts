import gql from 'graphql-tag';
import {
  ClassDetails,
  ClassDetailsFragment,
  Thread,
  ThreadFragment
} from './data-types';

export const GetClassroomQuery = gql`
  ${ClassDetailsFragment}
  ${ThreadFragment}
  query($id: ID!) {
    classroom: class(id: $id) {
      ...ClassDetailsFragment
      classroomUrl
      threads {
        ...ThreadFragment
      }
    }
  }
`;

export interface GetClassroomResult {
  classroom: ClassDetails & {
    classroomUrl: string;
    threads: Thread[];
  };
}

export const AddThreadMutation = gql`
  mutation(
    $classId: ID!
    $teacherId: ID!
    $content: String!
    $attachments: [FileInput]
  ) {
    addThread(
      classId: $classId
      teacherId: $teacherId
      content: $content
      attachments: $attachments
    ) {
      id
    }
  }
`;

export const DeleteThreadMutation = gql`
  mutation($id: ID!) {
    deleteThread(id: $id)
  }
`;

export const AddCommentMutation = gql`
  mutation($threadId: ID!, $teacherId: ID!, $content: String!) {
    addComment(threadId: $threadId, teacherId: $teacherId, content: $content) {
      id
    }
  }
`;

export const DeleteCommentMutation = gql`
  mutation($id: ID!) {
    deleteComment(id: $id)
  }
`;
