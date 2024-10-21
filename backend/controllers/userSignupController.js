const { userCollection } = require('../models/UserLoginModel');

// Function to check if username exists
const checkUsernameExists = async (name) => {
    const userExists = await userCollection.findOne({ name });
    return userExists;
};

// Function to handle admin account creation
const createUserAccount = async(req, res) => {
    const { name, password, question1, answer1, question2, answer2, question3, answer3 } = req.body;

    try {
        const accExist = await checkUsernameExists(name);

        if(accExist){
            res.status(400).json({ error: 'This username is already registered' });
        } else {
            const user =  await userCollection.create({ name, password, question1, answer1, question2, answer2, question3, answer3 });
            res.status(201).json({ user: user._id});
        }
    } catch (error) {
        console.error(error);
        if(error.code === 11000){ // 11000 = error.code for unique
            res.status(400).json({ error: 'This username is already registered' });
        }  else if (error.name === 'ValidationError') {
            // Extract the specific validation error message
            const validationError = Object.values(error.errors)[0].message;
            res.status(400).json({ error: validationError });
        }  else{
            res.status(400).send( { error: error.message });
        }
    }
};

module.exports = {
    checkUsernameExists,
    createUserAccount
};