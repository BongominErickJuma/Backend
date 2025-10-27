const env = require('dotenv');
const path = require('path');

env.config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app.js');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'adopted'}]`
  );
});
