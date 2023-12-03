const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({

   adminEmail:{
      type:String,
      required: true
   },
   adminPassword:{
      type:String,
      required: true
   }
})

const AdminModel = mongoose.model('admin',adminSchema)

module.exports = AdminModel;