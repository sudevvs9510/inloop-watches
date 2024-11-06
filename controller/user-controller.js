const mongoose = require('mongoose')

const UserModel = require("../model/userSchema");
const ProductModel = require("../model/productSchema");
const Wallet = require('../model/walletSchema')
const bcrypt = require("bcrypt");
const easyinvoice = require('easyinvoice');
const uuidv4 = require('uuid').v4;
require("dotenv").config();

const {
  sentOtp
} = require("../config/nodeMailer");
const categoryModel = require("../model/categorySchema");
const addressModel = require('../model/addressSchema')
const OrderModel = require('../model/orderSchema')
const Referral = require('../model/referralSchema');
const wishlistModel = require('../model/whishlistSchema')

const {
  transporter
} = require('../config/nodeMailer')

let expire;

function otpNull(req, res, next) {
  expire = setTimeout(() => {
    req.session.otp = null;
  }, 1000 * 60 * 3);
}

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10); // Add await here
    return passwordHash;
  } catch (error) {
    console.log(error.message);
  }
};

let home = async (req, res) => {
  try {
    

    let products = await ProductModel.find({}).limit(4);
    let latestProducts = await ProductModel.find({}).sort({createdAt: -1}).limit(10);
    let item = await ProductModel.find();
    const category = await categoryModel.find({});

    const searchQuery = req.query.search || '';

    let query = {
      isFeatured: true,
      $or: [{
          productName: {
            $regex: searchQuery,
            $options: 'i'
          }
        },
        {
          brand: {
            $regex: searchQuery,
            $options: 'i'
          }
        },
      ],
    };


    let wishlistCount = 0;
    let cartItemCount = 0;

    if (req.session.email) {
      let userData = await UserModel.findOne({email: req.session.email})

      if (!userData.isBlocked) {
        let wishlist = await wishlistModel.findOne({
          user: userData._id
        });
        if (wishlist) {
          wishlistCount = wishlist.product.length;
        }

        let cart = await cartModel.findOne({
          owner: userData._id
        });
        if (cart) {
          cartItemCount = cart.items.length;
        }
        res.render("home", {
          item,
          products,
          latestProducts,
          category,
          userEmail: userData.email,
          wishlistCount: wishlistCount,
          cartItemCount: cartItemCount,
          searchQuery: searchQuery,
        });
      } else {
        req.session.isBlocked = true;
        return res.redirect('/login');
      }
    } else {
      res.render("home", {
        item,
        products,
        latestProducts,
        category,
        userEmail: null,
        wishlistCount: wishlistCount,
        cartItemCount: cartItemCount,
        searchQuery: searchQuery,
      })
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: "Internal Server Error",

    });

  }
};


