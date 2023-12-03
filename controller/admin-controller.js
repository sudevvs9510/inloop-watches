const ProductModel = require("../model/productSchema");
const UserModel = require("../model/userSchema");
const AdminModel = require("../model/adminSchema");
const bcrypt = require("bcrypt");
const orderModel = require("../model/orderSchema");
const fs = require('fs');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');



async function salesReport(date) {
  const currentDate = new Date();
  let orders = [];

  for (let i = 0; i < date; i++) {
    const startDate = new Date(currentDate);
    startDate.setDate(currentDate.getDate() - i);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(currentDate);
    endDate.setDate(currentDate.getDate() - i);
    endDate.setHours(23, 59, 59, 999);  

    const dailyOrders = await orderModel.find({
      status: "Delivered",
      orderDate: {
        $gte: startDate,
        $lt: endDate,
      },
    });

    orders = [...orders, ...dailyOrders];
  }

  let users = await UserModel.countDocuments();
  // console.log(orders, "orders function inside");

  let totalRevenue = orders.reduce((total, order) => total + order.billTotal, 0);

  let totalOrderCount = await orderModel.find({
    status: "Delivered",
  });

  let allOrders = await orderModel.find()

  let Revenue = 0;
  totalOrderCount.forEach((order) => {
    Revenue += order.billTotal;
  });

  



  let stock = await ProductModel.find();
  let totalCountInStock = 0;
  stock.forEach((product) => {
    totalCountInStock += product.countInStock;
  });

  let averageSales = orders.length / date; // Fix the average calculation
  let averageRevenue = totalRevenue / date; // Fix the average calculation

  return {
    users,
    totalOrders: orders.length,
    totalRevenue,
    totalOrderCount: totalOrderCount.length,
    allOrders:allOrders.length,
    totalCountInStock,
    averageSales,
    averageRevenue,
    Revenue,
  };
}

let dashboard = async (req, res) => {
  if (req.session.admin) {
    req.session.admn = true;

    let orders = await orderModel.find().sort({ createdAt: -1 }).limit(10).populate('user', 'fullname')

    let daily = await salesReport(1)
    let weekly = await salesReport(7);
    let monthly = await salesReport(30);
    let yearly = await salesReport(365)

    console.log("D:",daily,"W:",weekly,"M:",monthly,"Y:",yearly)
    let allProductsCount = await ProductModel.countDocuments();
    let allOrders = await orderModel.countDocuments();
    let totalRevenue = orders.reduce((total, order) => total + order.billTotal, 0);


    res.render("admin-dashboard",{daily,weekly,monthly,yearly,orders,allProductsCount,allOrders,totalRevenue});
  } else {
    res.redirect("/admin/login");
  }
};




// const downloadPdf = async (req, res) => {
//   try {
//     // Obtain the sales data for the desired period (e.g., daily)
//     let salesData = null; // Change the parameter based on the desired period

//     if (req.query.type === 'daily') {
//       salesData = await salesReport(1);
//     } else if (req.query.type === 'weekly') {
//       salesData = await salesReport(7);
//     } else if (req.query.type === 'monthly') {
//       salesData = await salesReport(30);
//     } else if (req.query.type === 'yearly') {
//       salesData = await salesReport(365);
//     }

//     let doc = new PDFDocument();

//     // Set response headers for the PDF file
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');

//     // Pipe the PDF content to the response
//     doc.pipe(res);

//     // Add content to the PDF
//     doc.fontSize(20).text('Sales Report', { align: 'center' });

//     // Insert sales data into the PDF
//     if (salesData) {
//       doc.fontSize(12).text(`Total Revenue: INR ${salesData.totalRevenue}`);
//       doc.text(`Total Orders: ${salesData.totalOrders}`);
//       doc.text(`Total Delivered Order Count: ${salesData.totalOrderCount}`);
//       doc.text(`Total Count In Stock: ${salesData.totalCountInStock}`);
//       doc.text(`Average Sales: ${salesData.averageSales ? salesData.averageSales.toFixed(2) : 'N/A'}%`);
//       doc.text(`Average Revenue: ${salesData.averageRevenue ? salesData.averageRevenue.toFixed(2) : 'N/A'}%`);
//     } else {
//       doc.text('No sales data available.');
//     }

//     // End the document and send it to the client
//     doc.end();
//   } catch (error) {
//     console.log(error.message);
//     res.status(500).send('Error generating PDF.');
//   }
// };

