/**
 * Custom Request Logger Middleware
 * Logs HTTP method, URL, status code, response duration, and timestamp.
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  // Listen to response finish event to capture status and elapsed time
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    
    // Status color/indicator helper
    let statusMarker = 'ℹ️';
    if (statusCode >= 500) statusMarker = '❌';
    else if (statusCode >= 400) statusMarker = '⚠️';
    else if (statusCode >= 300) statusMarker = '🔀';
    else if (statusCode >= 200) statusMarker = '✅';

    console.log(
      `[${timestamp}] ${statusMarker} ${req.method.padEnd(6)} ${req.originalUrl} | Status: ${statusCode} | ${duration}ms`
    );
  });

  next();
}

module.exports = { requestLogger };