//login get router
const loginpage = async (req, res) => {
  try {
    let data = {
      email: "",
      password: "",
    };

    if (req.session.data) {
      data = req.session.data;
    }

    if (req.session.isBlocked) {
      req.session.user = false;
      req.session.isBlocked = false;
      const errorMessage = "Sorry user blocked";
      res.render("user-login", {
        err: errorMessage,
        data,
      });
    } else if (req.session.passwordIncorrect) {
      req.session.passwordIncorrect = false;
      const errorMessage = "Incorrect Password";
      res.render("user-login", {
        err: errorMessage,
        data,
      });
    } else if (req.session.noUser) {
      req.session.noUser = false;
      const errorMessage = "Incorrect email or password";
      res.render("user-login", {
        err: errorMessage,
        data,
      });
    }
    // else if (req.session.user) {
    //   res.redirect("/");
    // } 
    else {
      res.render("user-login", {
        err: "",
        data,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json("Internal Server Error");
  }
};



// login post
const loginpost = async (req, res) => {
  try {
    const userData = await UserModel.findOne({
      email: req.body.email,
    });

    req.session.data = {};

    if (userData) {
      const isPassWordValid = await bcrypt.compare(
        req.body.password,
        userData.password
      );

      if (isPassWordValid) {
        if (userData.isBlocked) {
          req.session.isBlocked = true;
          req.session.data = req.body;
          res.redirect("/login");
        } else {
          // req.session.data = req.body
          req.session.userDetails = {
            userId: userData._id,
            email: req.body.email,
          };
          req.session.email = req.body.email;
          req.session.userId = userData._id
          res.redirect("/");
        }
      } else {
        // Password does not match
        req.session.passwordIncorrect = true;
        req.session.data = req.body;
        res.redirect("/login");
      }
    } else {
      // User not found
      req.session.noUser = true;
      req.session.data = req.body;
      res.redirect("/login");
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json("Internal Server error");
  }
};

//sinup get
let signuppage = (req, res) => {
  let data = {
    fullname: "",
    username: "",
    email: "",
    phone: "",
    password: "",
  };

  if (req.session.data) {
    data = req.session.data;

    res.render("user-signup", {
      error: req.flash("error"),
      data,
    });
  } else {
    res.render("user-signup", {
      error: req.flash("error"),
      data,
    });
  }
};

// signupPage post
const postRegister = async (req, res, next) => {
  try {
    let {
      fullname,
      email,
      password,
      phone,
      username
    } = req.body;


    req.session.data = {};

    // Check if either the email or phone number is already registered
    const existingUser = await UserModel.findOne({
      $or: [{
          email: email,
        },
        {
          phone: phone,
        },
      ],
    });

    if (existingUser) {
      if (existingUser.email === email && existingUser.phone == phone) {
        req.flash("error", "Email and phone number is already registered");
      } else if (existingUser.email === email) {
        req.flash("error", "Email is already registered");
      }
      //req.body in string so have to convert existing data to string
      //  else if(existingUser.phone+"" === phone+"") {
      else if (existingUser.phone == phone) {
        req.flash("error", "Phone number is already registered");
      }

      req.session.data = req.body;
      return res.redirect("/signup");
    } else {
      let passwordHash = await securePassword(password);
      let user = {
        fullname: fullname,
        email: email,
        password: passwordHash,
        username: username,
        phone: phone,
      };
      console.log(fullname, email, phone, username)
      req.session.userDetails = user;
      req.session.emailSignup = email;
      req.session.otp = sentOtp(email);
      otpNull(req, res, next);
      res.redirect("/otp");
    }
  } catch (e) {
    console.error(e);
    res.redirect("/signup");
  }
};

let postVerifyOtp = async (req, res, next) => {
  let {
    otp
  } = req.body;
  try {
    if (req.session.otp != null) {
      if (!isNaN(otp)) {
        if (otp === req.session.otp) {

          //new user datas submiting to database
          const newUser = new UserModel(req.session.userDetails);

          // await UserModel.insertMany([req.session.userDetails]);
          // req.session.user = req.session.userDetails.email;


          const newReferrer = new Referral({
            referralId: uuidv4(),
            referralLink: uuidv4(),
            userId: newUser._id,
          });

          newReferrer.save()
          console.log(newReferrer)

          newUser.refId = newReferrer._id;
          await newUser.save();


          // Create a new wallet for the user
          const newWallet = new Wallet({
            user: newUser._id
          });
          await newWallet.save();

          // Update the user document with the reference to the wallet
          newUser.wallet = newWallet._id;
          await newUser.save();

          if (req.session.reflink) {
            try {
              const referrer = await Referral.aggregate([{
                  $match: {
                    referralLink: req.session.reflink,
                  },
                },
                {
                  $lookup: {
                    from: 'users', // Make sure to use the actual name of your User collection
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user',
                  },
                },
                {
                  $unwind: '$user',
                },
                {
                  $lookup: {
                    from: 'wallets', // Make sure to use the actual name of your Wallet collection
                    localField: 'user.wallet',
                    foreignField: '_id',
                    as: 'wallet',
                  },
                },
                {
                  $unwind: '$wallet',
                },
                {
                  $project: {
                    userId: '$user._id',
                    wallet: '$wallet',
                  },
                },
              ]);

              console.log(referrer,"refferer");

              if (referrer.length > 0) {
                const referralAmount = 500; // Change this to the desired referral amount
                const referralBonus = referralAmount * 0.5;

                referrer[0].wallet.balance += referralBonus;
                referrer[0].wallet.transactions.push({
                  amount: referralAmount,
                  type: 'credit',
                  description: 'Referral Bonus',
                });

                await Wallet.findByIdAndUpdate(referrer[0].wallet._id, referrer[0].wallet);

                newWallet.balance += referralBonus;
                newWallet.transactions.push({
                  amount: referralBonus,
                  type: 'credit',
                  description: 'Referral Bonus',
                });
                newWallet.save();
              }
            } catch (err) {
              console.error('Error finding referral:', err);
              res.status(500).json({
                success: false,
                message: err
              });
            }
          }



          console.log(newUser)
          req.session.user = req.session.userDetails.email;
          res.redirect("/login");
        } else {
          req.session.otpFalse = true;
          res.redirect("/otp");
        }
      }
    } else {
      req.session.otpExpired = true;
      res.redirect("/otp");
    }
  } catch (e) {
    error(e);
    res.status(500).json({
      message: 'Internal Server error'
    })
  }
};




let loadOTP = async (req, res) => {
  try {
    if (req.session.otpExpired) {
      req.session.otpExpired = false;
      res.render("otp", {
        err: "Otp Expired",
      });
    } else if (req.session.otpFalse) {
      req.session.otpFalse = false;
      res.render("otp", {
        err: "Incorrect Otp",
      });
    } else {
      res.render("otp", {
        err: "",
      });
    }
  } catch (error) {
    console.log(error.message);
  }
};


let resendOtp = async (req, res) => {
  clearInterval(expire);
  req.session.otp = sentOtp(req.session.emailSignup);
  otpNull(req, res);
  res.status(200).json({
    status: true
  });
};



const userShop = async (req, res) => {
  try {
    if(!req.session.email || !req.session.userId || !req.session.data){
      return res.redirect('/login')
    }

    const perPage = 6; 
    const page = parseInt(req.query.page) || 1; 
    const sortOption = req.query.sort || 'featured'; 
    const selectedCategory = req.query.category || null;
    const searchQuery = req.query.search || '';
    const id = req.params.productId;

    let query = {
      isFeatured: true,
      $or: [{
          productName: {
            $regex: searchQuery,
            $options: 'i'
          }
        },
        {
          brand: {
            $regex: searchQuery,
            $options: 'i'
          }
        },
      ],
    };


    let sortCriteria = {};
    if (sortOption === 'lowToHigh') {
      sortCriteria = {
        afterDiscount: 1
      };
    } else if (sortOption === 'highToLow') {
      sortCriteria = {
        afterDiscount: -1
      };
    } else if (sortOption === 'releaseDate') {
      sortCriteria = {
        createdAt: -1
      }; // or any other field for release date
    } else if (sortOption === 'avgRating') {
      sortCriteria = {
        rating: -1
      }; // or any other field for average rating
    } else {
      // Default to 'featured' or any other default sorting option
      sortCriteria = {
        createdAt: -1
      }; // Default sorting
    }


    let productInWishlist;
    const userId = req.session.userId
    let wishlistCount = 0;
    const wishlist = await wishlistModel.findOne({
      user: userId
    });

    if (wishlist && wishlist.product.includes(id)) {
      // The product is in the user's wishlist
      productInWishlist = true;
    } else {
      // The product is not in the user's wishlist
      productInWishlist = false;
    }

    if (wishlist) {
      wishlistCount = wishlist.product.length;
    }

    let cartItemCount = 0;
    const cart = await cartModel.findOne({
      owner: userId
    });
    if (cart) {
      cartItemCount = cart.items.length;
    }

    if (selectedCategory && mongoose.Types.ObjectId.isValid(selectedCategory)) {
      query.category = new mongoose.Types.ObjectId(selectedCategory);
    }
    
    let products = await ProductModel.find(query)
      // .populate("category", "name")
      .populate({
        path: "category",
        select: "name",
        match: {
          _id: new mongoose.Types.ObjectId(selectedCategory)
        }, // Add this match condition
      })
      .sort(sortCriteria)
      .skip(perPage * (page - 1))
      .limit(perPage);

    // Reset filterProduct when the page changes
    if (!req.query.category && page > 1) {
      req.session.filterProduct = null;
    }


    // const totalProducts = await ProductModel.countDocuments({isFeatured: true});
    const totalProducts = await ProductModel.countDocuments(query);


    // Retrieve products based on the latest update timestamp
    // const latestProducts = await ProductModel.find({
    //     isFeatured: true
    //   })
    const latestProducts = await ProductModel.find({
        isFeatured: true
      })
      .populate("category", "name")
      .sort({
        createdAt: -1
      }) // Sort by the most recent updates
      .limit(3); // Retrieve the latest 3 products

    const category = await categoryModel.find();


    // Calculate the total number of pages
    const totalPages = Math.ceil(totalProducts / perPage);

    // if (req.session.filterProduct) {
    //   products = req.session.filterProduct
    // }

    res.render("user-shop", {
      products,
      newProducts: latestProducts,
      category,
      currentPage: page,
      totalPages,
      sortOption,
      selectedCategory: selectedCategory,
      searchQuery: searchQuery,
      productInWishlist,
      wishlistCount,
      cartItemCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Some error caused while rendering shop page",
    });
  }
};


const productDetails = async (req, res) => {
    
  console.log("product details inside page")

  try {
    if(!req.session.email || !req.session.userId || !req.session.data){
      return res.redirect('/login')
    }
    console.log("product details page")
    const id = req.params.productId;

    const product = await ProductModel.findById(id);
    const category = await categoryModel.find({});
    if (!product) {
      // Handle the case where the product with the specified id is not found
      return res.status(404).json({
        message: "No such product found",
      });
    }


    const userId = req.session.userId

    let wishlistCount = 0;
    const wishlist = await wishlistModel.findOne({
      user: userId
    });
    if (wishlist) {
      wishlistCount = wishlist.product.length;
    }

    // Fetch the user's cart and get the item count
    let cartItemCount = 0;
    const cart = await cartModel.findOne({
      owner: userId
    });
    if (cart) {
      cartItemCount = cart.items.length;
    }

    let productInWishlist;
    if (wishlist && wishlist.product.includes(id)) {
      // The product is in the user's wishlist
      productInWishlist = true;
    } else {
      // The product is not in the user's wishlist
      productInWishlist = false;
    }


    // Render a template to display the product details
    res.render("usernew-productdetails", {
      product,
      category,
      productInWishlist,
      wishlistCount,
      cartItemCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal Server Error",
      errorMessage: error.message,
    });
  }
};



let logout = (req, res) => {
  console.log("logout")
  req.session.email = false;
  req.session.userId = false;
  req.session.data = false;
  return res.redirect("/login");
};


//profile 
const userProfile = async (req, res) => {
  
  const ITEMS_PER_PAGE = 5;
  try {
    if(!req.session.email || !req.session.userId || !req.session.data){
      return res.redirect('/login')
    }
    // let user = (req.session.userId) ? true : false
    // Check if user details are in the session
    if (!req.session.userDetails || !req.session.userDetails.userId) {
      return res.status(200).redirect('/login');
    }

    const userId = req.session.userDetails.userId;

    const category = await categoryModel.find({
      status: 'active'
    });
    const addresses = await addressModel.findOne({
      user: userId
    })
    // const userDetails = await UserModel.findOne({
    //   _id: (req.session.userId)
    // })
    console.log(userId, "profile userID");

    let [userDetails] = await UserModel.aggregate([{
        $match: {
          _id: new mongoose.Types.ObjectId(userId), // Assuming userId is accessible
        },
      }, {
        $lookup: {
          from: "wallets",
          localField: "wallet",
          foreignField: "_id",
          as: 'walletDetails'
        }
      },
      {
        $limit: 1
      }
    ])
    // let userDetails = await UserModel.findOne({ _id: userId })
    // .populate({
    //   path: 'wallet',
    //   model: 'Wallet',
    // })
    // .exec();
    console.log(userDetails)


    // Pagination logic
    const page = parseInt(req.query.page) || 1; // Get the page number from the query parameter
    const totalOrders = await OrderModel.countDocuments({
      user: userId
    });
    const totalPages = Math.ceil(totalOrders / ITEMS_PER_PAGE);
    const skip = (page - 1) * ITEMS_PER_PAGE;

    const loggedUser = await Referral.findOne({
      userId: req.session.userId
    })
    console.log(loggedUser)

    const generatedRefLink = `${req.protocol}://${req.headers.host}/signup?reflink=${loggedUser.referralLink}`
    console.log(generatedRefLink)

    const orderDetails = await OrderModel.find({
        user: userId
      })
      .sort({
        createdAt: -1
      })
      .skip(skip)
      .limit(ITEMS_PER_PAGE);

    let wishlistCount = 0;
    const wishlist = await wishlistModel.findOne({
      user: userId
    });
    if (wishlist) {
      wishlistCount = wishlist.product.length;
    }

    // Fetch the user's cart and get the item count
    let cartItemCount = 0;
    const cart = await cartModel.findOne({
      owner: userId
    });
    if (cart) {
      cartItemCount = cart.items.length;
    }

    if (!userId) {
      res.status(200).redirect('/login')
    } else {
      res.status(200).render('user-profile', {
        category,
        user: true,
        addresses,
        userDetails,
        orderDetails,
        currentPage: page,
        totalPages: totalPages,
        generatedRefLink,
        wishlistCount,
        cartItemCount
      })
    }


  } catch (err) {
    console.log(err);
    res.status(500).render('500error', {
      message: 'Internal server error' + err
    })
  }
}

const userAddAddress = async (req, res) => {
  try {
    if(!req.session.email || !req.session.userId || !req.session.data){
      return res.redirect('/login')
    }
    // Get the address data from the request body
    // console.log("vannu in address")
    const {
      addressType,
      houseNo,
      street,
      landmark,
      pincode,
      city,
      district,
      state,
      country
    } = req.body;

    const userId = req.session.userId; // You can get the user's ID from the cookie or authentication system

    // Check if the user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find the user's address document
    let useraddresses = await addressModel.findOne({
      user: userId
    });

    if (!useraddresses) {
      // If the useraddresses document doesn't exist, create a new one
      useraddresses = new addressModel({
        user: userId,
        addresses: []
      });
    }

    // Check if the address already exists for the user
    const existingAddress = useraddresses.addresses.find((address) =>
      address.addressType === addressType &&
      address.HouseNo === houseNo &&
      address.Street === street &&
      address.pincode === pincode &&
      address.city === city &&
      address.State === state &&
      address.Country === country
    );

    if (existingAddress) {
      return res.status(400).json({
        success: false,
        message: 'Address already exists for this user'
      });
    }

    if (useraddresses.addresses.length >= 3) {
      return res.status(400).json({
        success: false,
        message: 'User cannot have more than 3 addresses',
      });
    }

    // Create a new address object
    const newAddress = {
      addressType: addressType,
      HouseNo: houseNo,
      Street: street,
      Landmark: landmark,
      pincode: pincode,
      city: city,
      district: district,
      State: state,
      Country: country,
    };

    useraddresses.addresses.push(newAddress);

    // Save the updated address document
    await useraddresses.save();

    // Respond with a success message
    res.status(200).json({
      status: true
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      // Handle validation errors
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: err.errors
      });
    } else {
      console.log(err);
      res.status(500).render('500error', {
        success: false,
        message: 'Internal Server Error'
      });
    }
  }
};

const userEditAddress = async (req, res) => {
  try {
    if(!req.session.email || !req.session.userId || !req.session.data){
      return res.redirect('/login')
    }
    const {
      addressType,
      HouseNo,
      Street,
      Landmark,
      pincode,
      city,
      district,
      state,
      Country
    } = req.body;

    const userId = req.session.userId;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const addresses = await addressModel.findOne({
      user: userId
    })

    if (!addresses) {
      return res.status(404).json({
        success: false,
        message: 'Addresses not found'
      });
    }

    // Find the address you want to edit based on the provided address type
    const addressToEdit = addresses.addresses.find(addr => addr.addressType === addressType);

    if (!addressToEdit) {
      return res.status(404).json({
        success: false,
        message: `Address with type '${addressType}' not found`
      });
    }

    // Update the address details
    addressToEdit.HouseNo = HouseNo;
    addressToEdit.Street = Street;
    addressToEdit.Landmark = Landmark;
    addressToEdit.pincode = pincode;
    addressToEdit.city = city;
    addressToEdit.district = district;
    addressToEdit.State = state;
    addressToEdit.Country = Country;

    // Save the updated address
    await addresses.save();

    res.status(200).redirect('/checkout');

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

const userdeleteAddress = async (req, res) => {
  try {
    if(!req.session.email || !req.session.userId || !req.session.data){
      return res.redirect('/login')
    }
    const userId = req.session.userId;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const addresses = await addressModel.findOne({
      user: userId
    })

    if (!addresses) {
      return res.status(404).json({
        success: false,
        message: 'Addresses not found'
      });
    }

    const addressTypeToDelete = req.query.addressType; // Get the addressType to delete from the query parameter
    // Find the index of the address with the provided addressType
    const addressIndexToDelete = addresses.addresses.findIndex((address) => address.addressType === addressTypeToDelete);

    if (addressIndexToDelete === -1) {
      return res.status(404).json({
        success: false,
        message: `Address with type '${addressTypeToDelete}' not found`
      });
    }
    // Remove the address with the specified addressType
    addresses.addresses.splice(addressIndexToDelete, 1);

    await addresses.save();

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (err) {
    next(err);
  }
}



const crypto = require('crypto');
const cartModel = require('../model/cartSchema');


const changePassword = async (req, res) => {
  try {

    let user = (req.session.userId) ? true : false

    const userId = req.session.userId
    console.log(userId);
    const userDetails = await UserModel.findOne({
      _id: userId
    });
    if (!userDetails) {
      return res.status(404).json({
        message: 'User is not found'
      });
    }
    const email = userDetails.email;
    console.log(email)
    const token = crypto.randomBytes(32).toString('hex');
    req.session.token = token
    setTimeout(() => {
      console.log("expire =+ = +  iiii");
      req.session.token = null
    }, 1000 * 60 * 15)
    console.log(token)
    // const updatedUser = await UserModel.findByIdAndUpdate(
    //   userId,
    //   {
    //     $set: {
    //       resetToken: token,
    //       resetTokenExpiration: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes in milliseconds
    //     },
    //   },{
    //     upsert:true
    //   }
    // );

    // if (!updatedUser) {
    //   return res.status(500).json({ message: 'Failed to update user data' });
    // }

    const mailOptions = {
      to: email,
      subject: 'Password Reset Request',
      text: `Click the following link to reset your password: ${req.protocol}://${req.headers.host}/reset-password/${token}`,
      html: `<p>Click the following link to reset your password:</p><p><a href=${req.protocol}://${req.headers.host}/reset-password/${token}>http://localhost:7000/reset-password/${token}</a></h5>`,
    };
    await transporter.sendMail(mailOptions);

    return res.status(201).json({
      message: 'Reset password link is sent successfully'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: `INTERNAL SERVER ERROR ${err}`
    });
  }
}






// cancel order 

const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const {
      reason
    } = req.body

    // Check if the order exists
    const order = await OrderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found"
      });
    }

    // Retrieve the products associated with the canceled order
    const canceledProducts = order.items;

    console.log(canceledProducts)
    // Increase stock counts for each canceled product
    for (const product of canceledProducts) {
      const productId = product.productId;
      const quantity = product.quantity;

      // Find the product in your database
      const productToUpdate = await ProductModel.findById(productId);

      if (!productToUpdate) {
        return res.status(404).json({
          success: false,
          error: "Product not found for restocking",
        });
      }

      // Increase the stock count
      productToUpdate.countInStock += quantity;

      // Save the updated product
      await productToUpdate.save();
    }

    if (order.paymentMethod === 'cashOnDelivery') {
      order.status = "Canceled";
      order.requests.push({
        type: 'Cancel',
        status: 'Accepted',
        reason,
      });
      await order.save();
    } else {
      // Add the cancel request
      order.status = 'Canceled'
      order.requests.push({
        type: 'Cancel',
        status: 'Pending',
        reason,
      });
      await order.save();
    }
    return res.json({
      success: true,
      message: "Order canceled successfully"
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};



const downloadInvoice = async (req, res) => {
  try {
    // if (req.query.from === '$2b$10$gviVtGpDfqpsAsCkbx8xaukeIQDirbAk2vIJ0IhJROGzYHeHUERp2') {

    let order = await OrderModel.findById(req.params.orderId)
    let user = await UserModel.findById(order.user)

    console.log("innn")
    console.log(order, order ?.items);
    let products = order.items.map((item, index) => {
      return {
        "quantity": item.quantity,
        "price": item.productPrice,
        "tax-rate": 0.0,
        "description": item.name,
      }
    });


    var data = {
      "customize": {},
      "images": {
        "logo": "https://public.easyinvoice.cloud/img/logo_en_original.png",
        // "background": "https://public.easyinvoice.cloud/img/watermark-draft.jpg"
      },
      "sender": {
        "company": "InLoop Watches",
        "address": "Inloop watches",
        "zip": "680502",
        "city": "Thrissur",
        "country": "INDIA"
      },
      "client": {
        "company": user ?.fullname || "N/A",
        "address": user.email,
        "city": order.deliveryAddress.city,
        "zip": "PIN :" + order.deliveryAddress.pincode,
        "phone": user.phone,
        "country": order.deliveryAddress.Country,
      },
      "information": {
        "number": user.phone,
        "date": order.orderDate,
        "due-date": "PAID"
      },
      "products": products,
      "bottom-notice": "Thank you for supporting us, Inloop Watches",
      "settings": {
        "currency": "INR",
      },
      "translate": {},
    };
    easyinvoice.createInvoice(data, function (result) {
      const base64Data = result.pdf;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="INVOICE_' + Date.now() + '_.pdf"');
      const binaryData = Buffer.from(base64Data, 'base64');
      res.send(binaryData);
    });
    // } 
    // else {
    //     res.redirect('/profile')
    // }

  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating the PDF');
  }

}

//order detailed view

const userOrderDetails = async (req, res) => {
  try {
    
    const orderId = req.params.orderId;
    console.log(orderId)
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(404).json({
        success: false,
        message: 'It is not an Valid Id'
      });
    }
    // Implement logic to delete the order by its ID from the database
    // You should also add error handling as needed
    const order = await OrderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order Not found in Database'
      })
    }

    const orders = await OrderModel.findOne({
      _id: orderId
    }).sort({
      createdAt: -1
    }).populate('user', 'name').exec();
    const userId = orders.user;
    const userDetail = await UserModel.findOne({
      _id: userId
    })
    console.log(userDetail)
    const category = await categoryModel.find({})
    res.render('user-order-detailed-view', {
      pagetitle: '',
      order: orders,
      userDetail,
      user: '',
      category
    });

  } catch (error) {
    console.log(err);
    res.status(500).send('Error deleting the order');
  }
}

