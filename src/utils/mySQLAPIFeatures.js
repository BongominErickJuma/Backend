class MySQLAPIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
    this.queryParams = [];
    this.whereClauses = [];
  }

  // FILTERING BY VERIFICATION STATUS
  filter() {
    const { verification_status } = this.queryString;

    if (verification_status && verification_status.toLowerCase() !== 'all') {
      this.whereClauses.push('LOWER(verification_status) = ?');
      this.queryParams.push(verification_status.toLowerCase());
    }

    return this;
  }

  // SEARCH BY ORGANIZATION NAME, CITY, ORGANIZATION TYPE
  search(fields = []) {
    const { search } = this.queryString;

    if (search && fields.length > 0) {
      const searchConditions = fields
        .map(field => `LOWER(${field}) LIKE ?`)
        .join(' OR ');

      this.whereClauses.push(`(${searchConditions})`);

      fields.forEach(() => {
        this.queryParams.push(`%${search.toLowerCase()}%`);
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

  // BUILD WHERE CLAUSE ONCE
  buildWhereClause() {
    if (this.whereClauses.length > 0 && !this.query.includes(' WHERE ')) {
      this.query += ' WHERE ' + this.whereClauses.join(' AND ');
    }
  }

  // FINAL OUTPUT
  build() {
    this.buildWhereClause();
    return { sql: this.query, params: this.queryParams };
  }
}

module.exports = MySQLAPIFeatures;
