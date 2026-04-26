const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'CoWork Space API',
            version: '1.0.0',
            description: 'API for managing coworking space reservations, rooms, and users',
        },
        servers: [
            {
                url: '/api/v1',
                description: 'API v1',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string' },
                        tel: { type: 'string', pattern: '^[0-9]{10}$' },
                        email: { type: 'string', format: 'email' },
                        role: { type: 'string', enum: ['user', 'admin', 'owner'] },
                        dateOfBirth: { type: 'string', format: 'date' },
                        occupation: { type: 'string' },
                        gender: { type: 'string', enum: ['male', 'female', 'non-binary', 'other', 'prefer not to say'] },
                        revenue: { type: 'number', minimum: 0 },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                CoworkingSpace: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string', maxLength: 50 },
                        address: { type: 'string' },
                        tel: { type: 'string' },
                        opentime: { type: 'string', example: '08:00' },
                        closetime: { type: 'string', example: '18:00' },
                        description: { type: 'string' },
                        pics: { type: 'array', items: { type: 'string' } },
                        isVisible: { type: 'boolean' },
                        owner: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Room: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        name: { type: 'string', maxLength: 100 },
                        description: { type: 'string', maxLength: 500 },
                        capacity: { type: 'integer', minimum: 1 },
                        coworkingSpace: { type: 'string' },
                        roomType: { type: 'string', enum: ['meeting', 'private office', 'phone booth'] },
                        facilities: { type: 'array', items: { type: 'string' } },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Reservation: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        apptDate: { type: 'string', format: 'date-time' },
                        apptEnd: { type: 'string', format: 'date-time' },
                        user: { type: 'string' },
                        coworkingSpace: { type: 'string' },
                        room: { type: 'string' },
                        qrCode: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                CoworkingSpaceRequest: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        submitter: { type: 'string' },
                        name: { type: 'string', maxLength: 50 },
                        address: { type: 'string' },
                        tel: { type: 'string', pattern: '^[0-9]{10}$' },
                        opentime: { type: 'string', example: '08:00' },
                        closetime: { type: 'string', example: '18:00' },
                        description: { type: 'string' },
                        pics: { type: 'array', items: { type: 'string' } },
                        proofOfOwnership: { type: 'string' },
                        status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
                        rejectionReason: { type: 'string' },
                        reviewedBy: { type: 'string' },
                        reviewedAt: { type: 'string', format: 'date-time' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                ReportPreferences: {
                    type: 'object',
                    properties: {
                        enabled: { type: 'boolean' },
                        frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
                        hour: { type: 'integer', minimum: 0, maximum: 23 },
                        minute: { type: 'integer', minimum: 0, maximum: 59 },
                        timezone: { type: 'string' },
                        dayOfWeek: { type: 'integer', minimum: 0, maximum: 6 },
                        dayOfMonth: { type: 'integer', minimum: 1, maximum: 31 },
                        lookbackDays: { type: 'integer', minimum: 1, maximum: 365 },
                        lastRunAt: { type: 'string', format: 'date-time', nullable: true },
                        nextRunAt: { type: 'string', format: 'date-time', nullable: true },
                    },
                },
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string' },
                    },
                },
            },
        },
    },
    apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