// change password 


const resetPasswordGet = async (req, res) => {
  try {
    // let user = (req.session.email._id)?true:false

    const Token = req.params.tokenId;
    console.log(Token, req.session ?.token !== null);
    if (req.session ?.token !== null) {

      return res.render('user-change-new-password', {
        Token
      })

    } else {
      console.log("null aanu tot.");
    }

    //   if(!Token){
    //     return  res.status(404).json({message:'token not found'});
    //   }
    //   const User = await UserModel.findOne({
    //     email:req.session.email
    // })
    // if(!User){
    //   return res.status(404).render('errorHandler')

    // }
    // console.log(User?.resetTokenExpiration,User?.resetTokenExpiration > new Date());
    // if (User.resetTokenExpiration && User.resetTokenExpiration > new Date()) {
    //   // The token is still valid
    //   // Perform your reset password logic
    //   // const category = await Category.find({status:'active'});
    // //  return res.render('userSetNewPassword',{user, Token})
    // return res.render('user-change-new-password',{Token})
    // } else {
    //   // The token has expired
    //   // Handle the case where the token has expired
    //  return res.status(410).json({message:'The token is expired'})
    // }

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Error Occured' + error
    })
  }
}


const resetPasswordPost = async (req, res) => {
  try {
    console.log(req.body);
    const token = req.body.token;
    const password = req.body.newPassword;
    const confirm_password = req.body.confirmnewPassword;
    if (password !== confirm_password) {
      return res.status(400).json({
        message: 'The confirm password and  password must be same'
      })
    }
    const user = await UserModel.findOne({
      email: req.body.Email
    });
    console.log(user)
    // if(!user){
    //   return res.status(404).render('errorHandler')

    // }
    user.password = password;
    // user.resetToken = null; // Optionally, clear the reset token
    // user.resetTokenExpiration = null;
    await user.save();
    // return res.status(200).json({status:true,message: 'Password reset successful' });
    return res.status(200).json({
      success: true,
      message: 'Sucesfully Password Changed'
    })
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Error saving the new password'
    });
  }

}




