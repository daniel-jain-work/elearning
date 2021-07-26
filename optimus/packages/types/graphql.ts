import { Availability, FileInput, TimeRange } from './common';

// id args
export interface IdArgs {
  id: string;
}

export interface ClassIdArgs {
  classId: string;
}

export interface SessionIdArgs {
  sessionId: string;
}

export interface CourseIdArgs {
  courseId: string;
}

export interface SubjectIdArgs {
  subjectId: string;
}

export interface UserIdArgs {
  userId: string;
}

export interface TeacherIdArgs {
  teacherId: string;
}

export interface StudentIdArgs {
  studentId: string;
}

interface ListQuery {
  offset?: number;
  limit?: number;
}

export type ListArticlesArgs = ListQuery;

export interface PublishArticleArgs extends IdArgs {
  url: string;
  title: string;
  summary: string;
  comments: string;
  image: string;
  grades: string[];
  areas: string[];
}

export interface SubjectsQuery {
  officialOnly?: boolean;
}

export interface ClassesQuery
  extends Partial<SubjectIdArgs>,
    Partial<CourseIdArgs>,
    Partial<TeacherIdArgs>,
    ListQuery {
  timeRange?: TimeRange;
  active?: boolean;
  camp?: boolean;
  requireStudents?: boolean;
  requireTeacher?: boolean;
}

export interface ScheduleProposalsQuery extends CourseIdArgs {
  from?: Date;
}

export type AddStudentToSessionArgs = IdArgs & SessionIdArgs;

export interface AddonCandidatesArgs extends CourseIdArgs {
  idx: number;
}

export type PromotionQueryArgs = IdArgs | { code: string };
export type ListPromotionsArgs = ListQuery;

export interface CreatePromotionArgs {
  code: string;
  type: string;
  amount: number;
  amountInPackage: number;
  expiresAt?: string;
  allowance?: number;
  isLevelUp?: boolean;
  firstTimerOnly?: boolean;
}
export type UpdatePromotionArgs = CreatePromotionArgs & IdArgs;

export interface EnrollmentsQueryArgs extends ListQuery {
  timeRange?: TimeRange;
  paidOnly?: boolean;
}

export type RescheduleRegistrationArgs = IdArgs & ClassIdArgs;

export interface UpdateEnrollmentsStatusVars extends ClassIdArgs {
  students: string[];
  statusCodes: number[];
}

export interface SendClassConfirmationEmailVars extends IdArgs {
  isReschedule?: boolean;
}

export interface UpdateStudentsAttendanceVars extends SessionIdArgs {
  students: string[];
  statusCodes: number[];
}

export interface SendFollowupEmailArgs extends ClassIdArgs {
  studentId?: string;
  subject: string;
  html: string;
  attachments?: FileInput[];
}

export interface TeacherEmailTemplatesArgs extends TeacherIdArgs {
  subjectId?: string;
}

export interface UpdateEmailTemplateArgs
  extends Partial<IdArgs>,
    Partial<TeacherIdArgs>,
    Partial<SubjectIdArgs> {
  name: string;
  html: string;
  subject: string;
  isCommon?: boolean;
}

export interface UpdateTeacherEmailTemplateArgs
  extends Partial<IdArgs>,
    TeacherIdArgs {
  name: string;
  html: string;
  subject: string;
}

export type ListEmailTemplatesArgs = ListQuery & { subjectId?: string };

// teacher related
interface Capability extends CourseIdArgs {
  priority: number;
}

export interface CreateTeacherVars {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  capabilities?: Capability[];
}

export interface EditTeacherVars extends IdArgs {
  firstName?: string;
  master?: boolean;
  lastName?: string;
  avatar?: FileInput;
  bio?: string;
  phoneNumber?: string;
  timezone?: string;
  experiences?: string[];
  capabilities?: Capability[];
}

export interface UpdateTeacherBlackoutDateVars extends TeacherIdArgs {
  date: Date;
}

export interface AddTeacherTimeOffVars extends TeacherIdArgs {
  start: Date;
  end: Date;
}

export interface UpdateTeacherTimeOffVars extends IdArgs {
  start: Date;
  end: Date;
}

