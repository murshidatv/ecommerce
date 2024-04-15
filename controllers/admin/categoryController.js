const Category =require('../../models/categoryModel');
const Product=require('../../models/productModel');
//const upload = require('../../middleware/multer')
//category management
const { upload } = require('../../middleware/multer');

const sharp=require('sharp');






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
            
        });

        const savedCategory = await newCategory.save();
       // await updateProductPricesForCategory(savedCategory);

        res.redirect('/admin/category');
    } catch (error) {
        console.error('Error adding new category:', error.message);
        res.status(500).send('Internal Server Error');
    }
};
const ediCategory = async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        const { categoryName, brand, status} = req.body;

        const existingCategory = await Category.findOne({ categoryName: new RegExp(`^${categoryName}$`, 'i'), _id: { $ne: categoryId } });
        if (existingCategory) {
            return res.render('edit-category', {
                message: 'Category name already exists. Please choose a different category name.',
                category: {
                    _id: categoryId,
                    categoryName,
                    brand,
                    status,
                    
                },
            });
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            {
                categoryName,
                brand,
                status,
               
            },
            { new: true }
          );
// Update product prices based on the updated category
//await updateProductPricesForCategory(updatedCategory);

res.redirect('/admin/category');
} catch (error) {
console.error('Error updating category:', error.message);
res.status(500).send('Internal Server Error');
}
};

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
        const { productName, category, size, Price, stock, description } = req.body;

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
                    .resize({ width: 100, height: 100, fit: 'inside', withoutEnlargement: true }) // Resize without enlarging smaller images
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
            Price,
            stock,
            description,
            images,
            
        });

        await newProduct.save();
        //await updateProductPrices(newProduct);

        console.log('Product saved successfully:', newProduct);
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
        const { productName, category, size, Price, stock, description } = req.body;
        let images = [];
        if (req.files && Array.isArray(req.files)) {
            images = req.files.map((file) => file.filename);
        }

        
        const updatedProductFields = {
            productName,
            category,
            size,
            Price,
            stock,
            description,
           
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
       // await updateProductPrices(updatedProduct);

        res.redirect('/admin/product');
    } catch (error) {
        console.error('Error updating product:', error.message);
        res.status(500).send('Internal Server Error');
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
   updateProductStatus,
   

}