const wishlistGet = async (req, res) => {
  try {

    if(!req.session.email || !req.session.userId || !req.session.data){
      return res.redirect('/login')
    }

    // const perPage = 6; // Define how many products you want per page
    // const page = parseInt(req.query.page) || 1; // Get the page number from the request query parameters


    const userId = req.session.userId;
    const category = await categoryModel.find();

    let wishlistCount = 0;
    const wishlist = await wishlistModel.findOne({
      user: userId
    });
    if (wishlist) {
      wishlistCount = wishlist.product.length;
    }

    // Fetch the user's cart and get the item count
    let cartItemCount = 0;
    const cart = await cartModel.findOne({
      owner: userId
    });
    if (cart) {
      cartItemCount = cart.items.length;
    }



    const totalWishlistItems = await wishlistModel.aggregate([{
        $match: {
          user: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $project: {
          numberOfWishlistItems: {
            $size: '$product'
          },
        },
      },
    ]);

    // Extract the count from the result
    const countResult = totalWishlistItems[0];
    const numberOfItemsInWishlist = countResult ? countResult.numberOfWishlistItems : 0;

    console.log(totalWishlistItems, "wishlist items");
    //  const totalPages = Math.ceil(numberOfItemsInWishlist / perPage);
    //  console.log(totalPages)

    // Calculate the starting index for pagination
    //  const startIndex = (page - 1) * perPage;

    const Products = await wishlistModel.aggregate([{
        $match: {
          user: new mongoose.Types.ObjectId(userId),
        },
      },

      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "items"
        }
      },
      {
        $unwind: "$items"
      },
      {
        $lookup: {
          from: 'categories', // Update to your actual category collection name
          localField: 'items.category',
          foreignField: '_id',
          as: 'category',
        },
      },
      {
        $unwind: '$category',
      },
      {
        $project: {
          _id: 1,
          "productId": "$items._id",
          "productName": "$items.productName",
          "afterDiscount": "$items.afterDiscount",
          "description": "$items.description",
          "image": "$items.image",
          "categoryName": "$category.name",
          "quantity": "$items.countInStock",
          "brand": "$items.brand",
          "price": "$items.price",
          "discountPrice": "$items.discountPrice",
          "rating": "$item.rating"


        }
      }
    ])
    //  .skip(startIndex)
    //  .limit(perPage);

    console.log(Products, "products")

    //  const paginationInfo = {
    //    totalPages,
    //    currentPage: page,
    //  };


    return res.render("user-wishlist", {
      category,
      Products,
      wishlistCount,
      cartItemCount,
      // numberOfItemsInWishlist 
      // UserExist:UserExist,
      // paginationInfo
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: err
    });
  }
};



