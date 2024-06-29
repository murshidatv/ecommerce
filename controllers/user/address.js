const Address = require('../../models/addressModel');
const User = require('../../models/userModel');

// Load addresses associated with the current user
const loadAddress = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const addresses = await Address.find({ user: userId });

        res.render('address', { addresses, user_id: userId });
    } catch (error) {
        console.log(error.message);
    }
};

// Render the 'addAddress' view
const loadaddAddress = async (req, res) => {
    try {
        res.render('addAddress');
    } catch (error) {
        console.log(error.message);
    }
};

// Add a new address
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
        // Save the new address to the database
        await newAddress.save();
        res.redirect('/address');
    } catch (error) {
        console.log(error.message);
    }
};
// Load the details of a specific address for editing
const loadEditAddress = async (req, res) => {
    try {
        const addressId = req.params.addressId;
        const userAddress = await Address.findById(addressId);
        
        res.render('editAddress', { userAddress });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

// Update an existing address
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
        // Update the address in the database
        const result = await Address.findByIdAndUpdate(addressId, { $set: { address: [updatedAddress] } }, { new: true });
        //Redirect to the 'address' page after updating the address
        res.redirect('/address');
    } catch (error) {
        console.log(error.message);
        // Send Internal Server Error if an error occurs
        res.status(500).send('Internal Server Error');
    }
};
// Delete an address
const deleteAddress = async (req, res) => {
    try {
        await Address.findByIdAndDelete(req.params.addressId);
        // Redirect to the 'address' page after deleting the address
        res.redirect('/address');
    } catch (error) {
        console.log(error.message);
    }
};

// Choose an address from the list

const chooseAddress = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const addresses = await Address.find({ user: userId });
    
        // Render the 'choose-address' view with the list of addresses
        res.render('choose-address', { addresses, user_id: userId });
    } catch (error) {
        console.log(error.message);
    }
};

// Controller function to select an address for checkout
const SelectedAddress = async (req, res) => {
    try {

        // Extract the selected address ID from the request body  
        const selectedAddressId = req.body.selectedAddressId;
        // Extract the user ID from the session
        const userId = req.session.user_id;
        // Find and update the user with the selected address ID
        const user = await User.findByIdAndUpdate(userId, { chosenAddress: selectedAddressId }, { new: true });

        if (!user) {
            return res.status(404).send('User not found');
        }
        // Store the selected address ID in the session
        req.session.selectedAddressId = selectedAddressId;

        // Redirect to the checkout page after selecting the address
        res.redirect('/checkout');
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
};

// Render the 'chooseaddAddress' view

const chooseaddAddress = async (req, res) => {
    try {
        res.render('chooseaddAddress');
    } catch (error) {
        console.log(error.message);
    }
};
// Controller function to add a new address
const addnewAddress = async (req, res) => {
    try {
        // Extract address details from the request body
        const { name, mobile, address, city, pincode, district, state } = req.body;
        // Create a new address document with the extracted details
        const newAddress = new Address({
            user: req.session.user_id, // Assign the current user's ID to the 'user' field
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
        // Save the new address document to the database
        await newAddress.save();
        // Redirect the user to the 'chooseAddress' page after successfully adding the address
        res.redirect('/chooseAddress');
    } catch (error) {
        // Log any error that occurs during the process
        console.log(error.message);
    }
};

// Controller function to load the address for editing

const loadAddressEdit = async (req, res) => {
    try {
        // Extract the address ID from the request parameters
        const addressId = req.params.addressId;
        // Find the address in the database by its ID
        const userAddress = await Address.findById(addressId);
   
        res.render('editchooseAddress', { userAddress });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

const editAddress = async (req, res) => {
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

        res.redirect('/chooseAddress');
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

const deletechooseAddress = async (req, res) => {
    try {
        await Address.findByIdAndDelete(req.params.addressId);
        res.redirect('/chooseaddress');
    } catch (error) {
        console.log(error.message);
    }
}


// Export all functions for use in other modules

module.exports = {
    loadAddress,
    loadaddAddress,
    addAddress,
    loadEditAddress,
    updateAddress,
    deleteAddress,
    chooseAddress,
    chooseaddAddress,
    SelectedAddress,
    addnewAddress,
    loadAddressEdit,
    editAddress,
    deletechooseAddress,
}

