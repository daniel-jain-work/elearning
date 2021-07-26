"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoAssignTeacher = exports.createBackfill = exports.attributePurchase = exports.upsertZoomMeeting = exports.takendownClass = exports.takeDownConflicts = exports.upsertCalendarEvent = void 0;
const api_client_1 = require("./api-client");
const model_types_1 = require("./model-types");
const UpsertCalendarEventMutation = api_client_1.gql `
  mutation($classId: ID!) {
    upsertCalendarEvent(id: $classId) {
      eventId
    }
  }
`;
async function upsertCalendarEvent(k) {
    await api_client_1.apiRequest(UpsertCalendarEventMutation, {
        classId: k.id
    });
}
exports.upsertCalendarEvent = upsertCalendarEvent;
const TakeDownConflictsMutation = api_client_1.gql `
  mutation($classId: ID!) {
    takeDownConflicts(id: $classId)
  }
`;
async function takeDownConflicts(k) {
    await api_client_1.apiRequest(TakeDownConflictsMutation, {
        classId: k.id
    });
}
exports.takeDownConflicts = takeDownConflicts;
const UpdateClassStatusMutation = api_client_1.gql `
  mutation($id: ID!, $active: Boolean!) {
    updateClassStatus(id: $id, active: $active) {
      id
      active
    }
  }
`;
async function takendownClass(k, logger) {
    logger.info('class is taken down');
    await api_client_1.apiRequest(UpdateClassStatusMutation, {
        id: k.id,
        active: false
    });
}
exports.takendownClass = takendownClass;
const UpsertZoomMeetingMutation = api_client_1.gql `
  mutation($classId: ID!) {
    upsertZoomMeeting(id: $classId) {
      dialInLink
      password
      zoomId
    }
  }
`;
async function upsertZoomMeeting(k) {
    const result = await api_client_1.apiRequest(UpsertZoomMeetingMutation, { classId: k.id });
    if (result.upsertZoomMeeting) {
        Object.assign(k, result.upsertZoomMeeting);
    }
}
exports.upsertZoomMeeting = upsertZoomMeeting;
const AttributePurchaseMutation = api_client_1.gql `
  ${model_types_1.KlassFragment}
  mutation($id: ID!) {
    attributePurchase(id: $id) {
      ...KlassFragment
    }
  }
`;
async function attributePurchase(enrollmentId) {
    const result = await api_client_1.apiRequest(AttributePurchaseMutation, {
        id: enrollmentId.toString()
    });
    return result.attributePurchase;
}
exports.attributePurchase = attributePurchase;
const CreateBackfillMutation = api_client_1.gql `
  mutation($classId: ID!) {
    createBackfill(id: $classId) {
      id
    }
  }
`;
async function createBackfill(k) {
    await api_client_1.apiRequest(CreateBackfillMutation, {
        classId: k.id
    });
}
exports.createBackfill = createBackfill;
const AutoAssignTeacherMutation = api_client_1.gql `
  ${model_types_1.TeacherFragment}
  mutation($classId: ID!, $hintId: ID) {
    autoAssignTeacher(classId: $classId, hintId: $hintId) {
      ...TeacherFragment
    }
  }
`;
async function autoAssignTeacher(k, hint) {
    const result = await api_client_1.apiRequest(AutoAssignTeacherMutation, {
        classId: k.id,
        hintId: hint === null || hint === void 0 ? void 0 : hint.id
    });
    if (result.autoAssignTeacher) {
        k.teacher = result.autoAssignTeacher;
    }
}
exports.autoAssignTeacher = autoAssignTeacher;
