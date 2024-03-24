const generalResponse = (
  response,
  data = [],
  message = '',
  responseType = 'success',
  toast = false,
  statusCode = 200
) => {
  response.status(statusCode).send({
    data,
    message,
    toast,
    response_type: responseType
  })
}

export default generalResponse