const wishlistAdd = async (req, res) => {
  try {
    if(!req.session.email || !req.session.userId || !req.session.data){
      return res.redirect('/login')
    }
    
    const productId = req.params.productId;
    const userId = req.session.userId;

    // Find the product by its ID
    console.log(productId, "productId wishlist")
    const product = await ProductModel.findOne({
      _id: productId
    });


    if (!product) {
      return res.status(404).json({
        message: 'The Product is Not Found'
      });
    }

    // Check if the product is already in the user's wishlist
    console.log(userId, "userId wishlist")
    const wishlist = await wishlistModel.findOne({
      user: userId
    });

    if (!wishlist) {
      // If the wishlist doesn't exist for the user, create a new one
      const newWishlist = new wishlistModel({
        user: userId,
        product: [productId],
      });
      await newWishlist.save();
      res.status(200).json({
        message: 'Product added to wishlist successfully'
      });
    } else {
      // Check if the product is already in the wishlist
      const productIndex = wishlist.product.indexOf(productId);

      if (productIndex !== -1) {
        // If the product is in the wishlist, remove it
        wishlist.product.splice(productIndex, 1);
        await wishlist.save();
        res.status(200).json({
          message: 'Product removed from wishlist successfully'
        });
      } else {
        // If the product is not in the wishlist, add it
        wishlist.product.push(productId);
        await wishlist.save();
        res.status(200).json({
          message: 'Product added to wishlist successfully'
        });
      }
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: 'Internal Server Error'
    });
  }
};


