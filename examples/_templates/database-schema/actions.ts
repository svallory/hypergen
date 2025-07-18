/**
 * Database Schema Generator Actions
 * 
 * Demonstrates database schema generation for multiple database types
 */

import { action } from '../../src/actions/index.js'
import type { ActionContext, ActionResult } from '../../src/actions/index.js'
import path from 'path'

interface Field {
  name: string
  type: string
  required?: boolean
  unique?: boolean
  default?: any
}

@action({
  name: 'create-database-schema',
  description: 'Generate database schema with migrations',
  category: 'database',
  tags: ['database', 'schema', 'migration'],
  parameters: [
    {
      name: 'tableName',
      type: 'string',
      required: true,
      description: 'Table/Collection name',
      pattern: '^[a-zA-Z][a-zA-Z0-9_]*$'
    },
    {
      name: 'fields',
      type: 'object',
      required: true,
      description: 'Field definitions (JSON object)'
    },
    {
      name: 'database',
      type: 'enum',
      values: ['mongodb', 'postgresql', 'mysql', 'sqlite'],
      default: 'postgresql',
      description: 'Database type'
    },
    {
      name: 'withMigration',
      type: 'boolean',
      default: true,
      description: 'Generate migration files'
    },
    {
      name: 'withModel',
      type: 'boolean',
      default: true,
      description: 'Generate model/schema files'
    },
    {
      name: 'directory',
      type: 'string',
      default: 'src/database',
      description: 'Output directory'
    }
  ],
  examples: [
    {
      title: 'User table schema',
      description: 'Create a user table with common fields',
      parameters: {
        tableName: 'users',
        fields: {
          id: { type: 'uuid', required: true, primary: true },
          email: { type: 'string', required: true, unique: true },
          name: { type: 'string', required: true },
          age: { type: 'number' },
          isActive: { type: 'boolean', default: true },
          createdAt: { type: 'datetime', default: 'now' }
        },
        database: 'postgresql'
      }
    }
  ]
})
export async function createDatabaseSchema(context: ActionContext): Promise<ActionResult> {
  const { variables, utils, logger } = context
  const { tableName, fields, database, withMigration, withModel, directory } = variables
  
  logger.info(`Creating database schema for ${tableName}`)
  
  const filesCreated: string[] = []
  
  try {
    // Ensure output directory exists
    await utils.ensureDir(directory)
    
    // Generate model file
    if (withModel) {
      const modelDir = path.join(directory, 'models')
      await utils.ensureDir(modelDir)
      
      const modelPath = path.join(modelDir, `${tableName}.ts`)
      const modelContent = generateModel(tableName, fields, database)
      await utils.writeFile(modelPath, modelContent)
      filesCreated.push(modelPath)
    }
    
    // Generate migration file
    if (withMigration) {
      const migrationDir = path.join(directory, 'migrations')
      await utils.ensureDir(migrationDir)
      
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0]
      const migrationPath = path.join(migrationDir, `${timestamp}_create_${tableName}.ts`)
      const migrationContent = generateMigration(tableName, fields, database)
      await utils.writeFile(migrationPath, migrationContent)
      filesCreated.push(migrationPath)
    }
    
    // Generate seed file
    const seedDir = path.join(directory, 'seeds')
    await utils.ensureDir(seedDir)
    
    const seedPath = path.join(seedDir, `${tableName}.ts`)
    const seedContent = generateSeed(tableName, fields, database)
    await utils.writeFile(seedPath, seedContent)
    filesCreated.push(seedPath)
    
    logger.success(`Created database schema for ${tableName} with ${filesCreated.length} files`)
    
    return {
      success: true,
      message: `Successfully created database schema for ${tableName}`,
      filesCreated
    }
    
  } catch (error: any) {
    logger.error(`Failed to create database schema: ${error.message}`)
    return {
      success: false,
      message: `Failed to create database schema: ${error.message}`
    }
  }
}

function generateModel(tableName: string, fields: Record<string, any>, database: string): string {
  const modelName = tableName.charAt(0).toUpperCase() + tableName.slice(1, -1) // Remove 's' from end
  
  if (database === 'mongodb') {
    return generateMongooseModel(modelName, tableName, fields)
  } else if (database === 'postgresql' || database === 'mysql') {
    return generateTypeORMModel(modelName, tableName, fields, database)
  } else {
    return generateSQLiteModel(modelName, tableName, fields)
  }
}

function generateMongooseModel(modelName: string, tableName: string, fields: Record<string, any>): string {
  const imports = `import mongoose, { Document, Schema } from 'mongoose';`
  
  const interfaceFields = Object.entries(fields).map(([name, field]: [string, any]) => {
    const type = getMongooseType(field.type)
    const optional = field.required ? '' : '?'
    return `  ${name}${optional}: ${type};`
  }).join('\n')
  
  const schemaFields = Object.entries(fields).map(([name, field]: [string, any]) => {
    const fieldDef = generateMongooseField(field)
    return `  ${name}: ${fieldDef}`
  }).join(',\n')
  
  return `${imports}

export interface I${modelName} extends Document {
${interfaceFields}
}

const ${modelName}Schema = new Schema({
${schemaFields}
}, {
  timestamps: true
});

export const ${modelName} = mongoose.model<I${modelName}>('${modelName}', ${modelName}Schema);
`
}

function generateTypeORMModel(modelName: string, tableName: string, fields: Record<string, any>, database: string): string {
  const imports = `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';`
  
  const columns = Object.entries(fields).map(([name, field]: [string, any]) => {
    return generateTypeORMColumn(name, field, database)
  }).join('\n\n')
  
  return `${imports}

@Entity('${tableName}')
export class ${modelName} {
${columns}

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
`
}

