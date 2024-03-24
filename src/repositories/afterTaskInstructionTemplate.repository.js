import { AfterTaskInstructionTemplate } from '../models/afterTaskInstructionTemplate'

export const findAfterTaskInstructionTemplateTemplatesRepo = (params, projection = {}) => {
  return AfterTaskInstructionTemplate.find(params, projection).sort({ createdAt: -1 })
}

export const findAfterTaskInstructionTemplateRepo = (params, projection = {}) =>
  AfterTaskInstructionTemplate.findOne(params, projection)

export const createAfterTaskInstructionTemplateRepo = (data) => AfterTaskInstructionTemplate.create(data)