const wishlistItemDelete = async (req, res) => {
  try {
    const productId = req.params.productId; // The product ID to remove from the wishlist
    const userId = req.session.userId; // The user ID
    console.log("wislist Delete")
    // Find the user's wishlist
    const wishlist = await wishlistModel.findOne({
      user: userId
    });
    console.log(wishlist)
    if (!wishlist) {
      console.log("not Wishlais")
      return res.status(404).json({
        message: 'Wishlist not found'
      });
    }

    // Check if the product exists in the wishlist
    const productIndex = wishlist.product.indexOf(productId);

    if (productIndex === -1) {
      return res.status(404).json({
        message: 'Product not found in the wishlist'
      });
    }

    // Remove the product from the wishlist
    wishlist.product.splice(productIndex, 1);

    // Save the updated wishlist
    await wishlist.save();

    res.status(200).json({
      message: 'Product removed from wishlist successfully'
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: 'Internal Server Error'
    });
  }
};


const wishlistToCart = async (req, res) => {
  try {
    if(!req.session.email || !req.session.userId || !req.session.data){
      return res.redirect('/login')
    }

    console.log("move to cart")
    const userId = req.session.userId; // Assuming you have the user ID available

    // Get the product ID you want to move from the request
    const productId = req.params.productId.toString(); // Adjust this based on your route

    // Retrieve the product details from the wishlist
    console.log(productId, "productId");
    const wishlistItem = await wishlistModel.findOne({
      user: userId,
      product: {
        $in: [productId]
      }
    });

    console.log('Wishlist Item:', wishlistItem);

    if (!wishlistItem) {
      console.log("Product not found in the wishlist")
      return res.status(404).json({
        message: 'Product not found in the wishlist'
      });
    }

    // Check if the product is available in your product collection
    const product = await ProductModel.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    if (product.quantity === 0) {
      return res.status(400).json({
        message: 'Product is out of stock'
      });
    }

    // Create or retrieve the user's cart
    let cart = await cartModel.findOne({
      owner: userId
    });
    const cartItem = cart.items.find((item) => item.productId.toString() === productId.toString());



    let outOfStock = false;
    let stock = product.countInStock;
    console.log('Cart Item:', cart.items);
    console.log('Quantity:', cartItem ? cartItem.quantity : 'N/A');
    console.log('Stock:', stock);
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

    // Update the cart's bill total
    cart.billTotal = cart.items.reduce((total, item) => total + item.price, 0);

    // Save the cart
    await cart.save();

    // Remove the product from the wishlist
    await wishlistModel.updateOne({
      user: userId
    }, {
      $pull: {
        product: productId
      }
    });
    console.log('Product removed from wishlist');

    return res.status(200).json({
      message: 'Product moved from wishlist to cart successfully'
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Internal Server Error'
    });
  }
};



