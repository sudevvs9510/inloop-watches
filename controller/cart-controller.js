const mongoose = require("mongoose");
const userModel = require("../model/userSchema");
const productModel = require("../model/productSchema");
const categoryModel = require("../model/categorySchema");
const cartModel = require("../model/cartSchema");
const wishlistModel = require('../model/whishlistSchema')
const { log } = require("console");



const userCart = async (req, res) => {
  try {
    if(!req.session.email || !req.session.userId || !req.session.data){
      return res.redirect('/login')
    }

    let userEmail = await userModel.findOne({email: req.session.email})

    const userId = req.session.userId;
    const category = await categoryModel.find();
    const cart = await cartModel.findOne({ owner: userId });

    for (const item of cart.items) {
      let data = await productModel.findById(item.productId);
      item.data = data;
    }

    const userData = await userModel.findOne({
      _id: new mongoose.Types.ObjectId(userId),
    });

     let wishlistCount = 0;
    const wishlist = await wishlistModel.findOne({ user: userId });
    if (wishlist) {
      wishlistCount = wishlist.product.length;
    }
    
    let price  =  cart.items.map((item)=>{
      return  item.quantity * item.price
    })
    console.log("=================");
    console.log(price);
    console.log("=================");
    // const cart = await cartModel.findOne();
    //  console.log(cart);
    // const cartCount = cart.items.length;
    const cartItemCount = cart ? cart.items.length : 0;
    return res.render("user-cart", {
      category,
      cart: cart,
      userData,
      userEmail: userEmail.email,
      cartItemCount: cartItemCount,
      wishlistCount: wishlistCount,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err });
  }
};

const addToCart = async (req, res) => {
  try {
    if(!req.session.email || !req.session.userId || req.session.data){
      res.redirect('/login')
    }
    const { productId, stock } = req.body;
    const product = await productModel.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product Not Found" });
    }
    if (product.countInStock === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Product is out of stock" });
    }
    // const userId =  req.session.userId;
    // console.log(req.session.email._id);
    let userId = req.session.userId;
    const user = await userModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "user is not found" });
    }

    let cart = await cartModel.findOne({ owner: userId });

    if (!cart) {
      cart = new cartModel({
        owner: userId,
        items: [],
        billTotal: 0,
      });
    }

    const cartItem = cart.items.find(
      (item) => item.productId.toString() === productId
    )

    let outOfStock = false;
    if (cartItem) {
      if (cartItem.quantity < stock) {
        cartItem.quantity += 1;
        cartItem.productPrice = product.afterDiscount;
        cartItem.price = cartItem.quantity * product.afterDiscount;
      } else {
        outOfStock = true;
      }
    } else {
      cart.items.push({
        productId: productId,
        name: product.productName,
        image: product.image,
        productPrice: product.afterDiscount,
        quantity: 1,
        price: product.afterDiscount,
      });
    }
    cart.billTotal = cart.items.reduce((total, item) => total + item.price, 0);
    await cart.save();
    // console.log(`Bill Total"  ${cart.billTotal}`);
    if (outOfStock===true) {
      res.status(205).json({ status: true });
    } else if (outOfStock===false) {
      res.status(200).json({ status: true});
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const cartPut = async (req, res) => {
  try {
    if(!req.session.email || !req.session.userId || req.session.data){
      res.redirect('/login')
    }
    console.log(req.body);
    const productId = req.body.productId;

    // Find the user's cart based on their user ID (you may use cookies or sessions)
    const userId = req.body.userId;
    console.log(userId);
    const cart = await cartModel.findOne({ owner: userId });

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const cartItem = cart.items.find(
      (item) => item.productId.toString() === productId
    );

    if (!cartItem) {
      return res
        .status(404)
        .json({ success: false, message: "Cart item not found" });
    }
    const product = await productModel.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    cartItem.quantity =
      req.body.need === "sub" ? cartItem.quantity - 1 : cartItem.quantity + 1;
    cartItem.price = cartItem.quantity * cartItem.productPrice;

    cart.billTotal =
      req.body.need === "sub"
        ? cart.billTotal - product.afterDiscount
        : cart.billTotal + product.afterDiscount;
    const quantity = cartItem.quantity;

    await cart.save(); // Save the updated cart

    return res.status(200).json({ success: true, quantity: { quantity } });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const cartRemove = async (req, res) => {
  try {
    if(!req.session.email || !req.session.userId || req.session.data){
      res.redirect('/login')
    }
    console.log(req.body);
    const productId = req.body.productId;
    const userId = req.body.userId;

    const cart = await cartModel.findOne({ owner: userId });

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart Not Found" });
    }

    //  const productIndex = cart.items.findIndex((item) => item.productId.toString() === productId);

    //  if(productIndex === -1){
    //      return res.status(404).json({success:false,message:'Product not found'})
    //  }

    // / Check if the removed item was selected and adjust the billTotal
    //  if (cart.items[productIndex].selected) {
    //      cart.billTotal -= cart.items[productIndex].price;
    //  }

    //  cart.items.splice(productIndex,1);

    cart.items.find((item) => {
      if (item.productId + "" === productId + "") {
        console.log(item);
        cart.billTotal = (cart.billTotal-item.price < 0)?0:cart.billTotal-item.price
         
        console.log(cart.billTotal);
        return true;
      } else {
        return false;
      }
    });

    await cartModel.findByIdAndUpdate(cart._id, {
      $set: { billTotal: cart.billTotal },
      $pull: { items: { productId: productId } },
    });

    return res
      .status(200)
      .json({ success: true, message: "Product removed from the cart" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const cartbillTotalUpdate = async (req, res) => {
  try {
    const selectedProductIds = req.body.selectedProductIds;

    // Find the user's cart
    const userId = req.session.email._id;
    const cart = await cartModel.findOne({ owner: userId });

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart is not found based on user" });
    }

    // if(!selectedProducts){
    //     return res.status(404).json({success:false,message:'Selected products not found'})
    // }

    // Set 'selected' to true for all selected products
    cart.items.forEach((item) => {
      if (selectedProductIds.includes(item.productId.toString())) {
        item.selected = true;
      } else {
        item.selected = false; // Unselect other products
      }
    });

    let total = 0;
    cart.items.forEach((item) => {
      if (item.selected) {
        total += item.productPrice * item.quantity;
      }
    });
    // Update the cart's billTotal
    cart.billTotal = total;
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Successfully billtotal updated",
      billTotal: cart.billTotal,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

module.exports = {
  userCart,
  addToCart,
  cartPut,
  cartRemove,
  cartbillTotalUpdate,
};
