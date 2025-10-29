const express = require('express');
const cookieParser = require('cookie-parser');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/error.controller');
const partnerOrganizationRoutes = require('./routes/partner_organization.routes');
const patientRoutes = require('./routes/patient.routes');
const app = express();

// Import hospital routes

app.set('query parser', 'extended');

app.use(express.json());
app.use(cookieParser());

app.use('/gsgh/api/organizations', partnerOrganizationRoutes);
app.use('/gsgh/api/patients', patientRoutes);

app.all('/*', (req, res, next) => {
  next(
    new AppError(`cannot find route ${req.originalUrl} from our server`, 404)
  );
});

app.use(globalErrorHandler);

module.exports = app;
