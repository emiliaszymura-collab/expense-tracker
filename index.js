// Railway/production entry point.
// The actual app lives in ./server. This shim lets the project be deployed
// straight from the repo root (`node index.js`) without having to set a
// custom root directory in the host — it just boots the server.
require('./server/index.js');
