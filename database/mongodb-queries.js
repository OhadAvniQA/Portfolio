UpdateMany function: 
db.CustomerDetail.updateMany( 
   { email: { $regex: /@qa\.example\./ } }, 
   [ 
     { 
       $set: { 
         email: { 
           $replaceAll: { 
             input: "$email", 
             find: "@qa.example.", 
             replacement: "@qa.example2." 
           } 
         } 
       } 
     } 
   ] 
 ) 
