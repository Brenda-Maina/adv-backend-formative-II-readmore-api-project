const HttpError = require('../utils/HttpError');

const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// Express recognises an error handler by its four parameters.
const errorHandler = (err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body is not valid JSON' });
  }

  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((error) => error.message);
    return res.status(400).json({ message: 'Validation failed', details });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid value for "${err.path}": ${err.value}` });
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: 'Duplicate entry: that record already exists' });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }

  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
};

module.exports = { notFound, errorHandler };
