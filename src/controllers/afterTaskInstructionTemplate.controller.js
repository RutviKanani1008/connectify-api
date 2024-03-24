import generalResponse from '../helpers/generalResponse.helper'
import { ObjectId } from 'mongodb'
import {
  createAfterTaskInstructionTemplateRepo,
  findAfterTaskInstructionTemplateTemplatesRepo
} from '../repositories/afterTaskInstructionTemplate.repository'

export const getAfterTaskInstructionTemplate = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const templates = await findAfterTaskInstructionTemplateTemplatesRepo({
      user: ObjectId(currentUser._id),
      company: ObjectId(currentUser.company)
    }).select({
      templateBody: 1
    })
    return generalResponse(res, templates, '', 'success', false, 200)
  } catch (error) {
    console.log('Error:getAfterTaskInstructionTemplate', error)
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}

export const createAfterTaskInstructionTemplate = async (req, res) => {
  try {
    const currentUser = JSON.parse(JSON.stringify(req.headers.authorization))
    const { templateBody } = req.body
    const template = await createAfterTaskInstructionTemplateRepo({
      user: currentUser._id,
      company: currentUser.company,
      templateBody
    })
    return generalResponse(res, template, '', 'success', false, 200)
  } catch (error) {
    console.log('Error:createAfterTaskInstructionTemplate', error)
    return generalResponse(res, null, error?.message || error, 'error', false, 400)
  }
}