function generateSQLiteModel(modelName: string, tableName: string, fields: Record<string, any>): string {
  return `// SQLite model for ${modelName}
export interface ${modelName} {
${Object.entries(fields).map(([name, field]: [string, any]) => {
  const type = getSQLiteType(field.type)
  const optional = field.required ? '' : '?'
  return `  ${name}${optional}: ${type};`
}).join('\n')}
  createdAt: Date;
  updatedAt: Date;
}

// Add your SQLite implementation here
`
}

function generateMigration(tableName: string, fields: Record<string, any>, database: string): string {
  if (database === 'postgresql' || database === 'mysql') {
    return generateSQLMigration(tableName, fields, database)
  } else {
    return `// Migration for ${tableName}
// Add your migration implementation here
`
  }
}

function generateSQLMigration(tableName: string, fields: Record<string, any>, database: string): string {
  const columns = Object.entries(fields).map(([name, field]: [string, any]) => {
    return generateSQLColumn(name, field, database)
  }).join(',\n    ')
  
  return `import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class Create${tableName.charAt(0).toUpperCase() + tableName.slice(1)}${Date.now()} implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: '${tableName}',
        columns: [
          ${columns},
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()'
          }
        ]
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('${tableName}');
  }
}
`
}

function generateSeed(tableName: string, fields: Record<string, any>, database: string): string {
  const sampleData = generateSampleData(fields)
  
  return `// Seed data for ${tableName}
export const ${tableName}Seed = [
  ${JSON.stringify(sampleData, null, 2)}
];

// Add your seeding implementation here
`
}

function generateSampleData(fields: Record<string, any>): Record<string, any> {
  const sample: Record<string, any> = {}
  
  Object.entries(fields).forEach(([name, field]: [string, any]) => {
    sample[name] = getSampleValue(field.type, field.default)
  })
  
  return sample
}

function getSampleValue(type: string, defaultValue?: any): any {
  if (defaultValue !== undefined) return defaultValue
  
  switch (type) {
    case 'string': return 'Sample String'
    case 'number': return 42
    case 'boolean': return true
    case 'uuid': return '123e4567-e89b-12d3-a456-426614174000'
    case 'datetime': return new Date().toISOString()
    case 'email': return 'sample@example.com'
    default: return null
  }
}

function getMongooseType(type: string): string {
  switch (type) {
    case 'string': return 'string'
    case 'number': return 'number'
    case 'boolean': return 'boolean'
    case 'datetime': return 'Date'
    case 'uuid': return 'string'
    case 'email': return 'string'
    default: return 'any'
  }
}

function generateMongooseField(field: any): string {
  const type = getMongooseType(field.type)
  const options: string[] = []
  
  if (field.required) options.push('required: true')
  if (field.unique) options.push('unique: true')
  if (field.default !== undefined) options.push(`default: ${JSON.stringify(field.default)}`)
  
  if (options.length === 0) {
    return type
  } else {
    return `{ type: ${type}, ${options.join(', ')} }`
  }
}

function generateTypeORMColumn(name: string, field: any, database: string): string {
  const decorators = ['@Column']
  const options: string[] = []
  
  if (field.primary) {
    return `  @PrimaryGeneratedColumn('uuid')\n  ${name}: string;`
  }
  
  const columnType = getColumnType(field.type, database)
  if (columnType) options.push(`type: '${columnType}'`)
  
  if (field.unique) options.push('unique: true')
  if (!field.required) options.push('nullable: true')
  if (field.default !== undefined) options.push(`default: ${JSON.stringify(field.default)}`)
  
  const decorator = options.length > 0 ? `@Column({ ${options.join(', ')} })` : '@Column()'
  const tsType = getTypeScriptType(field.type)
  const optional = field.required ? '' : '?'
  
  return `  ${decorator}\n  ${name}${optional}: ${tsType};`
}

function generateSQLColumn(name: string, field: any, database: string): string {
  const type = getColumnType(field.type, database)
  const options: string[] = []
  
  if (field.primary) {
    return `{
      name: '${name}',
      type: 'uuid',
      isPrimary: true,
      generationStrategy: 'uuid',
      default: 'uuid_generate_v4()'
    }`
  }
  
  if (field.unique) options.push('isUnique: true')
  if (!field.required) options.push('isNullable: true')
  if (field.default !== undefined) options.push(`default: ${JSON.stringify(field.default)}`)
  
  return `{
      name: '${name}',
      type: '${type}'${options.length > 0 ? ',\n      ' + options.join(',\n      ') : ''}
    }`
}

function getColumnType(type: string, database: string): string {
  switch (type) {
    case 'string': return database === 'postgresql' ? 'varchar' : 'varchar(255)'
    case 'number': return 'int'
    case 'boolean': return 'boolean'
    case 'datetime': return 'timestamp'
    case 'uuid': return 'uuid'
    case 'email': return database === 'postgresql' ? 'varchar' : 'varchar(255)'
    default: return 'text'
  }
}

function getTypeScriptType(type: string): string {
  switch (type) {
    case 'string': return 'string'
    case 'number': return 'number'
    case 'boolean': return 'boolean'
    case 'datetime': return 'Date'
    case 'uuid': return 'string'
    case 'email': return 'string'
    default: return 'any'
  }
}

function getSQLiteType(type: string): string {
  switch (type) {
    case 'string': return 'string'
    case 'number': return 'number'
    case 'boolean': return 'boolean'
    case 'datetime': return 'Date'
    case 'uuid': return 'string'
    case 'email': return 'string'
    default: return 'any'
  }
}