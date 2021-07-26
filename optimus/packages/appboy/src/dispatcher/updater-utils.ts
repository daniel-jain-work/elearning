import { Graphql } from '@cl/types';
import { Logger } from 'pino';
import { apiRequest, gql } from './api-client';
import { Klass, KlassFragment, Teacher, TeacherFragment } from './model-types';

const UpsertCalendarEventMutation = gql`
  mutation($classId: ID!) {
    upsertCalendarEvent(id: $classId) {
      eventId
    }
  }
`;

export async function upsertCalendarEvent(k: Klass) {
  await apiRequest(UpsertCalendarEventMutation, {
    classId: k.id
  });
}

const TakeDownConflictsMutation = gql`
  mutation($classId: ID!) {
    takeDownConflicts(id: $classId)
  }
`;
export async function takeDownConflicts(k: Klass) {
  await apiRequest(TakeDownConflictsMutation, {
    classId: k.id
  });
}

const UpdateClassStatusMutation = gql`
  mutation($id: ID!, $active: Boolean!) {
    updateClassStatus(id: $id, active: $active) {
      id
      active
    }
  }
`;
export async function takendownClass(k: Klass, logger: Logger) {
  logger.info('class is taken down');
  await apiRequest<any, Graphql.UpdateClassStatusArgs>(UpdateClassStatusMutation, {
    id: k.id,
    active: false
  });
}

const UpsertZoomMeetingMutation = gql`
  mutation($classId: ID!) {
    upsertZoomMeeting(id: $classId) {
      dialInLink
      password
      zoomId
    }
  }
`;

export async function upsertZoomMeeting(k: Klass) {
  const result = await apiRequest<
    { upsertZoomMeeting?: Pick<Klass, 'dialInLink' | 'password' | 'zoomId'> },
    Graphql.ClassIdArgs
  >(UpsertZoomMeetingMutation, { classId: k.id });
  if (result.upsertZoomMeeting) {
    Object.assign(k, result.upsertZoomMeeting);
  }
}

const AttributePurchaseMutation = gql`
  ${KlassFragment}
  mutation($id: ID!) {
    attributePurchase(id: $id) {
      ...KlassFragment
    }
  }
`;
export async function attributePurchase(enrollmentId: number) {
  const result = await apiRequest<{ attributePurchase?: Klass }, Graphql.IdArgs>(
    AttributePurchaseMutation,
    {
      id: enrollmentId.toString()
    }
  );

  return result.attributePurchase;
}

const CreateBackfillMutation = gql`
  mutation($classId: ID!) {
    createBackfill(id: $classId) {
      id
    }
  }
`;
export async function createBackfill(k: Klass) {
  await apiRequest<any, Graphql.ClassIdArgs>(CreateBackfillMutation, {
    classId: k.id
  });
}

const AutoAssignTeacherMutation = gql`
  ${TeacherFragment}
  mutation($classId: ID!, $hintId: ID) {
    autoAssignTeacher(classId: $classId, hintId: $hintId) {
      ...TeacherFragment
    }
  }
`;
export async function autoAssignTeacher(k: Klass, hint?: Teacher) {
  const result = await apiRequest<
    { autoAssignTeacher?: Teacher },
    Graphql.AutoAssignTeacherArgs
  >(AutoAssignTeacherMutation, {
    classId: k.id,
    hintId: hint?.id
  });

  if (result.autoAssignTeacher) {
    k.teacher = result.autoAssignTeacher;
  }
}
