/**
 * API Endpoint Generator Actions
 * 
 * Demonstrates REST API endpoint generation with various frameworks
 */

import { action } from '../../src/actions/index.js'
import type { ActionContext, ActionResult } from '../../src/actions/index.js'
import path from 'path'

@action({
  name: 'create-api-endpoint',
  description: 'Generate REST API endpoints with TypeScript',
  category: 'api',
  tags: ['api', 'rest', 'typescript', 'backend'],
  parameters: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'Resource name (e.g., "user", "product")',
      pattern: '^[a-zA-Z][a-zA-Z0-9]*$'
    },
    {
      name: 'methods',
      type: 'array',
      default: ['GET', 'POST', 'PUT', 'DELETE'],
      description: 'HTTP methods to generate'
    },
    {
      name: 'withAuth',
      type: 'boolean',
      default: true,
      description: 'Include authentication middleware'
    },
    {
      name: 'withValidation',
      type: 'boolean',
      default: true,
      description: 'Include input validation'
    },
    {
      name: 'framework',
      type: 'enum',
      values: ['express', 'fastify', 'koa'],
      default: 'express',
      description: 'Node.js framework'
    },
    {
      name: 'database',
      type: 'enum',
      values: ['mongodb', 'postgresql', 'mysql', 'none'],
      default: 'mongodb',
      description: 'Database type'
    },
    {
      name: 'directory',
      type: 'string',
      default: 'src/routes',
      description: 'Output directory'
    }
  ],
  examples: [
    {
      title: 'User management endpoints',
      description: 'Full CRUD for user management',
      parameters: {
        name: 'user',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        withAuth: true,
        withValidation: true
      }
    },
    {
      title: 'Simple read-only API',
      description: 'Read-only endpoints without auth',
      parameters: {
        name: 'product',
        methods: ['GET'],
        withAuth: false,
        withValidation: false
      }
    }
  ]
})
export async function createApiEndpoint(context: ActionContext): Promise<ActionResult> {
  const { variables, utils, logger } = context
  const { name, methods, withAuth, withValidation, framework, database, directory } = variables
  
  logger.info(`Creating API endpoints for ${name} resource`)
  
  const resourceName = name.toLowerCase()
  const modelName = name.charAt(0).toUpperCase() + name.slice(1)
  
  const filesCreated: string[] = []
  
  try {
    // Ensure output directory exists
    await utils.ensureDir(directory)
    
    // Generate main route file
    const routePath = path.join(directory, `${resourceName}.ts`)
    const routeContent = generateRoute(resourceName, modelName, methods, withAuth, withValidation, framework, database)
    await utils.writeFile(routePath, routeContent)
    filesCreated.push(routePath)
    
    // Generate model file if database is specified
    if (database !== 'none') {
      const modelDir = path.join(directory, '../models')
      await utils.ensureDir(modelDir)
      
      const modelPath = path.join(modelDir, `${modelName}.ts`)
      const modelContent = generateModel(modelName, database)
      await utils.writeFile(modelPath, modelContent)
      filesCreated.push(modelPath)
    }
    
    // Generate validation schemas if requested
    if (withValidation) {
      const validationDir = path.join(directory, '../validation')
      await utils.ensureDir(validationDir)
      
      const validationPath = path.join(validationDir, `${resourceName}.ts`)
      const validationContent = generateValidation(resourceName, modelName, methods)
      await utils.writeFile(validationPath, validationContent)
      filesCreated.push(validationPath)
    }
    
    // Generate test file
    const testDir = path.join(directory, '../__tests__')
    await utils.ensureDir(testDir)
    
    const testPath = path.join(testDir, `${resourceName}.test.ts`)
    const testContent = generateTest(resourceName, modelName, methods, framework)
    await utils.writeFile(testPath, testContent)
    filesCreated.push(testPath)
    
    logger.success(`Created API endpoints for ${name} with ${filesCreated.length} files`)
    
    return {
      success: true,
      message: `Successfully created API endpoints for ${name} resource`,
      filesCreated
    }
    
  } catch (error: any) {
    logger.error(`Failed to create API endpoints: ${error.message}`)
    return {
      success: false,
      message: `Failed to create API endpoints: ${error.message}`
    }
  }
}

