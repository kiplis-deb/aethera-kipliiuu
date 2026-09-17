/**
 * VERCEL SERVERLESS API ENTRYPOINT
 * Bridges Vercel serverless function invocations to Aethera's Backend HTTP router.
 */

const server = require('../Backend/server.js');

module.exports = (req, res) => {
  // Restore original request URL if rewritten by Vercel
  if (req.headers && req.headers['x-matched-path']) {
    req.url = req.headers['x-matched-path'];
  }
  if (typeof server === 'function') {
    return server(req, res);
  }
  return server.emit('request', req, res);
};
