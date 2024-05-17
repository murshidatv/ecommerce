const Category =require('../../models/categoryModel');
const Product=require('../../models/productModel');
// const upload = require('../../middleware/multer')
//category management
const { upload } = require('../../middleware/multer');

const sharp=require('sharp');
async function updateProductPrices(product) {
    try {
        const productId = product._id;
        const productOffer = product.offer;

        // Retrieve the product by ID
        const updatedProduct = await Product.findById(productId);

        // Check if the product offer is not expired or deleted
        if (productOffer && productOffer.endDate) {
            const currentDate = new Date();
            const offerEndDate = new Date(productOffer.endDate);

            // Check if the product offer is still valid
            if (currentDate <= offerEndDate) {
                // Store the original price if not already stored
                if (!updatedProduct.oldPrice) {
                    updatedProduct.oldPrice = updatedProduct.price;
                }

                // Apply the product offer
                const productDiscount = productOffer.amount / 100;

                // Check if the product offer amount is greater than zero before updating the price
                if (productDiscount > 0) {
                    updatedProduct.price = updatedProduct.oldPrice - (updatedProduct.oldPrice * productDiscount);
                }
            } else {
                // If the product offer is expired, revert to the original price
                updatedProduct.price = updatedProduct.oldPrice;
            }
        } else {
            // If the product offer is deleted or not present, apply the category offer
            const category = await Category.findById(product.category);
            if (category && category.offer && category.offer.endDate) {
                const currentDate = new Date();
                const offerEndDate = new Date(category.offer.endDate);

                // Check if the category offer is still valid
                if (currentDate <= offerEndDate) {
                    // Apply the category offer
                    const categoryDiscount = category.offer.amount / 100;
                    if (categoryDiscount > 0) {
                        updatedProduct.price = updatedProduct.oldPrice - (updatedProduct.oldPrice * categoryDiscount);
                    }
                }
            }
        }

        // Save the updated product
        await updatedProduct.save();
    } catch (error) {
        console.error('Error updating product prices:', error);
    }
}