export interface UpdateTeacherAvailabilitiesVars extends TeacherIdArgs {
  availabilities: Availability[];
}

export interface EditStudentProfileArgs extends IdArgs {
  name?: string;
  school?: string;
  gender?: 'male' | 'female';
  year?: number;
}

export interface LoginArgs {
  email: string;
  password: string;
  timezone?: string;
  teacherOnly?: boolean;
  internalOnly?: boolean;
}

export interface UpdatePasswordArgs extends IdArgs {
  previous: string;
  password: string;
}

export interface UserSearchQueryArgs {
  search: string;
}

export interface ListUsersArgs extends ListQuery {
  referralOnly?: boolean;
}

// class mutations
export interface CreateClassVars extends CourseIdArgs, Partial<TeacherIdArgs> {
  skipVerification?: boolean;
  active?: boolean;
  dialInLink?: string;
  note?: string;
  schedules: [Date, Date][];
}

export type UpdateClassVars = IdArgs & Omit<CreateClassVars, 'courseId'>;

export interface UpdateClassStatusArgs extends IdArgs {
  active: boolean;
}

export interface SetClassObserversArgs extends ClassIdArgs {
  teacherIds: string[];
}

export interface AutoAssignTeacherArgs extends ClassIdArgs {
  hintId?: string;
}

export interface RequestReassignArgs extends ClassIdArgs {
  reason?: string;
}

export interface IssueCreditArgs extends UserIdArgs {
  cents: number;
  reason: string;
}

export type ListCreditArgs = ListQuery;

export interface CreateBlogPostArgs {
  slug: string;
  published: boolean;
  featured: boolean;
  title: string;
  content: string;
  tags?: string[];
  thumbnail?: string;
}
export type UpdateBlogPostArgs = CreateBlogPostArgs & IdArgs;
export type ListBlogPostsArgs = ListQuery;

export interface GetFileUploadUrlArgs {
  mime: string;
  filepath: string;
}

export interface RefundPurchaseArgs {
  transactionId: string;
  enrollmentIds?: string[];
  amount?: number;
}

export type ListProjectsVars = ListQuery &
  Partial<StudentIdArgs> &
  Partial<SubjectIdArgs>;

export interface AddStudentToClassArgs extends IdArgs, ClassIdArgs {
  amount?: number;
  campaign?: string;
  source?: string;
}

export interface AddThreadArgs extends ClassIdArgs, TeacherIdArgs {
  content: string;
  attachments?: FileInput[];
}

export interface AddCommentArgs extends TeacherIdArgs {
  threadId: string;
  content: string;
}

interface CourseAttributes {
  level: number;
  name: string;
  thumbnail: string;
  capacity: number;
  duration: number;
  price: number;
  grades: [number, number];
  description: string;
  info?: string;
  recording?: string;
  deck?: string;
}

export type CreateCourseArgs = IdArgs & SubjectIdArgs & CourseAttributes;
export type UpdateCourseArgs = IdArgs & Partial<CourseAttributes>;

export type UpdateSubjectArgs = IdArgs &
  Partial<{
    name: string;
    headline: string;
    blurb: string;
    banner: string;
    thumbnail: string;
    exitLevel: number;
  }>;

export interface AddNoteToStudentArgs extends StudentIdArgs {
  content: string;
}
export interface AddNoteToClassArgs extends ClassIdArgs {
  content: string;
}

export interface AddNoteToTeacherArgs extends TeacherIdArgs {
  content: string;
}

export interface CreatePartnerArgs {
  email: string;
  name: string;
  slogan: string;
  summary: string;
  logoImage?: string;
  bannerImage?: string;
  themeColor?: string;
}

export type UpdatePartnerArgs = IdArgs &
  Partial<CreatePartnerArgs> & { courseIds: string[] };

export interface UpdateProjectArgs {
  id: string;
  title?: string;
  url?: string;
  description?: string;
  preview?: string;
  published?: boolean;
  featured?: number;
  subjectId?: string;
}

export interface BackfillReferralArgs extends UserIdArgs {
  refererEmail: string;
}

export interface GenerateQRCodeArgs {
  action: 'QR_STR_SCENE' | 'QR_LIMIT_STR_SCENE';
  scene: string;
}
