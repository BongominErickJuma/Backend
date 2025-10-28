class MySQLAPIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
    this.queryParams = [];
    this.whereClauses = [];
  }

  filter() {
    const { status, region } = this.queryString;

    // Status filtering
    if (status && status !== 'all') {
      switch (status.toLowerCase()) {
        case 'active':
          this.whereClauses.push(
            'is_verified = TRUE AND is_inactive = FALSE AND is_suspended = FALSE'
          );
          break;
        case 'inactive':
          this.whereClauses.push('is_inactive = TRUE');
          break;
        case 'pending':
          this.whereClauses.push('is_verified = FALSE');
          break;
        case 'suspended':
          this.whereClauses.push('is_suspended = TRUE');
          break;
      }
    }

    // Region filtering
    if (region && region.toLowerCase() !== 'all') {
      this.whereClauses.push('LOWER(region) = ?');
      this.queryParams.push(region.toLowerCase());
    }

    return this;
  }

  search(fields = []) {
    const { search } = this.queryString;
    if (search && fields.length > 0) {
      const searchConditions = fields
        .map(field => {
          // Handle JSON array fields differently
          if (
            field === 'medical_services' ||
            field === 'diagnostic_equipment'
          ) {
            // Search within JSON arrays using JSON_SEARCH
            return `JSON_SEARCH(${field}, 'one', ?) IS NOT NULL`;
          } else {
            // Regular text field search
            return `LOWER(${field}) LIKE ?`;
          }
        })
        .join(' OR ');

      this.whereClauses.push(`(${searchConditions})`);

      // Add search parameter for each field
      fields.forEach(field => {
        if (field === 'medical_services' || field === 'diagnostic_equipment') {
          // For JSON search, we need the exact term with wildcards
          this.queryParams.push(`%${search}%`);
        } else {
          // For regular fields, use wildcards and lowercase
          this.queryParams.push(`%${search.toLowerCase()}%`);
        }
      });
    }
    return this;
  }

  sort() {
    // Build WHERE clauses first
    this.buildWhereClause();

    const { sort } = this.queryString;
    if (sort) {
      const sortBy = sort
        .split(',')
        .map(f => (f.startsWith('-') ? `${f.slice(1)} DESC` : `${f} ASC`))
        .join(', ');
      this.query += ` ORDER BY ${sortBy}`;
    } else {
      this.query += ' ORDER BY created_at DESC';
    }
    return this;
  }

  paginate() {
    // Build WHERE clauses first
    this.buildWhereClause();

    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 20;
    const offset = (page - 1) * limit;
    this.query += ' LIMIT ? OFFSET ?';
    this.queryParams.push(limit, offset);
    return this;
  }

  // Helper method to build WHERE clause
  buildWhereClause() {
    if (this.whereClauses.length > 0 && !this.query.includes(' WHERE ')) {
      this.query += ' WHERE ' + this.whereClauses.join(' AND ');
    }
  }

  build() {
    this.buildWhereClause();
    return { sql: this.query, params: this.queryParams };
  }
}

module.exports = MySQLAPIFeatures;
