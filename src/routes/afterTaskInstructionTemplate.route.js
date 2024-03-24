import { Router } from 'express'
import { authenticated } from '../middlewares/authenticated.middleware'
import { getAfterTaskInstructionTemplate } from '../controllers/afterTaskInstructionTemplate.controller'

const afterTaskInstructionTemplate = Router()

afterTaskInstructionTemplate.get('/after-task-instruction-template', authenticated, getAfterTaskInstructionTemplate)

export default afterTaskInstructionTemplate
