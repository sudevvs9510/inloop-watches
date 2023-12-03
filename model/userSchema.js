const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const userSchema = new mongoose.Schema({
   //signup format//
   username: {
      type: String,
      required: true,
   },
   email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
   },
   phone: {
      type: Number,
      required: true,
      unique: true,
   },
   password: {
      type: String,
      required: true,
      minlength: 6
   },

   //profile format//
   fullname: {
      type: String,
   },

   address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
   },
   stateOrCity: {
      type: String,
   },
   pincodeOrZip: {
      type: Number,
   },
   orderNotes: {
      type: String
   },
   wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet', // Reference to the 'Wallet' model
  },

   //Timestamps//
   createdAt: {
      type: Date,
      default: Date.now,
   },
   updatedAt: {
      type: Date,
      default: Date.now,
   },

   isActive: {
      type: Boolean,
      default: true,
   },
   isVerified: {
      type: Boolean,
      default: false
   },
   isBlocked: {
      type: Boolean,
      default: false
   },
   token:{
      type:String,
      default:null
  }

});

//Hash plain password before saving
// userSchema.pre('save', async function (next) {
//    const user = this;
//    if (user.isModified('password')) {
//       user.password = await bcrypt.hash(user.password, 10)
//    }
//    next();
// })


const UserModel = mongoose.model('users', userSchema)

module.exports = UserModel;