const createuserReferral = async (req, res) => {
  try {
    if(!req.session.email || !req.session.userId || !req.session.data){
      return res.redirect('/login')
    }
    const user = await UserModel.findById(req.session.userId);

    // Create a new referral
    const newReferrer = new Referral({
      referralId: uuidv4(),
      referralLink: uuidv4(),
      userId: user._id,
    });

    // Save the new referral to the database
    await newReferrer.save();

    // Update the user's refId with the new referral's _id
    user.refId = newReferrer._id;

    // Save the user with the updated refId
    await user.save();

    console.log(newReferrer);

    // Assuming generatedRefLink should be the referral link
    const generatedRefLink = `${req.protocol}://${req.headers.host}/register?reflink=${newReferrer.referralLink}`
    res.status(200).json({
      success: true,
      referralLink: generatedRefLink
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: err
    });
  }
};


const contactUsGet = async(req,res) =>{
  try{
    if(!req.session.email || !req.session.userId || !req.session.data){
      return res.redirect('/login')
    }
    let wishlistCount = 0;
    let cartItemCount = 0;

    if (req.session.email) {
      let userData = await UserModel.findOne({email: req.session.email})

      if (!userData.isBlocked) {
        let wishlist = await wishlistModel.findOne({
          user: userData._id
        });
        if (wishlist) {
          wishlistCount = wishlist.product.length;
        }

        let cart = await cartModel.findOne({
          owner: userData._id
        });
        if (cart) {
          cartItemCount = cart.items.length;
        }
        res.render("contact", {
          userEmail: userData.email,
          wishlistCount: wishlistCount,
          cartItemCount: cartItemCount,

        });
      } else {
        req.session.isBlocked = true;
        return res.redirect('/login');
      }
    } else {
      res.render("contact", {
        userEmail: null,
        wishlistCount: wishlistCount,
        cartItemCount: cartItemCount,

      })
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: "Internal Server Error",

    });

  }
}


