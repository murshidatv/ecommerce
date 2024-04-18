const Address =require('../../models/addressModel');
const User= require('../../models/userModel');


const loadAddress = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const addresses = await Address.find({ user: userId });
       // console.log("Addresses:", addresses);  // Add this line for logging
        res.render('address', { addresses, user_id: userId });
    } catch (error) {
        console.log(error.message);
    }
};


const loadaddAddress= async(req,res)=>{
    try {
        res.render('addAddress');
    } catch (error) {
        console.log(error.message);
    }
};

const addAddress = async (req, res) => {
    try {
        const { name, mobile, address, city, pincode, district, state } = req.body;
        const newAddress = new Address({
            user: req.session.user_id, 
            address: [{
                name,
                mobile,
                address,
                city,
                pincode,
                district,
                state
            }]
        });
        await newAddress.save();
        res.redirect('/address');
    } catch (error) {
        console.log(error.message);
    }
}
const loadEditAddress = async (req, res) => {
    try {
        const addressId = req.params.addressId;
        const userAddress = await Address.findById(addressId);
        console.log(userAddress);
        res.render('editAddress', { userAddress });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};


const updateAddress = async (req, res) => {
    try {
        const addressId = req.params.addressId;
      const { name, mobile, address, city, pincode, district, state } = req.body;
      
      const updatedAddress = {
        name,
        mobile,
        address,
        city,
        pincode,
        district,
        state,
      };
  
      const result = await Address.findByIdAndUpdate(addressId, { $set: { address: [updatedAddress] } }, { new: true });
  
      res.redirect('/address'); 
    } catch (error) {
      console.log(error.message);
      res.status(500).send('Internal Server Error');
    }
  };

  const deleteAddress=async (req,res)=>{
    try {
        await Address.findByIdAndDelete(req.params.addressId);
        res.redirect('/address');
    } catch (error) {
        console.log(error.message);
    }
};



module.exports={
    loadAddress,
    loadaddAddress,
    addAddress,
    loadEditAddress,
    updateAddress,
    deleteAddress
}

  