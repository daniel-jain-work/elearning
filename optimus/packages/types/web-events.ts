interface Event<T> {
  type: string;
  payload: T;
}

export interface AccountCreatedEvent extends Event<{ id: string; email: string }> {
  type: 'ACCOUNT_CREATED';
}

export interface ClassEnrolledEvent
  extends Event<{
    id: number;
    classId: string;
    isReschedule?: boolean;
  }> {
  type: 'CLASS_ENROLLED';
}

export interface ClassCreatedEvent
  extends Event<{
    classId: string;
  }> {
  type: 'CLASS_CREATED';
}

export interface ClassUpdatedEvent
  extends Event<{
    classId: string;
    teacherChanged: boolean;
    scheduleChanged: boolean;
  }> {
  type: 'CLASS_UPDATED';
}

export interface BlogUpdatedEvent
  extends Event<{
    blogPostId: string;
    identity: string;
  }> {
  type: 'BLOG_UPDATED';
}

export interface DownloadRecordingEvent
  extends Event<{
    classId: string;
    timestamp: number;
    recordingType: string;
    fileType: string;
    downloadUrl: string;
  }> {
  type: 'DOWNLOAD_RECORDING';
}
