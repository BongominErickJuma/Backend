const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/error.controller');
const partnerOrganizationRoutes = require('./routes/partner_organization.routes');
const deliveryRiderRoutes = require('./routes/rider.routes');
const patientRoutes = require('./routes/patient.routes');
const adminRoutes = require('./routes/admin.routes');
const statRoutes = require('./routes/stat.routes');
const app = express();

// const allowedOrigins = [
//   'http://127.0.0.1:5500',
//   'https://goodshepherd.health/'
// ];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       // Allow requests with no origin (like curl or postman)
//       if (!origin) return callback(null, true);
//       if (allowedOrigins.includes(origin)) {
//         return callback(null, true);
//       } else {
//         return callback(new Error('Not allowed by CORS'));
//       }
//     },
//     credentials: true
//   })
// );

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true
  })
);

app.set('query parser', 'extended');

app.use(express.json());
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));
if (process.env.NODE_ENV !== 'production') {
  app.use('/temp', express.static(path.join(__dirname, 'public/temp')));
}

app.use('/gsgh/api/admins', adminRoutes);
app.use('/gsgh/api/organizations', partnerOrganizationRoutes);
app.use('/gsgh/api/patients', patientRoutes);
app.use('/gsgh/api/riders', deliveryRiderRoutes);
app.use('/gsgh/api/stats', statRoutes);

app.all('/*', (req, res, next) => {
  next(
    new AppError(`cannot find route ${req.originalUrl} from our server`, 404)
  );
});

app.use(globalErrorHandler);

module.exports = app;
