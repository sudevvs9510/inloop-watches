const express = require('express')
const router = express.Router()
const user = require('../controller/user-controller')
const cart = require('../controller/cart-controller')
const checkout = require('../controller/checkout-controller')
const wallet = require('../controller/walletController')
const {logSession,isAuthenticated,isLogout} =  require('../middlewares/auth')


//user home
router.get('/',user.home);


// user login/signup/logout management
router.get('/login',isLogout,user.loginpage);
router.post('/login',user.loginpost)

router.get('/signup',isLogout, user.signuppage)
router.post('/signup',user.postRegister)

router.get('/logout', user.logout)


//OTP routers
router.get('/otp', user.loadOTP)
router.post('/postotp', user.postVerifyOtp)
router.get('/resendOtp',user.resendOtp)


//product routers
router.get('/shop',logSession, user.userShop)
router.get('/productdetails/:productId',logSession, user.productDetails)

// router.get('/shop/productsort',user.productSort)

//Wallet Route
router.post('/create-razorpay-order',logSession,wallet.WalletRazorpayCreation)

router.post('/confirm-payment',logSession,wallet.WalletConfirmPayment)

router.post('/withdraw',logSession,wallet.withdrawMoney)





//cart 
router.get('/cart',logSession,cart.userCart)
router.post('/addtocart',logSession, cart.addToCart)
router.post('/update-cart-quantity',logSession, cart.cartPut)
router.post('/remove-product',logSession, cart.cartRemove)
// router.patch('/update-cart-total',logSession, cart.cartbillTotalUpdate)

//checkout
router.get('/checkout',logSession, checkout.orderCheckout)

router.post('/checkout',logSession,checkout.orderCheckoutPost)

router.get('/order-confirmation/:orderId',logSession,checkout.orderConfirmation)

router.post('/order-payment-online',logSession,checkout.razorpayVerify)

router.get('/payment-failed',logSession,checkout.razorpayFailed)

router.post('/return-order',logSession,checkout.returnOrder)


//profile routes
router.get('/profile',logSession,user.userProfile)

router.post('/profile/addAddress',logSession,user.userAddAddress)
router.post('/profile/editAddress',logSession,user.userEditAddress)

router.delete('/profile/deleteAddress',logSession,user.userdeleteAddress)

router.get('/profile/change-password',logSession,user.changePassword)
// router.post('/profile/editProfile',user.userDetailEdit)

router.get('/order-details/:orderId',logSession,user.userOrderDetails)
router.post('/cancel-order/:orderId',logSession,user.cancelOrder)

router.get('/refer',logSession,user.createuserReferral)



router.get('/order-details/downloadInvoice/:orderId',logSession,user.downloadInvoice)

// change password 

router.get('/reset-password/:tokenId',user.resetPasswordGet)
router.post('/reset-password',user.resetPasswordPost);


//whishlist

router.get('/wishlist',logSession,user.wishlistGet);
router.post('/wishlist/:productId',logSession,user.wishlistAdd)
router.post('/wishlist/remove/:productId',logSession,user.wishlistItemDelete)
router.post('/wishlist/addtocart/:productId',logSession,user.wishlistToCart)


//COUPON MANAGEMENT

router.get('/getCoupons',logSession,checkout.getCoupons);

router.get('/applyCoupon',logSession,checkout.applyCoupon)

//contact us
router.get('/contact',logSession,user.contactUsGet)
router.post('/send-message',user.userContactPost)

module.exports = router