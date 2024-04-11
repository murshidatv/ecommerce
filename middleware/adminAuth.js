const isLogin = async(req,res,next)=>{
    try{

        if(req.session.user_id){
        
        next();
        }
        else{
            res.redirect('/admin');
        }


    }catch(error){
        console.log(error.message);
    }
}
/*const isLogin = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            // Assuming that req.params.userId represents the user ID from the URL
            const requestedUserId = req.params.userId;

            // Check if the logged-in user matches the requested user ID
            if (req.session.user_id === requestedUserId) {
                next(); // User is authorized to access the dashboard
            } else {
                res.status(403).send('Permission denied. You can only access your own dashboard.');
            }
        } else {
            res.redirect('/admin');
        }
    } catch (error) {
        console.log(error.message);
    }
};


*/





const isLogout = async (req,res,next)=>{
    try{

        if(req.session.user_id){
            res.redirect('/admin/home');
        }else{
            next();
        }


    }catch(error){

        console.log(error.message);
    }
}

module.exports = {
    isLogin,
    isLogout
};