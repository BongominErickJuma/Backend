class MySQLAPIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
    this.queryParams = [];
    this.whereClauses = [];
  }

  // FILTERING BY STATUS AND REGION
  filter() {
    const { status, region } = this.queryString;

    // Filter by status
    if (status && status.toLowerCase() !== 'all') {
      this.whereClauses.push('LOWER(status) = ?');
      this.queryParams.push(status.toLowerCase());
    }

    // Filter by region
    if (region && region.toLowerCase() !== 'all') {
      this.whereClauses.push('LOWER(region) = ?');
      this.queryParams.push(region.toLowerCase());
    }

    return this;
  }

  // SEARCH BY MULTIPLE FIELDS
  search(fields = []) {
    const { search } = this.queryString;

    if (search && fields.length > 0) {
      const searchConditions = fields
        .map(field => {
          // Handle JSON columns differently
          if (
            field === 'medical_services' ||
            field === 'diagnostic_equipment'
          ) {
            return `JSON_SEARCH(${field}, 'one', ?) IS NOT NULL`;
          } else {
            return `LOWER(${field}) LIKE ?`;
          }
        })
        .join(' OR ');

      this.whereClauses.push(`(${searchConditions})`);

      // Add a parameter for each searchable field
      fields.forEach(field => {
        if (field === 'medical_services' || field === 'diagnostic_equipment') {
          this.queryParams.push(`%${search}%`);
        } else {
          this.queryParams.push(`%${search.toLowerCase()}%`);
        }
      });
    }

    return this;
  }

  // SORTING
  sort() {
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

  // PAGINATION
  paginate() {
    this.buildWhereClause();

    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 20;
    const offset = (page - 1) * limit;

    this.query += ' LIMIT ? OFFSET ?';
    this.queryParams.push(limit, offset);
    return this;
  }

  // Helper: build WHERE clauses once
  buildWhereClause() {
    if (this.whereClauses.length > 0 && !this.query.includes(' WHERE ')) {
      this.query += ' WHERE ' + this.whereClauses.join(' AND ');
    }
  }

  // Return final query
  build() {
    this.buildWhereClause();
    return { sql: this.query, params: this.queryParams };
  }
}

module.exports = MySQLAPIFeatures;
