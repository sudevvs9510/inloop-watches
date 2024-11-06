const nodemailer = require('nodemailer');
const randomstring = require('randomstring');

// Disable SSL/TLS certificate validation (for testing/development only)
// process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'sudevvs1999@gmail.com', // Your Gmail email address
    pass: 'dkrszqhmjlrtxpxa', // Your Gmail application-specific password
  },
  tls: {
    rejectUnauthorized: false
 }
});

function sentOtp(email) {
  const otp = randomstring.generate({
    length: 6,
    charset: 'numeric',
  });

  const mailOptions = {
    from: 'sudevvs1999@gmail.com',
    to: email,
    subject: 'Your OTP Code for verification',
    text: `Your OTP code is: ${otp}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
      console.log('OTP:', otp);
    }
  });
  return otp;
}

module.exports = { sentOtp,transporter };




// const nodemailer = require('nodemailer');
// const randomstring = require('randomstring');

// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//    user: 'sudevvs1999@gmail.com', // Your Gmail email address
//    pass: 'dkrszqhmjlrtxpxa', // Your Gmail application-specific password
//  },
// });

// function sentOtp(email) {

//   const otp = randomstring.generate({
//     length: 6,
//     charset: 'numeric',
//   });


//   const mailOptions = {
//     from: 'sudevvs1999@gmail.com',
//     to: email,
//     subject: 'Your OTP Code for verification',
//     text: `Your OTP code is: ${otp}`,
//   };

//   transporter.sendMail(mailOptions, (error, info) => {
//     if (error) {
//       console.error('Error sending email:', error);
//     } else {
//       console.log('Email sent:', info.response);
//       console.log('OTP:', otp);
//     }
//   });
//   return otp
// }

// module.exports = { sentOtp }






// const resetPasswordGet = async (req, res) => {
//   try {
//     let user = req.session.userId ? true : false;

//     const Token = req.params.tokenId;
//     console.log(Token);
//     if (!Token) {
//       return res.status(404).json({ message: "token not found" });
//     }

//     log(req.session.token);
//     log(Token);
//     log(req.session.token === Token);

//     if (req.session.token) {
//       const User = req.session.token === Token ? true : false;
//       if (!User) {
//         return res.status(404).json({ message: "error handler" });
//       } else {
//         return res.render("user-change-new-password", { user, Token });
//       }
//     } else {
//       returnres.redirect('/profile')
//     }
//     // if (User.resetTokenExpiration && User.resetTokenExpiration > new Date()) {
//     //   // The token is still valid
//     //   // Perform your reset password logic
//     //   // const category = await Category.find({status:'active'});

//     // } else {
//     //   // The token has expired
//     //   // Handle the case where the token has expired
//     //  return res.status(410).json({message:'The token is expired'})
//     // }
//   } catch (error) {
//     console.error(error);
//     res.status(500).render("500error", { message: "Error Occured" + error });
//   }
// };

// const resetPasswordPost = async (req, res) => {
//   try {
//     console.log(req.body);
//     const token = req.body.token;
//     const password = req.body.newPassword;
//     const confirm_password = req.body.confirmnewPassword;
//     if (password !== confirm_password) {
//       return res
//         .status(400)
//         .json({ message: "The confirm password and  password must be same" });
//     }
//     const user = await UserModel.findOne({ resetToken: token });
//     console.log(user);
//     if (!user) {
//       // return res.status(404).render('errorHandler')
//       return res.status(404).json({ message: "error handler" });
//     }
//     user.password = password;
//     user.resetToken = null; // Optionally, clear the reset token
//     user.resetTokenExpiration = null;
//     await user.save();
//     // return res.status(200).json({status:true,message: 'Password reset successful' });
//     return res
//       .status(200)
//       .json({ success: true, message: "Sucesfully Password Changed" });
//   } catch (error) {
//     console.error(error);
//     return res
//       .status(500)
//       .render("500error", { message: "Error saving the new password" });
//   }
// };