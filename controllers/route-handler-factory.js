const catchAsync = require("../utils/catch-async");
const AppError = require("../utils/app-error");
const APIFeatures = require("../utils/api-features");

// eslint-disable-next-line arrow-body-style
module.exports.deleteOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const doc = await Model.findByIdAndDelete(id);
  
    if(!doc) return next(new AppError(`No document found with that ID`, 404));
  
    res.status(204).json({
      status: 'success',
      data: null
    });    
  });
}

// eslint-disable-next-line arrow-body-style
module.exports.updateOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const doc = await Model.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });
  
    if(!doc) return next(new AppError("No document found with that ID", 404));
    
    res.status(201).json({
      status: 'success',
      data: { data: doc }
    });
  });
}

// eslint-disable-next-line arrow-body-style
module.exports.createOne = (Model) => {
  
  return catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: { data: doc }
    });
  });
}  

module.exports.getOne = (Model, popOptions)=>
  catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const query =  Model.findById(id);
    if(popOptions) {
      if(Array.isArray(popOptions))
        popOptions.forEach(opt => query.populate(opt));
      else  
        query.populate(popOptions);
    }
    const doc = await query;

    if(!doc) return next(new AppError("No document found with that ID", 404));
      
    res.status(200).json({
      status: 'success',
      data: { data: doc}
    });    
  });

module.exports.getAll = (Model)=>
  catchAsync(async (req, res, next) => {
    //console.log(req.query);
    const features = new APIFeatures(Model.find(), req.query);
    features.filter().project().sort().paginate();
    //const docs = await features.query.explain();
    const docs = await features.query;

    res.status(200).json({
      status: 'success',
      result: docs.length,
      data: { data: docs }
    });    
  });