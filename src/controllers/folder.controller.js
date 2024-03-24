import generalResponse from '../helpers/generalResponse.helper'
import { ObjectId } from 'mongodb'
import {
  createFolder,
  deleteFolder,
  findAllFolders,
  findFolder,
  findFolderWithAggregation,
  folderBulkWrite,
  updateFolder
} from '../repositories/folder.repository'
import { getSelectParams } from '../helpers/generalHelper'
import { findChecklistTemplates } from '../repositories/checklistTemplates.repository'
import { findDirectMailTemplates } from '../repositories/directMailTemplates.repository'
import { findEmailTemplates } from '../repositories/emailTemplates.repository'
import { findAllNotes } from '../repositories/note.repository'

export const createFolderDetail = async (req, res) => {
  try {
    const { folderName, folderFor, company, modelRecordId = null, model } = req.body
    const folders = await findAllFolders({
      folderId: folderName.replace(/ /g, '-').toLowerCase(),
      company: ObjectId(company),
      ...(!modelRecordId && { model: null, modelRecordId: null }),
      ...(modelRecordId && { modelRecordId }),
      ...(model && { model }),
      ...(folderFor && { folderFor })
    })
    if (folders && folders.length > 0) {
      return generalResponse(res, false, 'Folder Already Exists.', 'error', true, 404)
    }
    const newFolder = await createFolder({ folderId: folderName.replace(/ /g, '-').toLowerCase(), ...req.body })
    return generalResponse(res, newFolder, 'Folder Created Successfully.', 'success', true, 200)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getFolderDetails = async (req, res) => {
  try {
    const { model, folderFor, company, modelRecordId = null, search = null } = req.query
    const project = { ...getSelectParams(req) }
    let folders = []
    let searchReg = null
    if (folderFor === 'direct-mail-template' || folderFor === 'mass-email-template') {
      // direct-mail-template
      folders = await findFolderWithAggregation(
        {
          ...req.query,
          company: ObjectId(company),
          model: model || null,
          ...(modelRecordId && { modelRecordId: ObjectId(modelRecordId) })
        },
        [
          {
            $lookup: {
              from: folderFor === 'direct-mail-template' ? 'direct-mail-templates' : 'email-templates',
              let: {
                folderId: '$_id'
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ['$folder', '$$folderId']
                    },
                    deleted: false
                  }
                }
              ],
              as: 'totalCounts'
            }
          },
          {
            $addFields: {
              totalCounts: {
                $size: '$totalCounts'
              }
            }
          },
          {
            $sort: {
              createdAt: -1
            }
          }
        ]
      )
      if (folderFor === 'direct-mail-template') {
        const unassigned = await findDirectMailTemplates({
          company: ObjectId(company),
          folder: null
        })
        folders = [
          {
            folderName: 'Unassigned',
            _id: 'unassigned',
            totalCounts: unassigned.length || 0
          }
        ].concat(folders)
      } else {
        const unassigned = await findEmailTemplates({
          company: ObjectId(company),
          folder: null
        })
        folders = [
          {
            folderName: 'Unassigned',
            _id: 'unassigned',
            totalCounts: unassigned.length || 0
          }
        ].concat(folders)
      }
    } else if (folderFor === 'notes') {
      //
      let matchSearchQuery = []
      let unAssignedSearchQuery = []
      if (search && search !== '') {
        const searchString = search.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&') // replacing special characters allowed in regex
        searchReg = new RegExp(searchString, 'i')
        matchSearchQuery = [
          // {
          //   folderName: { $regex: searchReg }
          // },
          {
            title: { $regex: searchReg }
          },
          {
            note: { $regex: searchReg }
          }
        ]
        unAssignedSearchQuery = [
          { title: { $regex: search, $options: 'i' } },
          { note: { $regex: search, $options: 'i' } }
        ]
        delete req.query.search
      }

      folders = await findFolderWithAggregation(
        {
          ...req.query,
          company: ObjectId(company),
          model: model || null,
          ...(modelRecordId && { modelRecordId: ObjectId(modelRecordId) })
        },
        [
          {
            $lookup: {
              from: 'notes',
              localField: '_id',
              foreignField: 'folder',
              pipeline: [
                {
                  $match: {
                    deleted: { $ne: true },
                    ...(search ? { $or: [...matchSearchQuery] } : [])
                  }
                }
              ],
              as: 'notes'
            }
          },
          { $addFields: { totalData: { $size: '$notes' } } },
          {
            $unset: 'notes'
          }
        ]
      )
      const unassigned = await findAllNotes({
        ...(modelRecordId ? { modelId: ObjectId(modelRecordId) } : { modelId: null }),
        company: ObjectId(company),
        ...(unAssignedSearchQuery.length && { $or: unAssignedSearchQuery }),
        folder: null
      })
      folders = [
        {
          folderName: 'Unassigned',
          _id: 'unassigned',
          totalData: unassigned.length || 0,
          order: 0
        }
      ].concat(folders)
    } else if (folderFor === 'checklist') {
      let matchSearchQuery = []
      let unAssignedSearchQuery = []
      if (search && search !== '') {
        const searchString = search.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&') // replacing special characters allowed in regex
        searchReg = new RegExp(searchString, 'i')
        matchSearchQuery = [
          {
            folderName: { $regex: searchReg }
          },
          {
            'checklistTempletes.name': { $regex: searchReg }
          },
          {
            'checklistTempletes.checklist.title': { $regex: searchReg }
          }
        ]
        unAssignedSearchQuery = [
          {
            name: { $regex: searchReg }
          },
          {
            'checklist.title': { $regex: searchReg }
          }
        ]
        delete req.query.search
      }

      folders = await findFolderWithAggregation(
        {
          ...req.query,
          company: ObjectId(company),
          model: model || null,
          ...(modelRecordId && { modelRecordId: ObjectId(modelRecordId) })
        },
        [
          {
            $lookup: {
              from: 'checklist-templates',
              localField: '_id',
              foreignField: 'folder',
              as: 'checklistTempletes'
            }
          },
          {
            $unwind: {
              path: '$checklistTempletes',
              preserveNullAndEmptyArrays: true
            }
          },

          {
            $match: {
              'checklistTempletes.deleted': {
                $ne: true
              },
              ...(search ? { $or: [...matchSearchQuery] } : [])
            }
          },
          {
            $group: {
              _id: '$_id',
              originalFields: {
                $first: '$$ROOT'
              },
              checklistTempletes: {
                $push: '$checklistTempletes'
              }
            }
          },
          {
            $replaceRoot: {
              newRoot: {
                $mergeObjects: [
                  '$originalFields',
                  {
                    checklistTempletes: '$checklistTempletes'
                  }
                ]
              }
            }
          },

          {
            $addFields: {
              totalData: {
                $size: '$checklistTempletes'
              }
            }
          },
          ...(Object.keys(project).length
            ? [
                {
                  $project: {
                    ...project
                  }
                }
              ]
            : [])
        ]
      )
      const unassigned = await findChecklistTemplates({
        ...(modelRecordId ? { contact: ObjectId(modelRecordId) } : { contact: null }),
        company: ObjectId(company),
        ...(unAssignedSearchQuery.length && { $or: unAssignedSearchQuery }),
        folder: null
      })
      folders = [
        {
          folderName: 'Unassigned',
          _id: 'unassigned',
          totalData: unassigned.length || 0,
          order: 0
        }
      ].concat(folders)
    } else {
      if (req.query?.folderFor === 'tags' && !req.query?.modelRecordId) {
        req.query.modelRecordId = null
      }
      folders = await findAllFolders({ ...req.query, model: model || null }, project)
    }

    return generalResponse(res, folders, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteFolderDetail = async (req, res) => {
  try {
    const folder = await deleteFolder({ _id: ObjectId(req.params.id) })
    if (folder && folder.acknowledged && folder.deletedCount === 0) {
      return generalResponse(res, false, 'Folder Not Exists.', 'error', true, 200)
    }
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateFolderDetail = async (req, res) => {
  try {
    const { folderName, company, folderFor, modelRecordId = null } = req.body
    const isFolderExist = await findAllFolders({
      folderId: folderName.replace(/ /g, '-').toLowerCase(),
      company: ObjectId(company),
      folderFor,
      ...(!modelRecordId && { model: null, modelRecordId: null }),
      ...(modelRecordId && { modelRecordId })
    })
    if (isFolderExist && isFolderExist.length > 0) {
      return generalResponse(res, false, 'Folder Already Exists.', 'error', true, 400)
    }
    const folders = await updateFolder(
      { _id: ObjectId(req.params.id) },
      { folderId: folderName.replace(/ /g, '-').toLowerCase(), ...req.body }
    )
    if (folders && folders.matchedCount === 0) {
      return generalResponse(res, false, 'No Folder found.', 'error', true, 200)
    }
    const updatedFolder = await findFolder({ _id: ObjectId(req.params.id) })
    return generalResponse(res, updatedFolder, 'Folder Updated Successfully.', 'success', true, 200)
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const folderReOrder = async (req, res) => {
  try {
    let data = req.body
    data = data?.map((obj) => ({
      updateOne: {
        filter: {
          _id: obj._id
        },
        update: {
          order: obj?.order
        }
      }
    }))
    const tasks = await folderBulkWrite(data || [])
    return generalResponse(res, tasks, 'success')
  } catch (error) {
    // logger(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
