var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers')

verifyLogin = function(req, res, next) {
   if(req.session.adminLoggedIn)
   {
      next()
   }
   else
   {
      res.redirect('/admin/login');
   }
};

/* GET admin home listing. */
router.get('/',verifyLogin, function(req, res, next) {
  productHelpers.viewAllProducts().then((categories) => {
    res.render('admin/products', {categories, admin:true});
  })
});

router.get('/login', function(req, res, next) {
   if(req.session.admin)
   {
      res.redirect('/admin');
   }
   else
   {
      res.render('admin/login', {loginErr:req.session.adminLoginErr, admin:true});
      req.session.adminLoginErr = false;
   }
});

router.post('/login', function(req, res, next) {
   productHelpers.doLogin(req.body).then((response) => {
      if(response.status)
      {
         req.session.admin = response.admin;
         req.session.adminLoggedIn = true;
         res.redirect('/admin');
      }
      else
      {
         req.session.adminLoginErr = 'Invalid Email or Password';
         res.redirect('/admin/login');
      }
   })
});

router.get('/logout', function(req, res, next) {
   req.session.admin =null;
   req.session.adminLoggedIn = null;
   res.redirect('/admin');
})

router.get('/add-product', function (req, res, next) {
  res.render('admin/add-product', {admin:true});
});

router.post('/add-product', function(req, res, next) {
  productHelpers.addProduct(req.body, function(id) {
    let image = req.files.image;
    image.mv('./public/product-images/'+id+'.jpg', function(err, done) {
      if(!err)
        res.render('admin/add-product');
      else
        console.log(err);
    });
  });
});

router.get('/delete-product/:id', function(req, res, next) {
  productId = req.params.id
  productHelpers.deleteProduct(productId).then((response) => {
    res.redirect('/admin');
  })
});

router.get('/edit-product/:id', async function(req, res, next) {
  let product = await productHelpers.getProductDetails(req.params.id)
  res.render('admin/edit-product', {product, admin:true});
});

router.post('/edit-product/:id', function(req, res, next) {
  let id = req.params.id;
  productHelpers.updateProduct(req.params.id, req.body).then(() =>{
    res.redirect('/admin')
    if(req.files.image)
    {
      let image = req.files.image;
      image.mv('./public/product-images/'+id+'.jpg');
    }
  })
})

router.get('/orders',verifyLogin, function(req, res, next) {
  productHelpers.viewOrders().then((orders) => {
    res.render('admin/orders', {orders, admin:true});
  })
});

router.get('/users',verifyLogin, function(req, res, next) {
  productHelpers.viewUsers().then((users) => {
    res.render('admin/users', {users, admin:true});
  })
});

router.get('/categories', function(req, res, next) {
   res.render('admin/categories')
});

router.get('/add-category', function(req, res, next) {
   res.render('admin/add-category')
});

router.post('/add-category', function(req, res, next) {
   productHelpers.addCategory(req.body).then((category) => {
      res.redirect('/admin/add-category')
   })
})

module.exports = router;