const category = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('category', { categories });
    } catch (error) {
        console.error('Error fetching categories:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

 const addCategory = async (req, res) => {
    try {
        res.render('add-category');
    } catch (error) {
        console.error('Error rendering add-category page:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

const LoadEdit = async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        const category = await Category.findById(categoryId);
        res.render('edit-category', { category });
    } catch (error) {
        console.error('Error loading edit category page:', error.message);
        res.status(500).send('Internal Server Error');
    }
};
const newCategory = async (req, res) => {
    try {
        const { categoryName, brand, status, offerType, offerAmount, offerEndDate } = req.body;

        const existingCategory = await Category.findOne({ categoryName });

        if (existingCategory) {
            return res.render('add-category', {
                message: 'Category already exists. Please choose a different category name.',
            });
        }

        const newCategory = new Category({
            categoryName,
            brand,
            status,
            offer: {
                type: offerType,
                amount: offerAmount,
                endDate: offerEndDate,
            },
        });

        const savedCategory = await newCategory.save();
        await updateProductPricesForCategory(savedCategory);

        res.redirect('/admin/category');
    } catch (error) {
        console.error('Error adding new category:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

const ediCategory = async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        const { categoryName, brand, status, offerType, offerAmount, offerEndDate } = req.body;

        const existingCategory = await Category.findOne({ categoryName: new RegExp(`^${categoryName}$`, 'i'), _id: { $ne: categoryId } });
        if (existingCategory) {
            return res.render('edit-category', {
                message: 'Category name already exists. Please choose a different category name.',
                category: {
                    _id: categoryId,
                    categoryName,
                    brand,
                    status,
                    offer: { type: offerType, amount: offerAmount, endDate: offerEndDate },
                },
            });
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            {
                categoryName,
                brand,
                status,
                offer: {
                    type: offerType,
                    amount: offerAmount,
                    endDate: offerEndDate,
                },
            },
            { new: true }
        );

        // Update product prices based on the updated category
        await updateProductPricesForCategory(updatedCategory);

        res.redirect('/admin/category');
    } catch (error) {
        console.error('Error updating category:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

// Function to update product prices based on the category offer
async function updateProductPricesForCategory(category) {
    try {
        const categoryId = category._id;
        const categoryOffer = category.offer;

        // Retrieve all products under the given category
        const products = await Product.find({ category: categoryId });

        // Check if the category offer is not expired
        if (categoryOffer && categoryOffer.endDate) {
            const currentDate = new Date();
            const offerEndDate = new Date(categoryOffer.endDate);

            // Check if the category offer is still valid
            if (currentDate <= offerEndDate) {
                // Update prices for each product
                for (const product of products) {
                    // Store the original price if not already stored
                    if (!product.oldPrice) {
                        product.oldPrice = product.price;
                    }
                    console.log('Product Offer:', product.offer);
                    // Check if the product has its own offer
                    const hasProductOffer = product.offer && typeof product.offer.amount === 'number';
                    console.log('Product Offer:', product.offer);
                    console.log('hasProductOffer:', hasProductOffer);

                    // If the product offer is deleted, apply the category offer
                    if (!hasProductOffer || isNaN(product.offer.amount)) {
                        const categoryDiscount = categoryOffer.amount / 100;
                        if (categoryDiscount > 0) {
                            product.price = product.oldPrice - (product.oldPrice * categoryDiscount);
                        }
                    }

                    // Save the updated product
                    await product.save();
                }
            } else {
                console.log('Category offer is expired.');
            }
        } else {
            console.log('Category offer is not present.');
        }
    } catch (error) {
        console.error('Error updating product prices for category:', error);
    }
}










const updateCategoryStatus = async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Toggle the status (block/unblock) for the category
        const newStatus = !category.blocked;
        await Category.findByIdAndUpdate(categoryId, { $set: { blocked: newStatus } });

        // Update the status of associated products
        await Product.updateMany({ category: categoryId }, { $set: { blocked: newStatus } });

        res.redirect('/admin/category');
    } catch (error) {
        console.error('Error updating category status:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
const product = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const searchQuery = req.query.search || '';
        const filterCategory = req.query.category || '';

        let query = {};
        if (searchQuery) {
            query = { productName: { $regex: searchQuery, $options: 'i' } };
        }
        if (filterCategory) {
            query.category = filterCategory;
        }

        const categories = await Category.find();
        const products = await Product.find(query)
                                      .skip((page - 1) * limit)
                                      .limit(limit)
                                      .populate('category');
        
        // Count total products for pagination
        const totalProducts = await Product.countDocuments(query);

        res.render('product', {
            products,
            categories,
            currentPage: page,
            totalPages: Math.ceil(totalProducts / limit),
            searchQuery,
            filterCategory,
            limit // Add limit variable to the rendered template
        });
    } catch (error) {
        console.error('Error fetching products:', error.message);
        res.status(500).send('Internal Server Error');
    }
};


const loadProduct = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('add-product', { categories });
    } catch (error) {
        console.error('Error loading add-product page:', error.message);
        res.status(500).send('Internal Server Error');
    }
};



const addProduct = async (req, res) => {
    try {
        const { productName, category, size, oldPrice, stock, description, offerType, offerAmount, offerEndDate } = req.body;

        let images = [];
        if (req.files && Array.isArray(req.files)) {
            images = await Promise.all(req.files.map(async (file) => {
                const filename = file.filename;

                // Log the filename being processed
                console.log('Processing file:', filename);

                // Check if file exists
                if (!filename) {
                    throw new Error('Input file is missing: ' + filename);
                }

                // Crop the image to 100x100 pixels
                await sharp(`public/images/${filename}`)
                    .resize({ width: 458, height: 458, fit: 'inside', withoutEnlargement: true }) // Resize without enlarging smaller images
                    .jpeg({ quality: 100 }) // Adjust JPEG quality to improve image quality
                    .toFile(`public/images/cropped_${filename}`);

                // Return the new filename
                return `cropped_${filename}`;
               
            }));
        }


        const newProduct = new Product({
            productName,
            category,
            size,
            oldPrice,
            stock,
            description,
            images,
            offer: {
                type: offerType,
                amount: offerAmount,
                endDate: offerEndDate,
            },
        });

        await newProduct.save();
        await updateProductPrices(newProduct);

        console.log('Images:', images);
        res.redirect('/admin/product');
    } catch (error) {
        console.error('Error adding new product:', error.message);
        res.status(500).send('Error adding new product: ' + error.message);
    }
};

const LoadEditProduct = async (req, res) => {
    try {
        const productId = req.params.productId;
        const product = await Product.findById(productId);
        const categories = await Category.find();
        res.render('edit-product', { product, categories });
    } catch (error) {
        console.error('Error loading edit product page:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

const editProduct = async (req, res) => {
    try {
        const productId = req.params.productId;
        const { productName, category, size, oldPrice, stock, description, offerType, offerAmount, offerEndDate } = req.body;

        let images = [];
        if (req.files && Array.isArray(req.files)) {
            images = req.files.map((file) => file.filename);
        }

        // Check if the offer is being deleted
        const offerDeleted = !offerType && !offerAmount && !offerEndDate;

        // Calculate the new price based on the offer
        const newPrice = offerDeleted ? oldPrice : calculateNewPrice(oldPrice, offerAmount);

        const updatedProductFields = {
            productName,
            category,
            size,
            oldPrice,
            stock,
            description,
            // Set offer fields if not deleted, otherwise remove offer
            ...(offerDeleted ? { offer: {} } : {
                offer: {
                    type: offerType,
                    amount: offerAmount,
                    endDate: offerEndDate,
                },
            }),
            price: newPrice, // Set the new price
            ...(images.length > 0 && { images }),
        };

        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { $set: updatedProductFields },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).send('Product not found');
        }

        // Update product prices based on the updated product
        await updateProductPrices(updatedProduct);

        res.redirect('/admin/product');
    } catch (error) {
        console.error('Error updating product:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

function calculateNewPrice(oldPrice, offerAmount) {
    const productDiscount = offerAmount / 100;
    return oldPrice - (oldPrice * productDiscount);
}

const removeImage = async (req, res) => {
    try {
        const { productId, imageName } = req.params;
        // Find the product by ID
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).send('Product not found');
        }
        // Filter out the image to be removed
        product.images = product.images.filter(image => image !== imageName);
        console.log(`${product.images}`);
        // Save the updated product
        await product.save();
        console.log(`${product.images}`);
        // Redirect back to the edit product page or wherever appropriate
        res.redirect('/admin/edit-product/' + productId);
    } catch (error) {
        console.error('Error removing image:', error.message);
        res.status(500).send('Internal Server Error');
    }
};
const addImage = async (req, res) => {
    try {
        const { productId } = req.params;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Handle image upload
        if (req.files && Array.isArray(req.files)) {
            const newImages = await Promise.all(req.files.map(async (file) => {
                const filename = file.filename;

                // Process the image (resize, optimize, etc.)
                await sharp(`public/images/${filename}`)
                    .resize({ width: 458, height: 458, fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 100 })
                    .toFile(`public/images/cropped_${filename}`);

                // Return the new filename
                return `cropped_${filename}`;
            }));

            // Concatenate new images with existing ones
            const updatedImages = [...(product.images || []), ...newImages];

            // Update the product's images field
            product.images = updatedImages;
        }

        // Save the updated product
        await product.save();

        // Redirect back to the edit product page
        res.redirect('/admin/edit-product/' + productId);
    } catch (error) {
        console.error('Error adding images:', error);
        res.status(500).send('Error adding images');
    }
};









const updateProductStatus = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Toggle the status (block/unblock)
        await Product.findByIdAndUpdate(productId, { $set: { blocked: !product.blocked } });

        res.redirect('/admin/product');
    } catch (error) {
        console.error('Error updating product status:', error.message);
        res.status(500).send('Internal Server Error');
    }
};


module.exports = {
    updateProductPrices,
    category,
    addCategory,
    LoadEdit,
    newCategory,
    ediCategory,
    updateCategoryStatus,
    product,
     addProduct,
    loadProduct,
    LoadEditProduct,
    editProduct,
    removeImage,
    addImage,
    updateProductStatus,
 
 
 }