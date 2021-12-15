class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;

    const { page, sort, limit, fields, ...where} = this.queryString;
    this.page = page;
    this.sorting = sort;
    this.take = limit;
    this.fields = fields;
    this.where = where;
  }

  filter() {    
    //console.log(this.where)
    const queryStr = JSON.stringify(this.where);
    this.query.find(JSON.parse(queryStr.replace(/\b(gte|gt|lte|lt|ne)\b/g, (match)=>`$${match}`)));    
    return this;
  }

  project() {
    if(this.fields) {
      this.query.select(this.fields.split(",").join(" "));
    } else {
      this.query.select("-__v");
    }     
    return this;
  }

  sort() {
    if(this.sorting) {
      this.query.sort(this.sorting.split(",").join(" "));
    } else {
      this.query.sort("-createdAt");
    }
    return this;
  }

  paginate() {
    const take = Number(this.take || 5);
    const page = Number(this.page || 1);
    const skip = (page-1)*take;

    this.query.skip(skip).limit(take);    
    return this;
  }
}

module.exports = APIFeatures;