// Middleware untuk validasi data dengan Joi
const Joi = require('joi');
const { AppError } = require('./error.middleware');

// Middleware untuk validasi request
const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);

        if (error) {
            const message = error.details.map(detail => detail.message).join(', ');
            return next(new AppError(message, 400));
        }

        next();
    };
};

// Schema validasi untuk branch
const branchSchema = Joi.object({
    name: Joi.string().required().min(3).max(100),
    address: Joi.string().required().min(5),
    contactNumber: Joi.string().required().pattern(/^[0-9+\-\s]+$/),
    whatsappAdmin: Joi.string().required().pattern(/^[0-9+\-\s]+$/)
});

// Schema validasi untuk product
const productSchema = Joi.object({
    branchId: Joi.string().required(),
    name: Joi.string().required().min(3).max(100),
    description: Joi.string().required(),
    category: Joi.string().required(),
    price: Joi.number().required().min(0),
    weight: Joi.number().required().min(0),
    stock: Joi.number().integer().required().min(0),
    minStock: Joi.number().integer().required().min(0),
    status: Joi.string().valid('available', 'low_stock', 'out_of_stock').default('available')
});

// Schema validasi untuk order
const orderSchema = Joi.object({
    branchId: Joi.string().required(),
    items: Joi.array().items(
        Joi.object({
            productId: Joi.string().required(),
            quantity: Joi.number().integer().required().min(1),
            priceAtOrder: Joi.number().required().min(0)
        })
    ).required().min(1),
    subtotal: Joi.number().required().min(0),
    shippingCost: Joi.number().required().min(0),
    total: Joi.number().required().min(0)
});

// Schema validasi untuk stock request
const stockRequestSchema = Joi.object({
    branchId: Joi.string().required(),
    productId: Joi.string().required(),
    quantity: Joi.number().integer().required().min(1)
});

// Schema validasi untuk user
const userSchema = Joi.object({
    email: Joi.string().email().required(),
    displayName: Joi.string().required().min(3).max(100),
    role: Joi.string().valid('customer', 'admin', 'head', 'owner', 'super').required(),
    branchId: Joi.string().when('role', {
        is: Joi.valid('admin', 'head'),
        then: Joi.required(),
        otherwise: Joi.optional().allow(null, '')
    }),
    status: Joi.string().valid('active', 'inactive').optional(),
    numberTelp: Joi.string().pattern(/^[0-9+\-\s]+$/).optional().allow(null, ''),
    password: Joi.string().min(6).required()
});

// Schema validasi untuk login
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required().min(6)
});

// Schema validasi untuk register
const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required().min(6),
    displayName: Joi.string().required().min(3).max(100)
});

module.exports = {
    validate,
    branchSchema,
    productSchema,
    orderSchema,
    stockRequestSchema,
    userSchema,
    loginSchema,
    registerSchema
}; 