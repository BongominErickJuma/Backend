const db = require('../config/db.config');

// -------- SUPER ADMIN STATS ----------
exports.getSuperAdminStats = async (req, res) => {
  try {
    const [
      [totalOrgs],
      [activeOrgs],
      [totalRiders],
      [activeRiders],
      [totalPatients]
    ] = await Promise.all([
      db.query('SELECT COUNT(*) AS total FROM partner_organizations'),
      db.query(
        'SELECT COUNT(*) AS total FROM partner_organizations WHERE is_verified = TRUE'
      ),
      db.query('SELECT COUNT(*) AS total FROM delivery_riders'),
      db.query(
        'SELECT COUNT(*) AS total FROM delivery_riders WHERE is_active = TRUE'
      ),
      db.query('SELECT COUNT(*) AS total FROM patients')
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalOrganizations: totalOrgs[0].total,
        activeOrganizations: activeOrgs[0].total,
        totalRiders: totalRiders[0].total,
        activeRiders: activeRiders[0].total,
        totalPatients: totalPatients[0].total
      }
    });
  } catch (err) {
    console.error('Error fetching super admin stats:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// -------- MAIN STATS ----------
exports.getMainStats = async (req, res) => {
  try {
    const [[totalOrgs], [hospitals], [clinics], [pharmacies], [diagnostics]] =
      await Promise.all([
        db.query('SELECT COUNT(*) AS total FROM partner_organizations'),
        db.query(
          "SELECT COUNT(*) AS total FROM partner_organizations WHERE facility_type = 'hospital'"
        ),
        db.query(
          "SELECT COUNT(*) AS total FROM partner_organizations WHERE facility_type = 'clinic'"
        ),
        db.query(
          "SELECT COUNT(*) AS total FROM partner_organizations WHERE facility_type = 'pharmacy'"
        ),
        db.query(
          "SELECT COUNT(*) AS total FROM partner_organizations WHERE facility_type = 'diagnostic center'"
        )
      ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalOrganizations: totalOrgs[0].total,
        hospitals: hospitals[0].total,
        clinics: clinics[0].total,
        pharmacies: pharmacies[0].total,
        diagnosticCenters: diagnostics[0].total
      }
    });
  } catch (err) {
    console.error('Error fetching main stats:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};
