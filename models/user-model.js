const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true,'Please tell us your name']
  },
  email: {
    type: String,
    required: [true,'Please provide your email'],
    unique: true,
    lowercase: true, //conver to lowercase
    validate: [validator.isEmail, "Please provide a valid email"] 
    // eslint-disable-next-line no-useless-escape
    //match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  photo: {
    type: String,
    default: "default.jpg"
  }, 
  role: {
    type: String,
    enum: {
      values: ["admin", "guide", "lead-guide", "user"],
      message: "Allwed Roles: user, guide, lead-guide, admin"
    },
    default: "user"       
  },
  password: {
    type: String,
    required: [true,'Please provide a password'],    
    minLength: [8,"Password must be at least 8 characters long"],
    select: false
  },      
  passwordConfirm: {
    type: String,
    required: [true,'PasswordConfirm is required'],
    validate: {
      //this.password works only on CREATE/SAVE - that is why we would have to use SAVE to update user
      validator: function(val) { return val === this.password;},
      message: `Password and PasswordConfirm must match`
    }      
  },
  passwordChangedAt: {
    type: Date
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  active: {
    type: Boolean,
    default: true,
    select: false
  }  
});

//Use document middlewares 
//Encrypt password
userSchema.pre("save", async function(next) {
  if(!(this.password && this.isModified("password"))) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;

  // if(this.passwordResetToken) this.passwordResetToken = undefined;
  // if(this.passwordResetExpires) this.passwordResetExpires = undefined;

  next();
});

//Set passwordChangedAt date
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  //do not set for the initiall user creation (at signup)  
  //put back by 1 second so that jwt timestamp does not come before pwd change date (which would cause jwt token validation failure)
  this.passwordChangedAt = Date.now() - 1000; 

  next();
});

userSchema.pre(/^find/, function(next) {
  this.find({ active: {$ne: false}});
  next();
});

userSchema.methods.checkPassword = async function(candidatePassword, userPassword) {
  //we need to pass userPassword, because we have set select:false on the password field.
  //for that reason this.password will not work
  return await bcrypt.compare(candidatePassword, userPassword);
}

userSchema.methods.checkChangedPassword = function(jwtTimestamp) {
  if(this.passwordChangedAt) {
    //jwtTimestamp  is in seconds, so we need to convert
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime()/1000, 10);
    //console.log(changedTimestamp, jwtTimestamp);
    return changedTimestamp > jwtTimestamp;
  }
  return false;
}

userSchema.methods.createPasswordResetToken = function() {
  //generate token
  const resetToken = crypto.randomBytes(32).toString("hex");

  //encrypt token & save the token
  this.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.passwordResetExpires = Date.now() + 1000*60*10;

  //console.log({resetToken, encryptedResetToken: this.passwordResetToken});

  //return token
  return resetToken;
}

const User = mongoose.model('User', userSchema);

module.exports = User;
