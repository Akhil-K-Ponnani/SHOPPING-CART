var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
var userHelpers = require('../helpers/user-helpers');

verifyLogin = function(req, res, next) {
  if(req.session.loggedIn)
  {
    next();
  }
  else
  {
    res.redirect('/login');
  }
};

/* GET user home page. */
router.get('/', function(req, res, next) {
  productHelpers.viewProducts().then((products) => {
    let user = req.session.user;
    res.render('user/products', {products, user});
  })
});

router.get('/login', function(req, res, next) {
  if(req.session.loggedIn)
  {
    res.redirect('/')
  }
  else
    {
      res.render('user/login',{loginErr:req.session.loginErr});
      req.session.loginErr = false;
    }
});

router.get('/signup', function(req, res, next) {
   res.render('user/signup');
});

router.post('/signup', function(req, res, next) {
   userHelpers.doSignup(req.body).then((response) => {
      console.log(response)
      req.session.loggedIn = true;
      req.session.user = response;
      res.redirect('/')
   });
});

router.post('/login', function(req, res, next) {
   userHelpers.doLogin(req.body).then((response) => {
     if(response.status)
     {
       req.session.loggedIn = true;
       req.session.user = response.user;
       res.redirect('/');
     }
     else
     {
       req.session.loginErr = "Invalid Email or Password";
       res.redirect('/login');
     }
   });
});

router.get('/logout', function(req, res, next) {
   req.session.destroy();
   res.redirect('/');
});

router.get('/cart', verifyLogin, async function(req, res, next) {
   let products = await userHelpers.getCartProducts(req.session.user._id)
   console.log(products)
   res.render('user/cart');
});

router.get('/add-to-cart/:id', verifyLogin, function(req, res, next) {
   userHelpers.addToCart(req.params.id,req.session.user._id).then(() => {
      res.redirect('/')
   })
})

module.exports = router;