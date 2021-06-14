var express = require('express');
var fs = require('fs');
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
    let slno = 1
    categories.forEach(category => {
       category.products.forEach(product => {
          product.slno = slno
          slno++
       })
    })
    slno = null
    res.render('admin/products', {categories, productSearch:true, admin:true});
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
  productHelpers.viewAllCategories().then((categories) => {
    res.render('admin/add-product', {categories, productSearch:true, admin:true});
  })
});

router.post('/add-product', function(req, res, next) {
  productHelpers.addProduct(req.body, function(id) {
    let image = req.files.image;
    image.mv('./public/product-images/'+id+'.jpg', function(err, done) {
      if(!err)
        res.redirect('/admin');
      else
        console.log(err);
    });
  });
});

router.get('/delete-product/:id', function(req, res, next) {
  productId = req.params.id
  productHelpers.deleteProduct(productId).then((response) => {
    fs.unlink('./public/product-images/'+productId+'.jpg', function(err) {
       if(err)
         console.log(err)
       res.redirect('/admin');
    })
  })
});

router.get('/edit-product/:id', async function(req, res, next) {
  let product = await productHelpers.getProductDetails(req.params.id)
  let categories = await productHelpers.viewAllCategories()
  categories.forEach(category => {
     if(category._id.toString() === product.category.toString())
     {
        category['selected'] = true
     }
  })
  res.render('admin/edit-product', {product, categories, productSearch:true, admin:true});
});

router.post('/edit-product/:id', function(req, res, next) {
 console.log(req.body)
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
    let slno = 1
    orders.forEach(order => {
       order.slno = slno
       slno++
    })
    slno = null
    res.render('admin/orders', {orders, orderSearch:true, admin:true});
  })
});

router.get('/users',verifyLogin, function(req, res, next) {
  productHelpers.viewUsers().then((users) => {
    let slno = 1
    users.forEach(user => {
       user.slno = slno
       slno++
    })
    slno = null
    res.render('admin/users', {users, userSearch:true, admin:true});
  })
});

router.get('/categories', function(req, res, next) {
   productHelpers.viewAllCategories().then((categories) => {
      let slno = 1
      categories.forEach(category => {
         category.slno = slno
         slno++
      })
      slno = null
      res.render('admin/categories', {categories, categorySearch:true, admin:true})
   })
});

router.get('/add-category', function(req, res, next) {
   res.render('admin/add-category', {categorySearch:true, admin:true})
});

router.post('/add-category', function(req, res, next) {
   productHelpers.addCategory(req.body).then((id) => {
      let image = req.files.image
      image.mv('./public/category-images/'+id+'.jpg', function(err, done) {
      if(!err)
        res.redirect('/admin/categories');
      else
        console.log(err);
     })
   })
});

router.get('/edit-category/:id', async function(req, res, next) {
   let category = await productHelpers.getCategoryDetails(req.params.id)
   res.render('admin/edit-category', {category, categorySearch:true, admin:true})
});

router.post('/edit-category/:id', function(req, res, next) {
  let id = req.params.id;
  productHelpers.updateCategory(req.params.id, req.body).then(() =>{
    res.redirect('/admin/categories')
    if(req.files.image)
    {
      let image = req.files.image;
      image.mv('./public/category-images/'+id+'.jpg');
    }
  })
});

router.get('/delete-category/:id', function(req, res, next) {
   categoryId = req.params.id
   productHelpers.deleteCategory(categoryId).then((response) => {
      fs.unlink('./public/category-images/'+categoryId+'.jpg', function(err) {
         if(err)
           console.log(err)
      res.redirect('/admin/categories')
      })
   })
});

router.get('/search-product', function(req, res, next) {
   productHelpers.searchProduct(req.query.search).then((products) => {
      let productCount = null
      if(products.length > 0)
         productCount = products.length
      let slno = 1
      products.forEach(product => {
         product.slno = slno
         slno++
      })
      slno = null
      res.render('admin/search-product', {products, productSearch:true, productCount, admin:true})
   })
})

router.get('/search-category', function(req, res, next) {
   productHelpers.searchCategory(req.query.search).then((categories) => {
      let categoryCount = null
      if(categories.length > 0)
         categoryCount = categories.length
      let slno = 1
      categories.forEach(category => {
         category.slno = slno
         slno++
      })
      slno = null
      res.render('admin/search-category', {categories, categorySearch:true, categoryCount, admin:true})
   })
})

router.get('/search-order', function(req, res, next) {
   productHelpers.searchOrder(req.query.search).then((orders) => {
      let orderCount = null
      if(orders.length > 0)
         orderCount = orders.length
      let slno = 1
      orders.forEach(order => {
         order.slno = slno
         slno++
      })
      slno = null
      res.render('admin/search-order', {orders, orderSearch:true, orderCount, admin:true})
   })
})

router.get('/search-user', function(req, res, next) {
   productHelpers.searchUser(req.query.search).then((users) => {
      let userCount = null
      if(users.length > 0)
         userCount = users.length
      let slno = 1
      users.forEach(user => {
         user.slno = slno
         slno++
      })
      slno = null
      res.render('admin/search-user', {users, userSearch:true, userCount, admin:true})
   })
})

module.exports = router;