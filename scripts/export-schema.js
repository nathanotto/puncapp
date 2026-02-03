/**
 * Export complete database schema to SQL file
 * This script connects to Supabase and exports all tables, indexes, constraints, and policies
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function exportSchema() {
  let sql = `-- Database Schema Snapshot
-- Generated: ${new Date().toISOString()}
-- Database: ${supabaseUrl}

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

`

  try {
    // Get all tables in public schema
    const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT
          table_name,
          obj_description(('"' || table_schema || '"."' || table_name || '"')::regclass) as table_comment
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `
    })

    if (tablesError) throw tablesError

    console.log(`Found ${tables.length} tables`)

    // For each table, get full CREATE TABLE statement
    for (const table of tables) {
      const tableName = table.table_name
      console.log(`Exporting table: ${tableName}`)

      sql += `\n-- Table: ${tableName}\n`
      if (table.table_comment) {
        sql += `-- ${table.table_comment}\n`
      }

      // Get columns
      const { data: columns } = await supabase.rpc('exec_sql', {
        sql_query: `
          SELECT
            column_name,
            data_type,
            character_maximum_length,
            column_default,
            is_nullable,
            udt_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = '${tableName}'
          ORDER BY ordinal_position;
        `
      })

      sql += `CREATE TABLE IF NOT EXISTS public.${tableName} (\n`

      const columnDefs = columns.map(col => {
        let def = `    ${col.column_name} `

        // Handle data type
        if (col.data_type === 'USER-DEFINED') {
          def += col.udt_name
        } else if (col.data_type === 'character varying' && col.character_maximum_length) {
          def += `varchar(${col.character_maximum_length})`
        } else {
          def += col.data_type
        }

        // Handle NOT NULL
        if (col.is_nullable === 'NO') {
          def += ' NOT NULL'
        }

        // Handle DEFAULT
        if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`
        }

        return def
      })

      sql += columnDefs.join(',\n')

      // Get primary key
      const { data: pk } = await supabase.rpc('exec_sql', {
        sql_query: `
          SELECT a.attname as column_name
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = 'public.${tableName}'::regclass
          AND i.indisprimary;
        `
      })

      if (pk && pk.length > 0) {
        const pkColumns = pk.map(p => p.column_name).join(', ')
        sql += `,\n    PRIMARY KEY (${pkColumns})`
      }

      sql += `\n);\n`

      // Get foreign keys
      const { data: fks } = await supabase.rpc('exec_sql', {
        sql_query: `
          SELECT
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.delete_rule
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
          JOIN information_schema.referential_constraints AS rc
            ON rc.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = '${tableName}';
        `
      })

      for (const fk of fks || []) {
        sql += `ALTER TABLE ONLY public.${tableName}\n`
        sql += `    ADD CONSTRAINT ${fk.constraint_name} FOREIGN KEY (${fk.column_name})\n`
        sql += `    REFERENCES public.${fk.foreign_table_name}(${fk.foreign_column_name})`
        if (fk.delete_rule !== 'NO ACTION') {
          sql += ` ON DELETE ${fk.delete_rule}`
        }
        sql += `;\n`
      }

      // Get indexes
      const { data: indexes } = await supabase.rpc('exec_sql', {
        sql_query: `
          SELECT
            i.relname as index_name,
            a.attname as column_name,
            ix.indisunique as is_unique
          FROM pg_class t
          JOIN pg_index ix ON t.oid = ix.indrelid
          JOIN pg_class i ON i.oid = ix.indexrelid
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
          WHERE t.relkind = 'r'
          AND t.relname = '${tableName}'
          AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
          AND i.relname NOT LIKE '%_pkey';
        `
      })

      const indexGroups = {}
      for (const idx of indexes || []) {
        if (!indexGroups[idx.index_name]) {
          indexGroups[idx.index_name] = {
            columns: [],
            unique: idx.is_unique
          }
        }
        indexGroups[idx.index_name].columns.push(idx.column_name)
      }

      for (const [indexName, indexInfo] of Object.entries(indexGroups)) {
        sql += `CREATE ${indexInfo.unique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS ${indexName}\n`
        sql += `    ON public.${tableName} (${indexInfo.columns.join(', ')});\n`
      }

      // Get RLS policies
      const { data: policies } = await supabase.rpc('exec_sql', {
        sql_query: `
          SELECT
            polname as policy_name,
            polcmd as command,
            qual as using_expression,
            with_check as with_check_expression
          FROM pg_policy
          WHERE polrelid = 'public.${tableName}'::regclass;
        `
      })

      if (policies && policies.length > 0) {
        sql += `\n-- Enable RLS\nALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;\n`

        for (const policy of policies) {
          const cmd = policy.command === '*' ? 'ALL' : policy.command
          sql += `\nCREATE POLICY ${policy.policy_name} ON public.${tableName}\n`
          sql += `    FOR ${cmd}\n`
          if (policy.using_expression) {
            sql += `    USING (${policy.using_expression})\n`
          }
          if (policy.with_check_expression) {
            sql += `    WITH CHECK (${policy.with_check_expression})\n`
          }
          sql += `;\n`
        }
      }

      sql += `\n`
    }

    // Get all functions/procedures
    const { data: functions } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT
          routine_name,
          routine_definition
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
        ORDER BY routine_name;
      `
    })

    if (functions && functions.length > 0) {
      sql += `\n-- Functions\n`
      for (const func of functions) {
        if (func.routine_definition) {
          sql += `\n-- Function: ${func.routine_name}\n`
          sql += `${func.routine_definition}\n`
        }
      }
    }

    // Write to file
    const filename = `supabase/schema-snapshot-${new Date().toISOString().split('T')[0]}.sql`
    fs.writeFileSync(filename, sql)

    console.log(`\n✅ Schema exported successfully to: ${filename}`)
    console.log(`   Total size: ${(sql.length / 1024).toFixed(2)} KB`)

  } catch (error) {
    console.error('Error exporting schema:', error)
    process.exit(1)
  }
}

exportSchema()