function generateRoute(resourceName: string, modelName: string, methods: string[], withAuth: boolean, withValidation: boolean, framework: string, database: string): string {
  const imports = [
    `import { Router, Request, Response, NextFunction } from 'express';`
  ]
  
  if (database !== 'none') {
    imports.push(`import { ${modelName} } from '../models/${modelName}';`)
  }
  
  if (withValidation) {
    imports.push(`import { validate${modelName} } from '../validation/${resourceName}';`)
  }
  
  if (withAuth) {
    imports.push(`import { authenticate } from '../middleware/auth';`)
  }
  
  const routeHandlers = methods.map(method => generateRouteHandler(method, resourceName, modelName, database)).join('\n\n')
  
  return `${imports.join('\n')}

const router = Router();

${routeHandlers}

export default router;
`
}

function generateRouteHandler(method: string, resourceName: string, modelName: string, database: string): string {
  const route = method === 'GET' ? 
    `router.get('/${resourceName}', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ${resourceName}s = await ${modelName}.find();
    res.json(${resourceName}s);
  } catch (error) {
    next(error);
  }
});

router.get('/${resourceName}/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ${resourceName} = await ${modelName}.findById(req.params.id);
    if (!${resourceName}) {
      return res.status(404).json({ error: '${modelName} not found' });
    }
    res.json(${resourceName});
  } catch (error) {
    next(error);
  }
});` : 
    method === 'POST' ? 
    `router.post('/${resourceName}', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ${resourceName} = new ${modelName}(req.body);
    const saved${modelName} = await ${resourceName}.save();
    res.status(201).json(saved${modelName});
  } catch (error) {
    next(error);
  }
});` :
    method === 'PUT' ?
    `router.put('/${resourceName}/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ${resourceName} = await ${modelName}.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!${resourceName}) {
      return res.status(404).json({ error: '${modelName} not found' });
    }
    res.json(${resourceName});
  } catch (error) {
    next(error);
  }
});` :
    `router.delete('/${resourceName}/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ${resourceName} = await ${modelName}.findByIdAndDelete(req.params.id);
    if (!${resourceName}) {
      return res.status(404).json({ error: '${modelName} not found' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});`
  
  return route
}

function generateModel(modelName: string, database: string): string {
  if (database === 'mongodb') {
    return `import mongoose, { Document, Schema } from 'mongoose';

export interface I${modelName} extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const ${modelName}Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

export const ${modelName} = mongoose.model<I${modelName}>('${modelName}', ${modelName}Schema);
`
  } else if (database === 'postgresql') {
    return `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('${modelName.toLowerCase()}s')
export class ${modelName} {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
`
  } else {
    return `// Model for ${modelName}
export interface ${modelName} {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Add your database implementation here
`
  }
}

function generateValidation(resourceName: string, modelName: string, methods: string[]): string {
  return `import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validate${modelName} = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validateId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
`
}

function generateTest(resourceName: string, modelName: string, methods: string[], framework: string): string {
  return `import request from 'supertest';
import express from 'express';
import ${resourceName}Router from '../${resourceName}';

const app = express();
app.use(express.json());
app.use('/api/${resourceName}', ${resourceName}Router);

describe('${modelName} API', () => {
  ${methods.includes('GET') ? `
  describe('GET /${resourceName}', () => {
    it('should return all ${resourceName}s', async () => {
      const response = await request(app)
        .get('/api/${resourceName}')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBeTruthy();
    });
  });

  describe('GET /${resourceName}/:id', () => {
    it('should return a specific ${resourceName}', async () => {
      // Add test implementation
    });
  });
  ` : ''}
  
  ${methods.includes('POST') ? `
  describe('POST /${resourceName}', () => {
    it('should create a new ${resourceName}', async () => {
      const new${modelName} = {
        name: 'Test ${modelName}'
      };
      
      const response = await request(app)
        .post('/api/${resourceName}')
        .send(new${modelName})
        .expect(201);
      
      expect(response.body.name).toBe(new${modelName}.name);
    });
  });
  ` : ''}
  
  ${methods.includes('PUT') ? `
  describe('PUT /${resourceName}/:id', () => {
    it('should update a ${resourceName}', async () => {
      // Add test implementation
    });
  });
  ` : ''}
  
  ${methods.includes('DELETE') ? `
  describe('DELETE /${resourceName}/:id', () => {
    it('should delete a ${resourceName}', async () => {
      // Add test implementation
    });
  });
  ` : ''}
});
`
}