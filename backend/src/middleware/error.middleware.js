export function errorHandler(err, _req, res, _next) {
  console.error('[error]', err.message);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Route not found' });
}
