const express = require('express');

const ProductModel = require('../model/productSchema');
const CategoryModel = require('../model/categorySchema')
const UserModel = require('../model/userSchema');
const { log } = require('console');

const productManagementGet = async (req, res) => {
    try {
        if (req.session.admin) {
            const perPage = 5; // Define how many products you want per page
            const page = parseInt(req.query.page) || 1; // Get the page number from the request query parameters

            let query = {};

            // Check if a category is selected for filtering
            const selectedCategory = req.query.category || ''; // Default to empty string if not provided
            if (selectedCategory) {
                query.category = selectedCategory;
            }

            const totalProducts = await ProductModel.countDocuments(query);

            const products = await ProductModel.find(query)
                .populate('category') // Populate the 'category' field
                .skip(perPage * (page - 1))
                .limit(perPage)
                .lean();


            const categories = await CategoryModel.find().lean();

            // Calculate the total number of pages
            const totalPages = Math.ceil(totalProducts / perPage);

            res.render('products', {
                products,
                categories,
                selectedCategory,
                currentPage: page,
                totalPages,
                pagetitle: 'Products',
                perPage
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: error.message || 'Internal Server Error'
        });
    }
};

const productCategories = async (req, res) => {
    try {
        const categories = await CategoryModel.find({}, 'name'); // Only fetch category names
        res.status(200).json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Internal Server Error'
        });
    }
}



const productManagementCreate = async (req, res) => {
    try {

        if (req.files['image'] && req.files['image'][0] && req.files['images']) {
            const product = new ProductModel({
                productName: req.body.productName,
                description: req.body.description,
                image: req.files['image'][0].path.replace(/\\/g, '/').replace('public/', ''),
                images: req.files['images'].map(file => file.path.replace(/\\/g, '/').replace('public/', '')),
                brand: req.body.brand,
                countInStock: req.body.countInStock,
                category: req.body.category,
                price: req.body.price,
                discountPrice: req.body.discountPrice,
                afterDiscount: Math.floor(parseInt(req.body.price) - (parseInt(req.body.price) * (parseInt(req.body.discountPrice) / 100)))
            });


            // Process the main image

            // Save the new product to the database
            product.save().then(async (product) => {
                    // Associate the product with its category
                    const category = await CategoryModel.findById(product.category);
                    if (category) {
                        category.products.push(product._id);
                        await category.save();
                    }
                    console.log('Product saved successfully.');
                })
                .catch((error) => {
                    console.error('Error saving product:', error);
                });;

            return res.status(201).redirect('/admin/product-management');
        } else {
            return res.status(400).send({
                error: 'Bad Request',
                errorMessage: 'Image data is missing'
            });
        }
    } catch (error) {
        console.error('Error adding product: ' + error);
        return res.status(500).send({
            error: 'Internal Server Error',
            errorMessage: error.message
        });
    }
};


const productManagementEdit = async (req, res) => {
    try {
        // Check if the product with the specified ID exists in the database
        const productId = req.params.Id;
        const existingProduct = await ProductModel.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({
                error: 'Product not found'
            });
        }

        // Extract product details from the request body
        const {
            productName,
            description,
            brand,
            countInStock,
            category,
            price,
            discountPrice
        } = req.body;


        // Initialize image and images variables
        let image = existingProduct.image;
        let images = existingProduct.images;

        // Check if files are provided in the request
        if (req.files) {
            // Process the main image
            if (req.files['image']) {
                image = req.files['image'][0].path.replace(/\\/g, '/').replace('public/', '')
            }

            // Process additional images (if any)
            if (req.files['images']) {
                images = req.files['images'].map((file) =>
                    file.path.replace(/\\/g, '/').replace('public/', '')
                );
            }
        }

        // Convert price and discountPrice to numbers
        const parsedPrice = parseInt(price);
        const parsedDiscountPrice = parseInt(discountPrice);

        // Update the product in the database
        const updatedProduct = await ProductModel.findByIdAndUpdate(
            productId, {
                productName,
                description,
                brand,
                countInStock,
                category,
                price: parsedPrice,
                discountPrice: parsedDiscountPrice,
                image,
                afterDiscount: Math.floor(parseInt(req.body.price) - (parseInt(req.body.price) * (parseInt(req.body.discountPrice) / 100)))
            }, {
                new: true,
            }

        );

        images.forEach((item,index)=>{
            let isThere = existingProduct.images.find((image)=>{
                if(image!=item) {
                    return false
                } else {
                    return true
                }
            })
            if(!isThere) {
                log('work aaye')
                updatedProduct.images[index] = item
            }
        })
        console.log(updatedProduct.images)
        await updatedProduct.save();

        const updatedCategory = await CategoryModel.findById(updatedProduct.category);
        if (updatedCategory) {
            updatedCategory.products.push(updatedProduct._id);
            await updatedCategory.save();
        }
        if (!updatedProduct) {
            return res.status(404).json({
                message: 'Product not found'
            });
        }


        res.status(200).redirect('/admin/product-management');
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Internal Server Error',
            errorMessage: error.message
        });
    }
};





