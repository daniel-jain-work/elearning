import { Graphql, WebEvents } from '@cl/types';
import { Topic, UnsubscribeGroups } from 'cl-common';
import { DateTime } from 'luxon';
import { Logger } from 'pino';
import { ClassMaster, MsOps, sendTemplatedEmail } from '../mailer';
import {
  createClassParams,
  createRecipient,
  createStudentParams
} from '../mailer-utils';
import { apiRequest, gql } from './api-client';
import { Klass, KlassFragment, Student, StudentFragment, User } from './model-types';
import {
  attributePurchase,
  autoAssignTeacher,
  createBackfill,
  takendownClass,
  upsertZoomMeeting
} from './updater-utils';

const GetEnrollmentQuery = gql`
  ${KlassFragment}
  ${StudentFragment}
  query($id: ID!) {
    enrollment(id: $id) {
      id
      student {
        ...StudentFragment
        parent {
          attended
          paid
        }
      }
      klass: class {
        ...KlassFragment
        active
        numberOfRegistrations
        isCamp
      }
    }
  }
`;

interface StudentDetails extends Student {
  parent: User & {
    attended: boolean;
    paid: boolean;
  };
}

interface GetEnrollmentResult {
  enrollment: Graphql.IdArgs & {
    student: StudentDetails;
    klass: Klass & {
      active: boolean;
      numberOfRegistrations: number;
      isCamp: boolean;
    };
  };
}

const SendClassConfirmationEmailMutation = gql`
  mutation($id: ID!, $isReschedule: Boolean) {
    sendClassConfirmationEmail(id: $id, isReschedule: $isReschedule)
  }
`;

export async function handleClassEnrolled(
  payload: WebEvents.ClassEnrolledEvent['payload'],
  logger: Logger
) {
  const result = await apiRequest<GetEnrollmentResult, Graphql.IdArgs>(
    GetEnrollmentQuery,
    { id: payload.id.toString() }
  );

  if (!result.enrollment || result.enrollment.klass.id !== payload.classId) {
    throw new Error(`Unknown enrollment id: ${payload.id}`);
  }

  const { klass, student } = result.enrollment;

  let prior: Klass;
  if (!payload.isReschedule && klass.course.isRegular) {
    prior = await attributePurchase(payload.id);
  }

  // make sure we have zoomhost available before sending out confirmation
  if (!klass.dialInLink) {
    await upsertZoomMeeting(klass);
    if (!klass.dialInLink && klass.active) {
      await takendownClass(klass, logger);
      return;
    }
  }

  // send confirmation email
  await apiRequest<any, Graphql.SendClassConfirmationEmailVars>(
    SendClassConfirmationEmailMutation,
    {
      id: payload.id.toString(),
      isReschedule: payload.isReschedule
    }
  );

  if (!payload.isReschedule) {
    if ([Topic.WEBINARS, Topic.PE].includes(klass.course.subjectId)) {
      await sendOpenClassFollowup(student);
    } else if (klass.course.level === 1) {
      await sendAdditionalNote(student, klass, prior);
    }
  }

  if (!klass.teacher && (klass.course.isTrial || klass.course.level > 1)) {
    await autoAssignTeacher(klass, prior?.teacher);
    if (!klass.teacher && klass.active) {
      await takendownClass(klass, logger);
    }
  }

  if (klass.numberOfRegistrations >= klass.course.capacity) {
    logger.info('%s is full, try to backfill', klass.course.name);
    if (klass.course.isTrial || (klass.course.level === 1 && klass.isCamp)) {
      await createBackfill(klass);
    }
  }
}

async function sendOpenClassFollowup(student: StudentDetails) {
  if (student.parent.attended || student.parent.paid) {
    return;
  }

  await sendTemplatedEmail({
    templateId: 'd-d9d047292ab148e585e9713c7dbaa9a0',
    from: MsOps,
    to: createRecipient(student.parent),
    asm: { groupId: UnsubscribeGroups.Classes },
    sendAt: Math.round(Date.now() / 1000) + 7200,
    customArgs: {
      amp_user_id: student.parent.id
    },
    dynamicTemplateData: createStudentParams(student)
  });
}

async function sendAdditionalNote(
  student: StudentDetails,
  klass: Klass,
  prior?: Klass
) {
  const local = DateTime.local();
  const start = DateTime.fromISO(klass.startDate, {
    zone: student.parent.timezone
  });

  // watch scratch video
  if (!prior && [Topic.SN, Topic.AS].includes(klass.course.subjectId)) {
    return sendTemplatedEmail({
      templateId: 'd-c3621b642c6a440e886ed619ef142db2',
      from: ClassMaster,
      to: createRecipient(student.parent),
      asm: { groupId: UnsubscribeGroups.Classes },
      sendAt: Math.round(local.plus({ minutes: 15 }).toSeconds()),
      customArgs: {
        amp_user_id: student.parent.id
      },
      dynamicTemplateData: createStudentParams(student)
    });
  }

  if (
    !prior &&
    start.diffNow('days').days > 3 &&
    [
      Topic.AS,
      Topic.DS,
      Topic.AI,
      Topic.MC,
      Topic.ROBO,
      Topic.DESIGN,
      Topic.PY
    ].includes(klass.course.subjectId)
  ) {
    return sendTemplatedEmail({
      templateId: 'd-4953d5b108344b8d81d2abd9f232d5ad',
      from: MsOps,
      to: createRecipient(student.parent),
      asm: { groupId: UnsubscribeGroups.Classes },
      sendAt: Math.round(local.plus({ hour: 1 }).toSeconds()),
      customArgs: {
        amp_user_id: student.parent.id
      },
      dynamicTemplateData: {
        classDate: start.toFormat('DDD'),
        classListingUrl: klass.course.subject.listingUrl,
        ...createClassParams(klass, klass.course),
        ...createStudentParams(student)
      }
    });
  }

  if (klass.course.subjectId === Topic.MC) {
    return sendTemplatedEmail({
      templateId: 'd-b84f5f67c1ac406dba71fdb103d91835',
      from: ClassMaster,
      to: createRecipient(student.parent),
      asm: { groupId: UnsubscribeGroups.Classes },
      sendAt: Math.round(local.plus({ hours: 2 }).toSeconds()),
      customArgs: {
        amp_user_id: student.parent.id
      },
      dynamicTemplateData: createStudentParams(student)
    });
  }

  if (klass.course.subjectId === Topic.ROBO) {
    return sendTemplatedEmail({
      templateId: 'd-c65b173e8d3b41949821c794f7c5a993',
      from: ClassMaster,
      to: createRecipient(student.parent),
      asm: { groupId: UnsubscribeGroups.Classes },
      sendAt: Math.round(local.plus({ hours: 2 }).toSeconds()),
      customArgs: {
        amp_user_id: student.parent.id
      },
      dynamicTemplateData: createStudentParams(student)
    });
  }
}
