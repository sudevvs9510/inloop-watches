const express = require('express')
const router = express.Router()

const {AdminLogSession} = require('../middlewares/auth')

const admin = require('../controller/admin-controller')
const {storage, upload} = require('../config/multerConfig')
const product = require('../controller/productController')
const Order = require('../controller/admin-orderManagement-controller')

const category = require('../controller/categoryController')
const coupons = require('../controller/couponController')



//Admin Dashboard
router.get('/',AdminLogSession,admin.dashboard)

// admin_route.get('/home',admin.loadDashboard)

router.get('/pdf',admin.downloadPdf)

router.get('/excel', admin.generateExcel)



//admin login
router.get('/login',admin.adminlogin)
router.post('/login',admin.adminloginpost)

//admin logout
router.get('/logout',admin.adminlogout)




//admin user management
router.get('/usermanagement',AdminLogSession,admin.usermanagement)
// router.post('/usermanagement',admin.usermanagementpost)
router.post('/blockUser',AdminLogSession,admin.userblock)



//admin product management
router.get('/product-management',AdminLogSession,product.productManagementGet)
router.post('/product-management/newProduct',upload.fields([{ name: 'image', maxCount: 1 }, { name: 'images' }]),product.productManagementCreate)
router.get('/product-management/getCategories',AdminLogSession,product.productCategories);
router.post('/product-management/editProduct/:Id',upload.fields([{ name: 'image', maxCount: 1 }, { name: 'images' }]),product.productManagementEdit);
router.delete('/product-management/delete-product/:productId',product.productManagementDelete);
router.post('/product-management/featuredProduct',product.productManagementPublish);
router.get('/product-management/removeimg',AdminLogSession,product.removeProductImg)
router.get('/product-search',AdminLogSession,product.productSearch)

// router.post('/products/editProduct/:Id',upload.fields([{name: 'image', maxCount:1}, {name: ' images'}]),productManagementEdit)



// admin categories 
router.get('/category-management',AdminLogSession,category.categoryManagementGet);
router.post('/category-management/newCategory',AdminLogSession, upload.single('image'),category.categoryManagementCreate)
router.post('/category-management/edit-category/:categoryId',AdminLogSession,upload.single('editImage'),category.categoryManagementEdit)
// router.delete('/category-management/delete-category/:categoryId',category.categoryManagementDelete);
router.post('/category-management/isFeatured',AdminLogSession,category.categoryManagementFeatured)


//order
router.get('/order-management',AdminLogSession,Order.OrderManagementPageGet);
router.delete('/order-management/deleteOrder/:orderId',Order.OrderDelete)
router.get('/order-management/orderDetailedView/:orderId',AdminLogSession,Order.orderDetailedView);
router.post('/order-management/update-order-status/:orderId',Order.updateOrderStatus)
router.post('/refund-amount',AdminLogSession,Order.refundAmount)



//Coupon Management

router.get('/coupon-management',AdminLogSession,coupons.couponManagementGet);
router.post('/createCoupon',AdminLogSession,coupons.couponCreate);
router.post('/coupon/update-status/:Id',AdminLogSession,coupons.couponUpdate);
router.post('/EditCoupon/:Id',AdminLogSession,coupons.couponEdit)



module.exports = router