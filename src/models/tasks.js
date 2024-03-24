import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

export const TASK_TIMER_STATUS = {
  start: 'start',
  pause: 'pause',
  end: 'end'
}
const schema = new Schema(
  {
    taskNumber: {
      type: String
    },
    name: {
      type: String,
      required: true
    },
    completedTaskInstruction: {
      type: String,
      required: false,
      default: null
    },
    order: {
      type: Number,
      required: true
    },
    kanbanStatusOrder: {
      type: Number,
      required: true
    },
    kanbanPriorityOrder: {
      type: Number,
      required: true
    },
    kanbanCategoryOrder: {
      type: Number,
      required: true
    },
    details: {
      type: String
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    frequency: {
      type: String,
      default: 'never'
    },
    priority: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskOption'
    },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskOption'
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskOption',
      default: null
    },
    labels: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'TaskOption',
      default: []
    },
    parent_task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tasks',
      default: null
    },
    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contacts',
      default: null
    },
    assigned: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Users',
      default: []
    },
    est_time_complete: {
      type: String,
      default: null
    },
    attachments: {
      type: [
        {
          fileName: { type: String, default: '' },
          fileUrl: { type: String, default: '' }
        }
      ],
      default: []
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies'
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: { type: Date, default: null },
    trash: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true
    },
    checklist: [
      {
        title: { type: String, required: true },
        details: { type: String, required: false },
        checked: { type: Boolean, required: false, default: false },
        sort: { type: Number, required: false }
      }
    ],
    checklistDetails: {
      type: {
        checklistTemplate: { type: mongoose.Schema.Types.ObjectId, ref: 'Checklist-Template', default: null },
        checklist: [
          {
            title: { type: String, required: true },
            details: { type: String, required: false },
            checked: { type: Boolean, required: false, default: false },
            sort: { type: Number, required: false },
            updatedBy: { type: mongoose.Schema.Types.ObjectId, required: false, default: null, ref: 'Users' },
            checkedTimeAt: { type: Date, required: false, default: null }
          }
        ]
      },
      default: null
    },
    schedule: {
      type: {
        endType: { type: String },
        occurrences: { type: Number },
        repeatEveryCount: { type: Number },
        schedule: { type: String },
        selectedDays: [{ type: Number }],
        untilDate: { type: Date }
      },
      default: null
    },
    warningDisabledUsers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Users',
      default: []
    }
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const Tasks = model('Tasks', schema)
