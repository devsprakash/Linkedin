import { HTTP_STATUS } from "./constants.js";

class ResponseFormatter {
  /* =========================
     BASE RESPONSES
  ========================= */

  success(res, {
    data = null,
    message = "Request successful",
    statusCode = HTTP_STATUS.OK,
    meta = null,
  } = {}) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString(),
    };

    if (data !== null) response.data = data;
    if (meta) response.meta = meta;

    return res.status(statusCode).json(response);
  }

  error(res, {
    message = "Something went wrong",
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errors = null,
    code = null,
  } = {}) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    };

    if (code) response.code = code;
    if (errors) response.errors = errors;

    return res.status(statusCode).json(response);
  }

  /* =========================
     COMMON HTTP RESPONSES
  ========================= */

  created(res, data = null, message = "Resource created successfully") {
    return this.success(res, {
      data,
      message,
      statusCode: HTTP_STATUS.CREATED,
    });
  }

  noContent(res) {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }

  accepted(res, data = null, message = "Request accepted") {
    return this.success(res, {
      data,
      message,
      statusCode: HTTP_STATUS.ACCEPTED,
    });
  }

  badRequest(res, message = "Bad request", errors = null) {
    return this.error(res, {
      message,
      statusCode: HTTP_STATUS.BAD_REQUEST,
      errors,
    });
  }

  unauthorized(res, message = "Unauthorized access") {
    return this.error(res, {
      message,
      statusCode: HTTP_STATUS.UNAUTHORIZED,
    });
  }

  forbidden(res, message = "Access forbidden") {
    return this.error(res, {
      message,
      statusCode: HTTP_STATUS.FORBIDDEN,
    });
  }

  notFound(res, message = "Resource not found") {
    return this.error(res, {
      message,
      statusCode: HTTP_STATUS.NOT_FOUND,
    });
  }

  conflict(res, message = "Resource conflict", errors = null) {
    return this.error(res, {
      message,
      statusCode: HTTP_STATUS.CONFLICT,
      errors,
    });
  }

  validationError(res, errors, message = "Validation failed") {
    return this.error(res, {
      message,
      statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      errors,
    });
  }

  tooManyRequests(res, message = "Too many requests", retryAfter = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    };

    if (retryAfter) response.retryAfter = retryAfter;

    return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json(response);
  }

  serviceUnavailable(res, message = "Service temporarily unavailable") {
    return this.error(res, {
      message,
      statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
    });
  }

  /* =========================
     PAGINATION
  ========================= */

  paginated(res, {
    data,
    pagination,
    message = "Data fetched successfully",
  }) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: pagination.pages,
        hasNext: pagination.page < pagination.pages,
        hasPrev: pagination.page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /* =========================
     FILE & STREAM
  ========================= */

  download(res, filePath, fileName) {
    return res.download(filePath, fileName);
  }

  file(res, fileData, contentType, fileName) {
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );
    return res.send(fileData);
  }

  stream(res, stream, contentType) {
    res.setHeader("Content-Type", contentType);
    return stream.pipe(res);
  }

  redirect(res, url, permanent = false) {
    return res.redirect(
      permanent ? HTTP_STATUS.MOVED_PERMANENTLY : HTTP_STATUS.FOUND,
      url
    );
  }

  /* =========================
     ERROR FORMATTERS
  ========================= */

  formatValidationErrors(errors) {
    return errors.array().map(err => ({
      field: err.param,
      message: err.msg,
    }));
  }

  formatMongooseError(error) {
    if (error.name === "ValidationError") {
      return Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
      }));
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return [{
        field,
        message: `${field} already exists`,
      }];
    }

    return [{ message: error.message }];
  }

  /* =========================
     METADATA & LINKS
  ========================= */

  withMetadata(res, data, metadata, message = "Success") {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message,
      data,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }

  withLinks(res, data, links, message = "Success") {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message,
      data,
      links,
      timestamp: new Date().toISOString(),
    });
  }

  /* =========================
     REALTIME
  ========================= */

  sse(res, data, event = null) {
    if (event) res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  ws(io, room, event, data) {
    room ? io.to(room).emit(event, data) : io.emit(event, data);
  }
}

export default new ResponseFormatter();