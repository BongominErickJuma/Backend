const express = require('express');
const db = require('./config/db.config');

const app = express();

app.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM country');
  res.status(200).json({
    message: 'These are cities',
    data: rows
  });
});

module.exports = app;
