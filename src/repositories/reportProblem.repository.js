import { ReportProblem } from '../models/reportProblem'

const createReportProblem = (data) => {
  return ReportProblem.create(data)
}

const reportProblemCount = (params = {}) => {
  return ReportProblem.count(params)
}

const updateReportProblem = (params, data) => {
  return ReportProblem.update(params, data)
}

const removeReportProblemById = (data) => ReportProblem.delete(data)

const getReportProblem = (params, projections, populate) =>
  ReportProblem.findOne(params, projections).populate(populate)

const findAllReportProblems = (
  params,
  projection = {},
  paginationConf = { skip: 0, limit: 10 },
  sort = { createdAt: -1 },
  populate
) => {
  return ReportProblem.find(params, projection, paginationConf).sort(sort).populate(populate)
}

export {
  createReportProblem,
  reportProblemCount,
  updateReportProblem,
  removeReportProblemById,
  findAllReportProblems,
  getReportProblem
}