const downloadPdf = async (req, res) => {
  try {
    // Obtain the sales data for the desired period (e.g., daily)
    let salesData = null; // Change the parameter based on the desired period

    if (req.query.type === 'daily') {
      salesData = await salesReport(1);
    } else if (req.query.type === 'weekly') {
      salesData = await salesReport(7);
    } else if (req.query.type === 'monthly') {
      salesData = await salesReport(30);
    } else if (req.query.type === 'yearly') {
      salesData = await salesReport(365);
    }

    let doc = new PDFDocument();

    // Set response headers for the PDF file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');

    // Pipe the PDF content to the response
    doc.pipe(res);

    // Add content to the PDF
    doc.fontSize(20).text('Inloop Sales Report', { align: 'center' });

    // Insert sales data into the PDF as a table
    if (salesData) {
      const table = {
        headers: ['Titles', 'Results'],
        rows: [
          ['Total Revenue', `INR ${salesData.totalRevenue}`],
          ['Total Orders', `${salesData.totalOrders}`],
          ['Total Delivered Order Count', `${salesData.totalOrderCount}`],
          ['Total Count In Stock', `${salesData.totalCountInStock}`],
          ['Average Sales', `${salesData.averageSales ? salesData.averageSales.toFixed(2) : 'N/A'}%`],
          ['Average Revenue', `${salesData.averageRevenue ? salesData.averageRevenue.toFixed(2) : 'N/A'}%`],
        ],
      };

      const tableTop = 120; // Adjust as needed
      const tableLeft = 50; // Adjust as needed
      const rowHeight = 20; // Adjust as needed
      const colWidth = 200; // Adjust as needed
      const headerHeight = 20; // Adjust as needed

      doc.font('Helvetica-Bold');
      doc.fontSize(12);

      // Draw headers
      table.headers.forEach((header, i) => {
        doc.text(header, tableLeft + i * colWidth, tableTop).rect(tableLeft + i * colWidth, tableTop, colWidth, headerHeight).stroke();
      });

      // Draw rows
      table.rows.forEach((row, i) => {
        row.forEach((cell, j) => {
          doc.text(cell, tableLeft + j * colWidth, tableTop + headerHeight + i * rowHeight).rect(tableLeft + j * colWidth, tableTop + headerHeight + i * rowHeight, colWidth, rowHeight).stroke();
        });
      });
    } else {
      doc.text('No sales data available.');
    }

    // End the document and send it to the client
    doc.end();
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Error generating PDF.');
  }
};


// const generateExcel = async (req, res, next) => {
//   try {
//     const salesDatas = await salesReport(0);
//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet('Sales Report');

//     worksheet.columns = [
//       { header: 'Total Revenue', key: 'totalRevenue', width: 15 },
//       { header: 'Total Orders', key: 'totalOrders', width: 15 },
//       { header: 'Total Count In Stock', key: 'totalCountInStock', width: 15 },
//       { header: 'Average Sales', key: 'averageSales', width: 15 },
//       { header: 'Average Revenue', key: 'averageRevenue', width: 15 },
//       { header: 'Revenue', key: 'Revenue', width: 15 },
//     ];

//     worksheet.addRow({
//       totalRevenue: salesDatas.totalRevenue,
//       totalOrders: salesDatas.totalOrders,
//       totalCountInStock: salesDatas.totalCountInStock,
//       averageSales: salesDatas.averageSales ? salesDatas.averageSales.toFixed(2) : 'N/A',
//       averageRevenue: salesDatas.averageRevenue ? salesDatas.averageRevenue.toFixed(2) : 'N/A',
//       Revenue: salesDatas.Revenue,
//     });

//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');

//     workbook.xlsx.write(res).then(() => res.end());
//   } catch (error) {
//     console.log(error);
//     return res.status(500).send('Error generating Excel file.');
//   }
// };


