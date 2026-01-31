-- Create a better exec_sql function that returns proper JSON results

DROP FUNCTION IF EXISTS exec_sql(text);

CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- For SELECT queries, return results as JSONB array
  IF lower(trim(sql_query)) LIKE 'select%' THEN
    EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', sql_query) INTO result;
    RETURN COALESCE(result, '[]'::jsonb);
  ELSE
    -- For INSERT/UPDATE/DELETE, execute and return success message
    EXECUTE sql_query;
    RETURN jsonb_build_object('success', true, 'message', 'Query executed successfully');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION exec_sql TO service_role, authenticated, anon;
