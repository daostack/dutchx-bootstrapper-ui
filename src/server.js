const path = require('path');
const express = require('express');

const port = (process.env.PORT || 8080);
const dist = process.env.NODE_ENV == "production" ? "dist_prod" : "dist";

const app = express();
const indexPath = path.join(__dirname, '../' + dist + '/index.html');
const distPath = express.static(path.join(__dirname, '../' + dist));
app.use('/', distPath);
app.get('*', function(_, res) { res.sendFile(indexPath) });

app.listen(port);
console.log(`Listening on port ${port}`);