const productManagementDelete = async (req, res) => {
    const {
        productId
    } = req.params;

    try {
        // Find the product by ID and delete it
        const deletedProduct = await ProductModel.findOneAndDelete({
            _id: productId
        });

        if (!deletedProduct) {
            return res.status(404).json({
                error: 'Product not found'
            });
        }

        res.status(200).json({
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Internal Server Error'
        });
    }
};


const productManagementPublish = async (req, res) => {
    try {
        let {
            id
        } = req.body
        let productDetails = await ProductModel.findById(id)
        if (productDetails.isFeatured) {
            productDetails.isFeatured = false
            await productDetails.save()
            res.status(200).json({
                status: true
            })
        } else if (!productDetails.isFeatured) {
            productDetails.isFeatured = true
            await productDetails.save()
            res.status(201).json({
                status: true
            })
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: 'Internal Server Error'
        });
    }
}



const removeProductImg = async (req, res) => {
    try {
        const index = req.query.index;
        const productId = req.query.updateproductId;
        console.log(index,productId);
        let pro = await ProductModel.findById(productId)
        pro.images.splice(index,1)
        pro.save()

        // const product = await ProductModel.findById({
        //     _id: productId
        // });
        // if (!product) {
        //     return res.status(404).json({
        //         error: "Product not found"
        //     });
        // }

        // if (index >= 0 && index < product.productImages.length) {
        //     product.productImages.splice(index, 1);

        //     await ProductModel.findByIdAndUpdate(productId, {
        //         productImages: product.productImages,
        //     });
        // }
        // // res.redirect(`/admin/update/${productId}`);
        // res.redirect(`/product-management/editProduct/${productId}`);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Server error"
        });
    }
}


let productSearch = async (req, res) => {
    try {
        let search = req.query.search || ''; // Get the search term from the query parameters
        const perPage = 10; // Define how many products you want per page
        const page = parseInt(req.query.page) || 1; // Get the page number from the request query parameters
        let query = {};
        // Check if a category is selected for filtering
        const selectedCategory = req.query.category || ''; // Default to empty string if not provided
        if (selectedCategory) {
            query.category = selectedCategory;
        }

        const totalProducts = await ProductModel.countDocuments(query);

        const products = await ProductModel.find({
            productName: { $regex: new RegExp(search, 'i') },
        })
            .populate('category') // Populate the 'category' field
            .lean();

        const categories = await CategoryModel.find().lean();

        // Calculate the total number of pages
        const totalPages = Math.ceil(totalProducts / perPage);
        
        res.render('products', { products,categories,selectedCategory, pagetitle: 'Products',currentPage: page,perPage,totalPages });
     
    } catch (error) {
        console.log(error.message);
    }
  };




module.exports = {
    productManagementGet,
    productManagementCreate,
    productCategories,
    productManagementEdit,
    productManagementDelete,
    productManagementPublish,
    removeProductImg,
    productSearch
}