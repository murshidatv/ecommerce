
const User = require('../models/userModel')
const isLogin = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            const user = await User.findById({ _id: req.session.user_id })
            if (user.isBlocked == true) {
                req.session.destroy()
                res.redirect('/')

            }

            else {
                next()
            }
        }
        else {
            res.redirect('/')
        }

    } catch (error) {
        console.log(error.message);
    }
}


const isLogout = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            res.redirect('/home');
        }
        next()
    } catch (error) {
        console.log(error.message);
    }
}
module.exports = {
    isLogin,
    isLogout
}