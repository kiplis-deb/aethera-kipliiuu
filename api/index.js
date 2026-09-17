/**
 * VERCEL SERVERLESS API ENTRYPOINT
 * Bridges Vercel serverless function invocations to Aethera's Backend HTTP router.
 */

const server = require('../Backend/server.js');

module.exports = (req, res) => {
  if (typeof server === 'function') {
    return server(req, res);
  }
  return server.emit('request', req, res);
};