const userContactPost = async(req, res) => {
  try{
    if(!req.session.email || !req.session.userId || !req.session.data){
      return res.redirect('/login')
    }
  const { name, email, telephone, subject, message } = req.body;

  

  // Setup email data
  const mailOptions = {
    from: process.env.EMAIL,
    to: process.env.EMAIL, // Change to your receiving email
    subject: subject,
    text: `Name: ${name}\nEmail: ${email}\nPhone: ${telephone}\n\nMessage: ${message}`,
  };

  // Send email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      res.status(500).json({message:'Internal Server Error'});
    } else {
      console.log('Email sent: ' + info.response);
      res.status(200).send('OK');
    }
  });
  }catch(err){
    res.status(500).json({message:err})
  }
}




module.exports = {
  securePassword,

  home,
  loginpage,
  loginpost,


  signuppage,
  postRegister,

  loadOTP,
  postVerifyOtp,
  resendOtp,

  logout,

  userShop,
  // productSort,
  // productPriceHighToLow,
  // productPriceLowToHigh,
  // productCategoryFilter,
  productDetails,

  // userCart,

  userProfile,
  userAddAddress,
  userEditAddress,
  userdeleteAddress,
  changePassword,
  downloadInvoice,

  cancelOrder,
  userOrderDetails,

  resetPasswordGet,
  resetPasswordPost,


  wishlistGet,
  wishlistAdd,
  wishlistItemDelete,
  wishlistToCart,

  createuserReferral,

  contactUsGet,
  userContactPost

};