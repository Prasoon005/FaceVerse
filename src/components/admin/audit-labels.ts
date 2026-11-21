/** Shared by server and client components (so not in a "use client" file). */

/** Readable text for each audit action ("admin.leave_approve" → "approved a leave request"). */
const LABELS: Record<string, string> = {
  "admin.enrollment_approve": "approved an identity enrollment",
  "admin.enrollment_reject": "rejected an identity enrollment",
  "admin.identity_change_approve": "approved an identity change request",
  "admin.identity_change_reject": "rejected an identity change request",
  "admin.set_role": "changed a user's role",
  "admin.disable_user": "disabled an account",
  "admin.enable_user": "re-enabled an account",
  "admin.delete_user_biometrics": "deleted a user's biometric data",
  "admin.delete_user": "deleted an account",
  "admin.ask_absence_reason": "asked for an absence reason",
  "admin.absence_approve": "excused an absence",
  "admin.absence_reject": "rejected an absence reason",
  "admin.leave_approve": "approved a leave request",
  "admin.leave_reject": "rejected a leave request",
  "admin.update_attendance_settings": "changed attendance settings",
  "admin.announcement_post": "posted an announcement",
  "admin.announcement_pin": "pinned/unpinned an announcement",
  "admin.announcement_delete": "deleted an announcement",
  "identity.submit": "submitted their identity",
  "identity.resubmit": "re-enrolled their identity",
  "identity.change_request": "asked to change their identity",
  "leave.request": "requested leave",
  "attendance.answer_absence": "explained an absence",
  "person.enroll": "enrolled a person",
  "person.add_samples": "added samples to a person",
  "person.delete": "deleted a person",
};

export function actionLabel(action: string) {
  return LABELS[action] ?? action.replace(/[._]/g, " ");
}
