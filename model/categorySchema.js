const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  // _id: {
  //   type: String, // Set the type to String for _id
  //   required: true,
  //   trim: true,
  //   unique: true
  // },
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    required: true,
  },
  image: {
    type: String, // You can use String to store the image URL or file path
  },
  isFeatured:{
    type:Boolean,
    default:true
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }]
}, {
  timestamps: true
});

const categoryModel = mongoose.model('Category', categorySchema);

module.exports = categoryModel;