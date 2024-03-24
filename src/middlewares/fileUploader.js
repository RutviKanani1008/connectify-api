import multer from 'multer'
import AWS from 'aws-sdk'
import multerS3 from 'multer-s3'
import generalResponse from '../helpers/generalResponse.helper'
import { CSV_FILE_TYPES, CSV_FILE_TYPE_FIELD_NAMES } from '../utils/constant'
import path from 'path'
import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3'

export const getS3Config = () => {
  const AWSendpoint = new AWS.Endpoint(`s3.${process.env.WASABI_REGION}.wasabisys.com`)

  return new S3Client({
    region: process.env.WASABI_REGION,
    endpoint: AWSendpoint,
    credentials: {
      accessKeyId: process.env.WASABI_ACCESS_KEY_ID,
      secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY
    }
  })
}

export const s3BucketFileUploader = (req, res, next) => {
  try {
    const io = req.app.get('io')
    const sockets = req.app.get('sockets')
    const thisSocketId = sockets?.[req.headers['socket-session-id']]
    const socketInstance = thisSocketId ? io.to(thisSocketId) : false

    let progress = 0
    const fileSize = req.headers['content-length']

    req.on('data', (chunk) => {
      progress += chunk.length
      const percentage = (progress / fileSize) * 70
      socketInstance && socketInstance.emit('uploadProgress', percentage)
    })

    const s3Config = getS3Config()

    const upload = multer({
      storage: multerS3({
        s3: s3Config,
        acl: 'public-read',
        bucket: process.env.WASABI_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
          const uploadPathWithOriginalName =
            req.body.filePath + '/' + Date.now() + '_' + file.originalname.replace(/ /g, '-')
          cb(null, uploadPathWithOriginalName)
        }
      }),
      limits: {
        fileSize: 25 * 1024 * 1024
      }
      // fileFilter: (req, file, cb) => {
      //   checkFileType(file, cb)
      // },
    }).any()

    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        return generalResponse(res, err, '', 'error', false, 400)
      } else if (err) {
        return generalResponse(res, err, '', 'error', false, 400)
      }
      socketInstance && socketInstance.emit('uploadProgress', 80)
      req.socketInstance = socketInstance
      next()
    })
  } catch (error) {
    console.log({ error })
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

const checkFileType = (file, cb) => {
  if (CSV_FILE_TYPE_FIELD_NAMES.includes(file.fieldname)) {
    if (CSV_FILE_TYPES.includes(file.mimetype)) {
      return cb(null, true)
    } else {
      return cb(new Error('goes wrong on the mimetype'))
    }
  }
  cb(null, true)
}
export const fileUploader = (req, res, next) => {
  try {
    const io = req.app.get('io')
    const sockets = req.app.get('sockets')
    const thisSocketId = sockets?.[req.headers['socket-session-id']]
    const socketInstance = thisSocketId ? io.to(thisSocketId) : false

    let progress = 0
    const fileSize = req.headers['content-length']

    req.on('data', (chunk) => {
      progress += chunk.length
      const percentage = (progress / fileSize) * 70
      socketInstance && socketInstance.emit('uploadProgress', percentage)
    })

    const upload = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, 'public')
        },
        filename: (req, file, cb) => {
          cb(null, file.fieldname + '_' + Date.now() + path.extname(file.originalname))
        }
      }),
      limits: {
        fileSize: 50 * 1024 * 1024
      },
      fileFilter: (_, file, cb) => {
        checkFileType(file, cb)
      }
    }).any()
    upload(req, res, function (err) {
      try {
        if (err instanceof multer.MulterError) {
          return generalResponse(res, err, '', 'error', false, 400)
        } else if (err) {
          return generalResponse(res, err, '', 'error', false, 400)
        }
        socketInstance && socketInstance.emit('uploadProgress', 80)
        req.socketInstance = socketInstance
        next()
      } catch (error) {
        return generalResponse(res, error?.message ? error?.message : error, '', 'error', false, 400)
      }
    })
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteAttachmentFromWasabi = async (attachmentURLs = []) => {
  console.log({ attachmentURLs: [...attachmentURLs.map((filename) => ({ Key: filename }))] })
  const s3Config = getS3Config()
  const deleteObject = new DeleteObjectsCommand({
    Bucket: process.env.WASABI_BUCKET_NAME,
    Delete: {
      Objects: [...attachmentURLs.map((filename) => ({ Key: filename }))]
    }
  })

  const response = await s3Config.send(deleteObject)
  return response
}
