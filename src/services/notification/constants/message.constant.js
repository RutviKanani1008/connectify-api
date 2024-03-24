export const TASK_MANAGER_NOTIFICATION_MSG = Object.freeze({
  CREATE_TASK_FOR_ASSIGNEE: ({ taskName }) => `You are assigned to ${taskName} task.`,
  CREATE_TASK_FOR_ADMIN: ({ taskName }) => `A new ${taskName} task has been created.`,
  NEW_ASSIGNEE_ADD_IN_TASK_FOR_ADMIN: ({ taskName }) => `In ${taskName} task new user assigned.`,
  NEW_COMMENT_ADDED_IN_TASK_ADMIN: ({ taskName }) => `New update added in ${taskName} task.`,
  NEW_COMMENT_ADDED_IN_TASK_MENTION_USER: ({ taskName }) => `You have been mentioned in ${taskName} task update.`,
  UPDATE_TASK_STATUS: ({ taskName, statusName }) => `Moved to ${statusName} : ${taskName}`
})

export const FORM_NOTIFICATION_MSG = Object.freeze({
  CREATE_CONTACT_FROM_FORM: ({ contactTitle, formTitle }) => `${contactTitle} contact created from ${formTitle} form.`
})

export const USER_NOTIFICATION_MSG = Object.freeze({
  CREATE_USER_FOR_ADMIN: ({ userName }) => `A new ${userName} user has been created.`
})
