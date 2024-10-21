const { itemCollection } = require('../models/ItemCollectionModel');

exports.renderNeedToBuyPage = async (req, res) => {
    try {
        const items = await itemCollection.find();
        const reportData = items.map(item => {
            let id = item._id;
            let unit = item.unit;
            let difference = item.maxQuantity - item.quantity;

            // Adjust unit and difference based on unit value
            if (unit === 'milliliters') {
                unit = 'liters';
                difference = difference / 1000;
            } else if (unit === 'grams') {
                unit = 'kilograms';
                difference = difference / 1000;
            }

            return {
                id: item._id.toString().slice(0, 10),
                product: item.product,
                unit: unit,
                difference: difference
            };
        });

        // Filter items based on difference
        reportData.sort((a, b) => b.difference - a.difference);
        const filteredItems = reportData.filter(item => item.difference > 0);

        res.render('needToBuy', { reportData: filteredItems });
    } catch (error) {
        console.error(error.message);
        res.status(500).send({ message: error.message });
    }
};