const generateExcel = async (req, res, next) => {
  try {
    const salesDatas = await salesReport(7);
    
    // Log the sales data for debugging
    console.log('Sales Data:', salesDatas);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.columns = [
      { header: 'Total Revenue', key: 'totalRevenue', width: 15 },
      { header: 'Total Orders', key: 'totalOrders', width: 15 },
      { header: 'Total Count In Stock', key: 'totalCountInStock', width: 15 },
      { header: 'Average Sales', key: 'averageSales', width: 15 },
      { header: 'Average Revenue', key: 'averageRevenue', width: 15 },
      { header: 'Revenue', key: 'Revenue', width: 15 },
    ];

    worksheet.addRow({
      totalRevenue: salesDatas.totalRevenue,
      totalOrders: salesDatas.totalOrders,
      totalCountInStock: salesDatas.totalCountInStock,
      averageSales: salesDatas.averageSales ? salesDatas.averageSales.toFixed(2) : 'N/A',
      averageRevenue: salesDatas.averageRevenue ? salesDatas.averageRevenue.toFixed(2) : 'N/A',
      Revenue: salesDatas.Revenue,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');

    workbook.xlsx.write(res).then(() => res.end());
  } catch (error) {
    console.log(error);
    return res.status(500).send('Error generating Excel file.');
  }
};




//admin login controllers
let adminlogin = async (req, res) => {
  try {
    let adminData = {
      adminEmail: "",
      adminPassword: "",
    };

    if (req.session.adminData) {
      adminData = req.session.adminData;
    }

    if (req.session.admin) {
      console.log("inside session login");
      req.session.admin = true;
      res.redirect("/admin");
    } else {
      const errorMessage = "Incorrect Email or Password";
      res.render("admin-login", {
        err: errorMessage,
        adminData,
      });
    }
  } catch (error) {
    console.error("Error in adminlogin:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

let adminloginpost = async (req, res) => {
  try {
    const { adminEmail, adminPassword } = req.body;

    req.session.adminData = {
      adminEmail,
      adminPassword,
    };

    const adminExist = await AdminModel.findOne({
      adminEmail: adminEmail,
    });

    if (!adminExist) {
      return res.render("admin-login", {
        message: "Invalid Email  or Password",
        adminData: req.session.adminData,
      });
    }

    const isPassWordValid = await bcrypt.compare(
      adminPassword,
      adminExist.adminPassword
    );

    if (isPassWordValid) {
      req.session.admin = true;
      return res.redirect("/admin");
    } else {
      return res.render("admin-login", {
        message: "Invalid password",
        adminData: req.session.adminData,
      });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

let adminlogout = (req, res) => {
  req.session.admin = false;
  console.log("session destroyed");
  res.redirect("/admin/login");
};

//admin user management controllers

let usermanagement = async (req, res) => {
  const perPage = 5; // Define how many users you want per page
  const page = parseInt(req.query.page) || 1; // Get the page number from the request query parameters
  try {
    const totalUsers = await UserModel.countDocuments();
    const userdetails = await UserModel.find()
      .skip(perPage * (page - 1))
      .limit(perPage)
      .exec();

    const totalPages = Math.ceil(totalUsers / perPage);

    res.render("user-management", {
      userdetails,
      currentPage: page,
      totalPages,
      perPage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.message || "Internal Server Error",
    });
  }
};

let products = async (req, res) => {
  const products = await ProductModel.find();

  res.render("products", {
    products,
  });
};

let productpost = async (req, res) => {
  try {
    const { image, productName, price, countInStock, category, description } =
      req.body;
    const newProduct = new ProductModel({
      image,
      productName,
      price,
      countInStock,
      category,
      description,
    });

    await newProduct.save();
    res.redirect("/admin/products");
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

let userblock = async (req, res) => {
  let { id } = req.body;
  let userData = await UserModel.findById(id);
  if (userData) {
    if (userData.isBlocked === true) {
      userData.isBlocked = false;
      userData.save();
      res.status(200).json({
        status: true,
      });
    } else if (userData.isBlocked === false) {
      userData.isBlocked = true;
      userData.save();
      res.status(201).json({
        status: true,
      });
    }
  } else {
    res.status(402).json({
      status: true,
    });
  }
};

let productManagementEdit = async (req, res) => {
  try {
    // Check if the product with the specified ID exists in the database
    const productId = req.params.Id;
    const existingProduct = await ProductModel.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({
        error: " Product not found",
      });
    }

    // Extract product details from the request body
    const { productName, price, countInStock, category, description } =
      req.body;

    // Initialize image and images variables
    let image = existingProduct.image;
    let images = existingProduct.images;

    // Check if files are provided in the request
    if (req.files) {
      // Process the main image
      if (req.files["image"]) {
        image = req.files["image"][0].path
          .replace(/\\/g, "/")
          .replace("public/", "");
      }

      // Process additional images (if any)
      if (req.files["images"]) {
        images = req.files["images"].map((file) =>
          file.path.replace(/\\/g, "/").replace("public/", "")
        );
      }
    }
    const updatedProduct = await ProductModel.findByIdAndUpdate(
      productId,
      {
        productName,
        description,
        countInStock,
        category,
        price,
        image,
        images,
      },
      {
        new: true,
      }
    );
    // const updatedCategory = await Category.findById(updatedProduct.category);
    // if (updatedCategory) {
    //   updatedCategory.products.push(updatedProduct._id);
    //   await updatedCategory.save();
    // }
    if (!updatedProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).redirect("/api/admin/product-management");
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal Server Error",
      errorMessage: error.message,
    });
  }
};

// let usermanagementpost = async (req, res) => {
//   try {
//     const { username, email, phone, password } = req.body;
//     const newUser = new UserModel({
//       username,
//       email,
//       phone,
//       password,
//     });

//     await newUser.save();
//     res.redirect("/admin/usermanagement");
//   } catch (error) {
//     res.status(500).json({
//       error: error,
//     });
//   }
// };

// let categories = (req, res) => {
//   res.render("categories");
// };

//to find change the hashed password
// async function run(){
//  console.log( await bcrypt.hash("sudev123",10))
// }

// run()

module.exports = {
  dashboard,
  adminlogin,
  adminloginpost,
  products,
  productpost,
  productManagementEdit,
  usermanagement,
  // usermanagementpost,
  userblock,
  // categories,
  adminlogout,


  generateExcel,
  downloadPdf

};
