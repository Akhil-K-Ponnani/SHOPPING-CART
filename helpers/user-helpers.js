var bcrypt = require('bcryptjs');
var Razorpay = require('razorpay');
var objectId = require('mongodb').ObjectID;
var db = require('../config/connection');
var collections = require('../config/collections');

var instance = new Razorpay({
  key_id: 'rzp_test_o4TqEFcczJ1VzH',
  key_secret: 'uOzWvQVVODrUw6cBw5FnCVg6',
});

module.exports = {
   doSignup:function(userData) {
      return new Promise(async(resolve, reject) => {
         response = {}
         let user = await db.get().collection(collections.USER_COLLECTION).findOne({email:userData.email});
         if(user)
         {
           resolve({status:false})
         }
         else
         {
           userData.password = await bcrypt.hash(userData.password, 10);
           db.get().collection(collections.USER_COLLECTION).insertOne(userData).then((data) => {
             response.user = data.ops[0]
             response.status = true
             resolve(response);
           });
         }
      });
   },
   doLogin:function(userData) {
      return new Promise(async(resolve, reject) => {
        let loginStatus = false;
        response = {}
        let user = await db.get().collection(collections.USER_COLLECTION).findOne({email:userData.email});
        if(user)
        {
          bcrypt.compare(userData.password, user.password).then((status) => {
            if(status)
            {
               response.user = user
               response.status = true
               resolve(response)
            }
            else
            {
              resolve({status:false})
            }
          })
        }
        else
        {
          resolve({status:false})
        }
    }) 
  },
  addToCart:function(productId, userId) {
     let productObj = {item:objectId(productId), quantity:1}
     return new Promise(async(resolve, reject) => {
        let userCart = await db.get().collection(collections.CART_COLLECTION).findOne({user:objectId(userId)});
        if(userCart)
        {
           let productExist = userCart.products.findIndex(product => product.item==productId)
           if(productExist!=-1)
           {
              db.get().collection(collections.CART_COLLECTION).updateOne({user:objectId(userId), 'products.item':objectId(productId)}, 
              {
                 $inc:{'products.$.quantity':1}
              }).then(() => {
                 resolve()
              })
              resolve()
           }
           else
           {
           db.get().collection(collections.CART_COLLECTION).updateOne({user:objectId(userId)},
              {
                 $push:{products:productObj}
              }).then((response) => {
                 resolve(response)
              })
            }
        }
        else
        {
           cartObj = {
             user:objectId(userId),
             products:[productObj]
           }
           db.get().collection(collections.CART_COLLECTION).insertOne(cartObj).then((response) => {
              resolve(response)
           })
        }
     })
  },
  getCartProducts:function(userId) {
     return new Promise(async(resolve, reject) => {
        let cartItems = await db.get().collection(collections.CART_COLLECTION).aggregate([
           {
              $match:{user:objectId(userId)}
           }, 
           {
              $unwind:'$products'
           },
           {
              $project:
              {
                 item:'$products.item',
                 quantity:'$products.quantity'
              }
           },
           {
              $lookup:
              {
                 from:collections.PRODUCT_COLLECTION,
                 localField:'item', 
                 foreignField:'_id',
                 as:'product'
              }
           },
           {
              $project:{item:1, quantity:1, product:{$arrayElemAt:['$product',0]}}
           }
        ]).toArray()
        resolve(cartItems)
     })
  },
  getCartCount:function(userId) {
     return new Promise(async(resolve, reject) => {
        let count = 0
        let cart = await db.get().collection(collections.CART_COLLECTION).findOne({user:objectId(userId)})
        if(cart)
        {
           for(i=0;i<cart.products.length;i++)
           {
              count = count + cart.products[i].quantity
           }
        }
        resolve(count)
     })
  },
  changeProductQuantity:function(details)
  {
     details.count = parseInt(details.count)
     return new Promise((resolve, reject) => {
        if(details.count==-1 && details.quantity==1)
        {
           db.get().collection(collections.CART_COLLECTION).updateOne({_id:objectId(details.cart)}, 
           {
              $pull:{products:{item:objectId(details.product)}}
           }).then((response) => {
              resolve({removeProduct:true})
           })
        }
        else
        {
           db.get().collection(collections.CART_COLLECTION).updateOne({_id:objectId(details.cart), 'products.item':objectId(details.product)},
           {
              $inc:{'products.$.quantity':details.count}
           }).then((response) => {
              resolve({status:true})
           })
        }
     })
  },
  removeCartProduct:function(details) {
     return new Promise((resolve, reject) => {
        db.get().collection(collections.CART_COLLECTION).updateOne({_id:objectId(details.cart)}, 
        {
           $pull:{products:{item:objectId(details.product)}}
        }).then((response) => {
           resolve(response)
        })
     })
  },
  getTotalAmount:function(userId) {
     return new Promise(async(resolve, reject) => {
        let cart = await db.get().collection(collections.CART_COLLECTION).findOne({user:objectId(userId)})
        if(cart.products.length > 0)
        {
           let total = await db.get().collection(collections.CART_COLLECTION).aggregate([
              {
                 $match:{user:objectId(userId)}
              },
              {
                 $unwind:'$products'
              },
              {
                 $project:
                 {
                    item:'$products.item',
                    quantity:'$products.quantity'
                 }
              },
              {
                 $lookup:
                 {
                    from:collections.PRODUCT_COLLECTION,
                    localField:'item',
                    foreignField:'_id',
                    as:'product'
                 }
              },
              {
                 $project:
                 {
                    item:1, quantity:1, product:{$arrayElemAt:['$product', 0]}
                 }
              },
              {
                 $group:
                 {
                    _id:null,
                    total:{$sum:{$multiply:['$quantity', '$product.price']}}
                 }
              }
           ]).toArray()
              resolve(total[0].total)
         } 
         else
         {
            resolve(0)
         }
     })
  },
  getCartProductList:function(userId) {
     return new Promise(async(resolve, reject) => {
        let cart = await db.get().collection(collections.CART_COLLECTION).findOne({user:objectId(userId)})
        resolve(cart.products)
     })
  },
  placeOrder:function(order, products, totalPrice) {
     return new Promise((resolve, reject) => {
        if(products[0].buyNow)
        {
           products[0].item = objectId(products[0].item)
           delete products[0].buyNow
           var buyNow = true
        }
        let status = order['payment-method']==='COD'?'Placed':'Pending'
        if(status === Placed)
           let date = [{status:'Placed', date:new Date()}]
        let orderObj = {
           user:objectId(order.user), 
           deliveryDetails:{
              name:order.name,
              mobile:order.mobile, 
              address:order.address, 
              pincode:order.pincode,
           }, 
           products:products, 
           totalAmount:totalPrice,
           paymentMethod:order['payment-method'],
           date:date
      //     status:status
        }
        db.get().collection(collections.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
           if(!buyNow)
           {
              db.get().collection(collections.CART_COLLECTION).removeOne({user:objectId(order.user)})
           }
           buyNow = null
           resolve(response.ops[0])
        })
     })
  },
  getUserOrders:function(userId) {
     return new Promise(async(resolve, reject) => {
        let orders = await db.get().collection(collections.ORDER_COLLECTION).find({user:objectId(userId)}).sort({_id:-1}).toArray()
        resolve(orders)
     })
  },
  getOrderDetails:function(orderId) {
     return new Promise(async(resolve, reject) => {
        let order = await db.get().collection(collections.ORDER_COLLECTION).findOne({_id:objectId(orderId)})
        resolve(order)
     })
  },
  getOrderProducts:function(orderId) {
     return new Promise(async(resolve, reject) => {
        let orderItems = await db.get().collection(collections.ORDER_COLLECTION).aggregate([
           {
              $match:{_id:objectId(orderId)}
           },
           {
              $unwind:'$products',
           },
           {
              $project:
              {
                 item:'$products.item',
                 quantity:'$products.quantity'
              }
           },
           {
              $lookup:
              {
                 from:collections.PRODUCT_COLLECTION,
                 localField:'item',
                 foreignField:'_id',
                 as:'product'
              }
           },
           {
              $project:
              {
                 item:1, quantity:1, product:{$arrayElemAt:['$product', 0]}
              }
           }
        ]).toArray()
        resolve(orderItems)
     })
  },
  generateRasorpay:function(orderId, total) {
     return new Promise((resolve, reject) => {
        var options = {
        amount: total*100,  // amount in the smallest currency unit
        currency: "INR",
        receipt: orderId.toString()
        };
        instance.orders.create(options, function(err, order) {
        resolve(order)
        });
     })
  },
  verifyPayment:function(details) {
     return new Promise((resolve, reject) => {
        const crypto = require('crypto');
        let hmac = crypto.createHmac('sha256', 'uOzWvQVVODrUw6cBw5FnCVg6');
        hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
        hmac = hmac.digest('hex')
        if(hmac == details['payment[razorpay_signature]'])
        {
           resolve()
        }
        else
        {
           reject()
        }
     })
  },
  changePaymentStatus:function(orderId) {
     return new Promise((resolve, reject) => {
        db.get().collection(collections.ORDER_COLLECTION).updateOne({_id:objectId(orderId)}, 
        {
           $set:
           {
              status:'Placed'
           }
        }).then(() => {
           resolve()
        })
     })
  }
}